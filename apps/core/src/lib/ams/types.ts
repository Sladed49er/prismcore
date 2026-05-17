/**
 * AMS (agency-management system) adapter contract.
 *
 * Every AMS Prism Core integrates with — AMS360, HawkSoft, Applied Epic,
 * EZLynx — implements this one interface, so the telephony module talks to
 * "an AMS" without caring which. Ported from the CallIntel middleware.
 */

export interface AMSContact {
  sourceId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  companyName?: string;
  phoneNumbers: Array<{ number: string; type: string; isPrimary: boolean }>;
  emails: string[];
  policyNumbers?: string[];
  clientType?: "individual" | "commercial" | "prospect";
  /** Account status as the AMS reports it (Active / Inactive / …). */
  accountStatus?: string;
}

export interface AMSActivityNote {
  contactId: string;
  type: "call" | "sms" | "voicemail" | "note";
  subject: string;
  body: string;
  activityDate: Date;
  agentName?: string;
}

export interface AMSAdapter {
  /** Look up contacts by phone number — drives the screen pop. */
  lookupByPhone(phoneNumber: string): Promise<AMSContact[]>;
  /** Write an activity note onto a contact's record. */
  createActivityNote(contactId: string, note: AMSActivityNote): Promise<string>;
  /** Verify the credentials can reach the AMS. */
  testConnection(): Promise<{ success: boolean; message: string }>;
}

export interface AMSCredentials {
  /** AMS360: the AgencyNo. */
  endpoint: string;
  username: string;
  /** Already decrypted by the caller. */
  password: string;
  employeeCode?: string;
}
