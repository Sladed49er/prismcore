/**
 * EZLynx AMS adapter.
 *
 * Like HawkSoft, EZLynx has no phone-search API — callers are matched against
 * the local `ams_phone_index`, populated per-applicant by `syncApplicantPhones`
 * (driven by EZLynx ApplicantCreated/Updated webhooks). EZLynx also has no
 * activity-note endpoint, so `createActivityNote` is a no-op — the call record
 * still lives in Prism Core. Ported from the CallIntel middleware.
 */
import { and, eq } from "drizzle-orm";
import { adminDb, amsPhoneIndex } from "@prismcore/db";
import { normalizePhone } from "@/lib/phone";
import type {
  AMSAdapter,
  AMSContact,
  AMSActivityNote,
  AMSCredentials,
} from "./types";

const PRODUCTION_BASE = "https://services.ezlynx.com/EZLynxAPI/api";

let cachedToken: { token: string; expiresAt: number } | null = null;

export class EZLynxAdapter implements AMSAdapter {
  // credentials.endpoint = base URL (defaults to production)
  // credentials.username = EZUser
  // credentials.password = EZPassword (already decrypted)
  // credentials.employeeCode = EZAppSecret
  private credentials: AMSCredentials;
  private tenantId: string;

  constructor(credentials: AMSCredentials, tenantId: string) {
    this.credentials = credentials;
    this.tenantId = tenantId;
  }

  private get baseUrl(): string {
    return this.credentials.endpoint || PRODUCTION_BASE;
  }

  private async getToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token;
    }
    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: "GET",
      headers: {
        EZUser: this.credentials.username,
        EZPassword: this.credentials.password,
        EZAppSecret: this.credentials.employeeCode || "",
        EZToken: "authenticate",
      },
    });
    if (!response.ok) {
      throw new Error(`EZLynx auth failed (${response.status})`);
    }
    const token = response.headers.get("EZToken");
    if (!token) {
      throw new Error("EZLynx auth: no EZToken in response headers");
    }
    cachedToken = { token, expiresAt: Date.now() + 20 * 60 * 1000 };
    return token;
  }

  private async apiRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getToken();
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        EZAppSecret: this.credentials.employeeCode || "",
        EZToken: token,
        AccountUsername: this.credentials.username,
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
          eq(amsPhoneIndex.provider, "ezlynx"),
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

  /**
   * EZLynx has no activity-note API. The call is recorded in Prism Core; this
   * returns a sentinel so the sync queue treats it as handled, not failed.
   */
  async createActivityNote(
    _contactId: string,
    _note: AMSActivityNote,
  ): Promise<string> {
    return "ezlynx-note-not-supported";
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getToken();
      const response = await this.apiRequest("/Enumerables/v1");
      if (response.status === 401) {
        return {
          success: false,
          message: "EZLynx authentication failed. Check your credentials.",
        };
      }
      if (!response.ok) {
        return {
          success: false,
          message: `EZLynx API returned status ${response.status}`,
        };
      }
      return {
        success: true,
        message: "Connected to EZLynx — API access verified",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `EZLynx connection failed: ${message}`,
      };
    }
  }

  /**
   * Fetch one applicant from EZLynx and index its phone numbers. Called for
   * each EZLynx ApplicantCreated/Updated webhook event.
   */
  async syncApplicantPhones(applicantId: string): Promise<boolean> {
    try {
      const response = await this.apiRequest(`/Applicant/v2/${applicantId}`);
      if (!response.ok) return false;
      const applicant = await response.json();
      await this.indexApplicant(applicant);
      return true;
    } catch {
      return false;
    }
  }

  /** Index one applicant's phone numbers into `ams_phone_index`. */
  private async indexApplicant(
    applicant: Record<string, any>,
  ): Promise<void> {
    const phones: string[] = [];
    for (const field of ["HomePhone", "CellPhone", "WorkPhone"]) {
      if (applicant[field]) phones.push(applicant[field]);
      if (applicant.CoApplicant?.[field]) {
        phones.push(applicant.CoApplicant[field]);
      }
    }
    if (phones.length === 0) return;

    const sourceId = String(applicant.Id || "");
    if (!sourceId) return;
    const displayName = [applicant.FirstName, applicant.LastName]
      .filter(Boolean)
      .join(" ");
    const now = new Date();

    for (const phone of phones) {
      const normalized = normalizePhone(phone);
      if (!normalized) continue;
      await adminDb()
        .insert(amsPhoneIndex)
        .values({
          tenantId: this.tenantId,
          provider: "ezlynx",
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
}
