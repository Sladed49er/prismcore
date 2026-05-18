/**
 * HawkSoft Partner API adapter.
 *
 * HawkSoft has no phone-search API, so callers are matched against a local
 * phone index (`ams_phone_index`) that `syncPhoneIndex` keeps current — only
 * normalized phone numbers, client ids, and display names are cached, never
 * full client data. Ported from the CallIntel middleware.
 */
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { adminDb, amsPhoneIndex } from "@prismcore/db";
import { normalizePhone } from "@/lib/phone";
import type {
  AMSAdapter,
  AMSContact,
  AMSActivityNote,
  AMSCredentials,
} from "./types";

const API_BASE = "https://integration.hawksoft.app/vendor";
const API_VERSION = "3.0";
const PHONE_CONTACT_TYPES = [
  "WorkPhone",
  "CellPhone",
  "HomePhone",
  "OtherPhone",
  "MessagePhone",
];

interface HawkSoftContact {
  Id: string;
  Type: string;
  Data: string;
  Priority: number;
}
interface HawkSoftPerson {
  FirstName?: string;
  LastName?: string;
}
interface HawkSoftClient {
  ClientNumber: number;
  Contacts: HawkSoftContact[];
  People: HawkSoftPerson[];
  Details: { CompanyName?: string; IsCommercial?: boolean };
}

export class HawkSoftAdapter implements AMSAdapter {
  private credentials: AMSCredentials;
  private tenantId: string;

  constructor(credentials: AMSCredentials, tenantId: string) {
    this.credentials = credentials;
    this.tenantId = tenantId;
  }

  private get authHeader(): string {
    const raw = `${this.credentials.username}:${this.credentials.password}`;
    return `Basic ${Buffer.from(raw).toString("base64")}`;
  }

  private async apiRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const sep = path.includes("?") ? "&" : "?";
    return fetch(`${API_BASE}${path}${sep}version=${API_VERSION}`, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  /** Match a caller against the local phone index. */
  async lookupByPhone(phoneNumber: string): Promise<AMSContact[]> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return [];
    const matches = await adminDb()
      .select()
      .from(amsPhoneIndex)
      .where(
        and(
          eq(amsPhoneIndex.tenantId, this.tenantId),
          eq(amsPhoneIndex.provider, "hawksoft"),
          eq(amsPhoneIndex.phoneNumber, normalized),
        ),
      )
      .limit(10);
    return matches.map((m) => ({
      sourceId: m.sourceId,
      fullName: m.displayName || undefined,
      phoneNumbers: [{ number: normalized, type: "phone", isPrimary: true }],
      emails: [],
    }));
  }

  /** Write a log note onto a HawkSoft client record. */
  async createActivityNote(
    contactId: string,
    note: AMSActivityNote,
  ): Promise<string> {
    const agencyId = this.credentials.endpoint; // agencyId stored in endpoint
    let channel = 5; // Phone From Insured (inbound)
    if (note.type === "call") {
      channel = note.subject.toLowerCase().includes("outbound") ? 1 : 5;
    } else if (note.type === "sms") {
      channel = 45; // Text From Insured
    }
    const refId = randomUUID();
    const response = await this.apiRequest(
      `/agency/${agencyId}/client/${contactId}/log`,
      {
        method: "POST",
        body: JSON.stringify({
          refId,
          ts: note.activityDate.toISOString(),
          channel,
          note: note.body,
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HawkSoft log note failed (${response.status}): ${errorText.slice(0, 200)}`,
      );
    }
    return refId;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiRequest("/agencies");
      if (response.status === 401) {
        return {
          success: false,
          message:
            "HawkSoft authentication failed. Check your API credentials.",
        };
      }
      if (!response.ok) {
        return {
          success: false,
          message: `HawkSoft API returned status ${response.status}`,
        };
      }
      const agencies: number[] = await response.json();
      if (agencies.length === 0) {
        return {
          success: false,
          message:
            "No agencies subscribed. Enable the integration in the HawkSoft Marketplace.",
        };
      }
      return {
        success: true,
        message: `Connected to HawkSoft — Agency ${agencies[0]}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `HawkSoft connection failed: ${message}`,
      };
    }
  }

  /**
   * Sync clients from HawkSoft into the local phone index.
   * Returns the number of clients indexed and any errors.
   */
  async syncPhoneIndex(): Promise<{ synced: number; errors: number }> {
    const agencyId = this.credentials.endpoint;
    let synced = 0;
    let errors = 0;

    const idsResponse = await this.apiRequest(`/agency/${agencyId}/clients`);
    if (!idsResponse.ok) {
      throw new Error(
        `Failed to fetch HawkSoft client ids: ${idsResponse.status}`,
      );
    }
    const clientIds: number[] = await idsResponse.json();
    if (clientIds.length === 0) return { synced: 0, errors: 0 };

    const batchSize = 50;
    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);
      try {
        const clientsResponse = await this.apiRequest(
          `/agency/${agencyId}/clients?include=details,contacts,people`,
          { method: "POST", body: JSON.stringify({ clientNumbers: batch }) },
        );
        if (!clientsResponse.ok) {
          errors += batch.length;
          continue;
        }
        const clients: HawkSoftClient[] = await clientsResponse.json();
        for (const client of clients) {
          try {
            await this.indexClient(client);
            synced++;
          } catch {
            errors++;
          }
        }
      } catch {
        errors += batch.length;
      }
    }
    return { synced, errors };
  }

  /** Index one client's phone numbers into `ams_phone_index`. */
  private async indexClient(client: HawkSoftClient): Promise<void> {
    const phones = (client.Contacts || []).filter(
      (c) => PHONE_CONTACT_TYPES.includes(c.Type) && c.Data,
    );
    if (phones.length === 0) return;

    const displayName = this.displayName(client);
    const sourceId = String(client.ClientNumber);
    const now = new Date();

    for (const contact of phones) {
      const normalized = normalizePhone(contact.Data);
      if (!normalized) continue;
      await adminDb()
        .insert(amsPhoneIndex)
        .values({
          tenantId: this.tenantId,
          provider: "hawksoft",
          phoneNumber: normalized,
          sourceId,
          displayName,
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            amsPhoneIndex.tenantId,
            amsPhoneIndex.provider,
            amsPhoneIndex.phoneNumber,
            amsPhoneIndex.sourceId,
          ],
          set: { displayName, syncedAt: now },
        });
    }
  }

  private displayName(client: HawkSoftClient): string {
    if (client.Details?.IsCommercial && client.Details?.CompanyName) {
      return client.Details.CompanyName;
    }
    const person = client.People?.[0];
    if (person) {
      return [person.FirstName, person.LastName].filter(Boolean).join(" ");
    }
    return "";
  }
}
