/**
 * Applied Epic AMS adapter.
 *
 * Uses the Applied Epic API Suite (REST): the Contacts API for real-time
 * phone lookup, the Workflow Management API for activity notes. OAuth2
 * client-credentials auth. Applied Epic supports real-time phone search, so
 * no local caching is needed. Ported from the CallIntel middleware.
 */
import { normalizePhone } from "@/lib/phone";
import type {
  AMSAdapter,
  AMSContact,
  AMSActivityNote,
  AMSCredentials,
} from "./types";

const CONTACTS_PATH = "/epic/contact/v1";
const WORKFLOW_PATH = "/workflow-management/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

export class AppliedEpicAdapter implements AMSAdapter {
  // credentials.endpoint = base URL (e.g. https://api.myappliedproducts.com)
  // credentials.username = client_id
  // credentials.password = client_secret (already decrypted)
  // credentials.employeeCode = optional owner/employee id
  private credentials: AMSCredentials;

  constructor(credentials: AMSCredentials) {
    this.credentials = credentials;
  }

  /** OAuth2 access token via the client-credentials flow. */
  private async getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return cachedToken.token;
    }
    const tokenUrl = `${this.credentials.endpoint}/v1/auth/connect/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.credentials.username,
        client_secret: this.credentials.password,
        scope: "epic/contacts:read epic/activity:write epic/activity:read",
      }).toString(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Applied Epic auth failed (${response.status}): ${errorText.slice(0, 200)}`,
      );
    }
    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return cachedToken.token;
  }

  private async apiRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getAccessToken();
    return fetch(`${this.credentials.endpoint}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/hal+json",
        "Content-Type": "application/json",
        "Accept-Language": "en-US",
        ...options.headers,
      },
    });
  }

  async lookupByPhone(phoneNumber: string): Promise<AMSContact[]> {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) return [];

    let response = await this.apiRequest(
      `${CONTACTS_PATH}/contacts?phoneNumber=${encodeURIComponent(normalized)}&embed=account&limit=10`,
    );
    if (!response.ok) {
      const digits = normalized.replace(/\D/g, "");
      response = await this.apiRequest(
        `${CONTACTS_PATH}/contacts?phoneNumber_contains=${encodeURIComponent(digits.slice(-10))}&embed=account&limit=10`,
      );
      if (!response.ok) return [];
    }

    const data = await response.json();
    const contacts = data?._embedded?.contacts || [];

    return contacts.map((c: Record<string, any>): AMSContact => {
      const isIndividual = c.individualOrBusiness === "INDIVIDUAL";
      const fullName = isIndividual
        ? [c.firstName, c.lastName].filter(Boolean).join(" ")
        : c.name || "";
      const accountName = c._embedded?.account?.name || "";
      const accountId = c.account || c.id;
      return {
        sourceId: String(accountId),
        firstName: isIndividual ? c.firstName : undefined,
        lastName: isIndividual ? c.lastName : undefined,
        fullName: fullName || accountName,
        companyName: !isIndividual ? c.name : accountName || undefined,
        phoneNumbers: (c.phoneNumbers || []).map(
          (p: Record<string, any>) => ({
            number: p.number || "",
            type: (p.type || "OTHER").toLowerCase(),
            isPrimary: p.type === "MOBILE",
          }),
        ),
        emails: (c.emails || [])
          .map((e: Record<string, any>) => e.emailAddress)
          .filter(Boolean),
        clientType: isIndividual ? "individual" : "commercial",
      };
    });
  }

  async createActivityNote(
    contactId: string,
    note: AMSActivityNote,
  ): Promise<string> {
    const activityCode = await this.findActivityCode("CALL");
    const activityBody: Record<string, any> = {
      description: note.subject,
      associatedItem: { type: "CLIENT", id: contactId },
      status: "CLOSED",
      closed: { successful: true },
      note: { content: note.body },
      startFollowUpOn: note.activityDate.toISOString(),
      endFollowUpOn: note.activityDate.toISOString(),
    };
    if (activityCode) activityBody.code = { id: activityCode.id };
    if (this.credentials.employeeCode) {
      activityBody.owner = {
        type: "EMPLOYEE",
        id: this.credentials.employeeCode,
      };
    }

    const response = await this.apiRequest(`${WORKFLOW_PATH}/activities`, {
      method: "POST",
      body: JSON.stringify(activityBody),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Applied Epic create activity failed (${response.status}): ${errorText.slice(0, 200)}`,
      );
    }
    const result = await response.json();
    return result.id || "created";
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiRequest(
        `${CONTACTS_PATH}/contacts?limit=1`,
      );
      if (response.status === 401) {
        return {
          success: false,
          message:
            "Applied Epic authentication failed. Check your Client ID and Client Secret.",
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          message:
            "Applied Epic access denied. Ensure your API credentials have the contacts:read and activity:write scopes.",
        };
      }
      if (!response.ok) {
        return {
          success: false,
          message: `Applied Epic API returned status ${response.status}`,
        };
      }
      const data = await response.json();
      const total = data?.total || 0;
      return {
        success: true,
        message: `Connected to Applied Epic — ${total} contacts available`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `Applied Epic connection failed: ${message}`,
      };
    }
  }

  /** Find an activity code (e.g. "CALL") to tag the activity with. */
  private async findActivityCode(
    code: string,
  ): Promise<{ id: string; code: string } | null> {
    try {
      const response = await this.apiRequest(
        `${WORKFLOW_PATH}/activities/codes?code=${encodeURIComponent(code)}&limit=1`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      const codes = data?._embedded?.activityCodes || [];
      if (codes.length > 0) {
        return { id: codes[0].id, code: codes[0].code };
      }
    } catch {
      /* non-fatal — activity is created without a code */
    }
    return null;
  }
}
