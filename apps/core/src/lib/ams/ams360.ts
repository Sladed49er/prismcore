/**
 * AMS360 (Vertafore) adapter — WSAPI v3 (WCF/SOAP), no OData subscription.
 *
 * Auth flow:
 *   1. Login with AgencyNo + LoginId + Password → a WSAPISession Ticket.
 *   2. Pass that Ticket in the WSAPISession SOAP header for every later call.
 *
 * Endpoint:  https://wsapi.ams360.com/v3/WSAPIService.svc
 * Ported verbatim from the CallIntel middleware so Mitchell Reed's existing
 * AMS360 wiring behaves identically inside Prism Core.
 */
import { normalizePhone } from "@/lib/phone";
import type {
  AMSAdapter,
  AMSContact,
  AMSActivityNote,
  AMSCredentials,
} from "./types";

const WSAPI_ENDPOINT = "https://wsapi.ams360.com/v3/WSAPIService.svc";
const SVC_NS = "http://www.WSAPI.AMS360.com/v3.0";
const DC_NS = "http://www.WSAPI.AMS360.com/v3.0/DataContract";

export class AMS360Adapter implements AMSAdapter {
  private credentials: AMSCredentials;
  private ticket: string | null = null;

  constructor(credentials: AMSCredentials) {
    this.credentials = credentials;
  }

  // ── Authentication ──────────────────────────────────────────────────────

  private async login(): Promise<string> {
    if (this.ticket) return this.ticket;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <Login xmlns="${SVC_NS}">
      <Request xmlns:a="${DC_NS}"
               xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <a:AgencyNo>${this.escapeXml(this.credentials.endpoint)}</a:AgencyNo>
        <a:LoginId>${this.escapeXml(this.credentials.username)}</a:LoginId>
        <a:Password>${this.escapeXml(this.credentials.password)}</a:Password>
        <a:EmployeeCode/>
      </Request>
    </Login>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(WSAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `${SVC_NS}/WSAPIServiceContract/Login`,
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const faultMatch = responseText.match(
        /<(?:[\w]+:)?Message>([^<]+)<\/(?:[\w]+:)?Message>/i,
      );
      throw new Error(
        faultMatch
          ? `AMS360 login failed: ${faultMatch[1]}`
          : `AMS360 login failed (${response.status}): ${responseText.substring(0, 300)}`,
      );
    }

    const ticketMatch = responseText.match(
      /<(?:[\w]+:)?Ticket>([^<]+)<\/(?:[\w]+:)?Ticket>/i,
    );

    if (!ticketMatch) {
      const faultMatch = responseText.match(
        /<(?:[\w]+:)?Message>([^<]+)<\/(?:[\w]+:)?Message>/i,
      );
      if (faultMatch) throw new Error(`AMS360 login failed: ${faultMatch[1]}`);
      throw new Error("AMS360 login failed: no session ticket in response");
    }

    this.ticket = ticketMatch[1]!;
    return this.ticket;
  }

  private async soapCall(action: string, body: string): Promise<string> {
    const ticket = await this.login();

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:v3="${SVC_NS}">
  <s:Header>
    <v3:WSAPISession>
      <v3:Ticket>${this.escapeXml(ticket)}</v3:Ticket>
    </v3:WSAPISession>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;

    const response = await fetch(WSAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `${SVC_NS}/WSAPIServiceContract/${action}`,
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const faultMatch = responseText.match(
        /<(?:[\w]+:)?Message>([^<]+)<\/(?:[\w]+:)?Message>/i,
      );
      throw new Error(
        faultMatch
          ? `AMS360 ${action} failed: ${faultMatch[1]}`
          : `AMS360 ${action} failed (${response.status}): ${responseText.substring(0, 300)}`,
      );
    }

    return responseText;
  }

  // ── Contact lookup ──────────────────────────────────────────────────────

  async lookupByPhone(phoneNumber: string): Promise<AMSContact[]> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return [];

    // AMS360 SearchByPhoneNumber wants the 10-digit number, no country code.
    const digitsOnly = normalized.replace(/\D/g, "");
    const searchPhone = digitsOnly.startsWith("1")
      ? digitsOnly.substring(1)
      : digitsOnly;

    try {
      const responseXml = await this.soapCall(
        "SearchByPhoneNumber",
        `<v3:SearchByPhoneNumber>
      <v3:Request xmlns:a="${DC_NS}">
        <a:PhoneNumber>${this.escapeXml(searchPhone)}</a:PhoneNumber>
      </v3:Request>
    </v3:SearchByPhoneNumber>`,
      );
      return this.parseSearchResults(responseXml);
    } catch (error) {
      console.error("AMS360 phone search failed:", error);
      return [];
    }
  }

  private parseSearchResults(soapResponse: string): AMSContact[] {
    const contacts: AMSContact[] = [];

    const resultRegex =
      /<(?:[\w]+:)?SearchResultInfo>([^]*?)<\/(?:[\w]+:)?SearchResultInfo>/gi;
    let match: RegExpExecArray | null;

    while ((match = resultRegex.exec(soapResponse)) !== null) {
      const resultXml = match[1]!;
      const entityId = this.getXmlValue(resultXml, "EntityId");
      const entityType = this.getXmlValue(resultXml, "EntityType");
      const description = this.getXmlValue(resultXml, "Description");
      const entityStatus =
        this.getXmlValue(resultXml, "EntityStatus") ||
        this.getXmlValue(resultXml, "Status") ||
        this.getXmlValue(resultXml, "CustomerStatus");

      // Only customer results — "Last, First" implies a personal account.
      if (entityId && entityType?.toLowerCase().includes("customer")) {
        const isPersonal = description ? /^[^,]+,\s/.test(description) : false;
        contacts.push({
          sourceId: entityId,
          fullName: description || undefined,
          companyName: isPersonal ? undefined : description || undefined,
          phoneNumbers: [],
          emails: [],
          clientType: isPersonal ? "individual" : "commercial",
          accountStatus: entityStatus || undefined,
        });
      }
    }

    // Whitelist: keep accounts explicitly active, or with no status given.
    const activeContacts = contacts.filter((c) => {
      const status = (c.accountStatus || "").toLowerCase().trim();
      return (
        status === "" ||
        status === "active" ||
        status === "act" ||
        status === "a"
      );
    });

    // If everything filtered out, fall back so the screen pop still fires.
    const result = activeContacts.length > 0 ? activeContacts : contacts;

    // Sort: active first, then personal accounts.
    result.sort((a, b) => {
      const aStatus = (a.accountStatus || "").toLowerCase();
      const bStatus = (b.accountStatus || "").toLowerCase();
      const aActive = aStatus === "active" || aStatus === "";
      const bActive = bStatus === "active" || bStatus === "";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (a.clientType === "individual" && b.clientType !== "individual")
        return -1;
      if (a.clientType !== "individual" && b.clientType === "individual")
        return 1;
      return 0;
    });

    return result;
  }

  // ── Activity notes ──────────────────────────────────────────────────────

  async createActivityNote(
    contactId: string,
    note: AMSActivityNote,
  ): Promise<string> {
    const noteText = `${note.subject}\n\n${note.body}`;
    const d = note.activityDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}T00:00:00`;
    return this.insertNote(contactId, noteText, dateStr);
  }

  private async insertNote(
    contactId: string,
    noteText: string,
    dateStr: string,
  ): Promise<string> {
    const responseXml = await this.soapCall(
      "CustomerNoteInsert",
      `<v3:CustomerNoteInsert>
      <v3:Request xmlns:a="${DC_NS}">
        <a:CustomerNote>
          <a:CustomerId>${this.escapeXml(contactId)}</a:CustomerId>
          <a:NoteText>${this.escapeXml(noteText)}</a:NoteText>
          <a:NoteDate>${dateStr}</a:NoteDate>
          <a:Priority>N</a:Priority>
        </a:CustomerNote>
      </v3:Request>
    </v3:CustomerNoteInsert>`,
    );

    if (responseXml.includes("Fault")) {
      const faultMsg = responseXml.match(
        /<(?:[\w]+:)?Message>([^<]+)<\/(?:[\w]+:)?Message>/i,
      );
      throw new Error(
        faultMsg
          ? `AMS360 CustomerNoteInsert failed: ${faultMsg[1]}`
          : `AMS360 CustomerNoteInsert failed: ${responseXml.substring(0, 300)}`,
      );
    }

    const noteIdMatch = responseXml.match(
      /<(?:[\w]+:)?NoteId>([^<]+)<\/(?:[\w]+:)?NoteId>/i,
    );
    return noteIdMatch?.[1] || "unknown";
  }

  // ── Connection test ─────────────────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.ticket = null;
      await this.login();
      return {
        success: true,
        message: "Successfully connected to AMS360 via WSAPI",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  // ── XML helpers ─────────────────────────────────────────────────────────

  private getXmlValue(xml: string, tag: string): string | undefined {
    const regex = new RegExp(
      `<(?:[\\w]+:)?${tag}>([^<]*)<\\/(?:[\\w]+:)?${tag}>`,
      "i",
    );
    const m = xml.match(regex);
    return m ? this.unescapeXml(m[1]!) : undefined;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private unescapeXml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}
