/**
 * Dialpad webhook normalization.
 *
 * Maps Dialpad API v2 call-event payloads onto Prism Core's `calls` shape.
 * Payload reference: https://developers.dialpad.com/docs/call-events
 * Ported from the CallIntel middleware so Mitchell Reed's Dialpad events
 * behave identically here.
 */

export interface DialpadContact {
  phone?: string;
  type?: string;
  id?: string | number;
  name?: string;
  email?: string;
}

export interface DialpadTarget {
  phone?: string;
  type?: string;
  id?: number;
  name?: string;
  email?: string;
  office_id?: number;
}

export interface DialpadRecordingDetail {
  id?: string;
  url?: string;
  duration?: number;
  start_time?: number;
  recording_type?: string;
}

export interface DialpadCallEvent {
  call_id: number;
  master_call_id?: number;
  entry_point_call_id?: number;
  state: string;
  direction: "inbound" | "outbound";
  external_number?: string;
  internal_number?: string;
  date_started?: number;
  date_rang?: number;
  date_connected?: number;
  date_ended?: number;
  duration?: number;
  total_duration?: number;
  was_recorded?: boolean;
  is_transferred?: boolean;
  contact?: DialpadContact;
  target?: DialpadTarget;
  recording_details?: DialpadRecordingDetail[];
  transcription_text?: string;
  company_call_review_share_link?: string;
  public_call_review_share_link?: string;
}

export type CallStatus =
  | "ringing"
  | "in_progress"
  | "completed"
  | "missed"
  | "voicemail";

/** Map a Dialpad call state to a Prism Core call status. */
export function mapDialpadCallStatus(state: string): CallStatus {
  switch (state) {
    case "calling":
    case "ringing":
      return "ringing";
    case "connected":
      return "in_progress";
    case "hangup":
      return "completed";
    case "missed":
      return "missed";
    case "voicemail":
    case "voicemail_uploaded":
      return "voicemail";
    default:
      return "ringing";
  }
}

export function mapDialpadDirection(
  direction: "inbound" | "outbound",
): "inbound" | "outbound" {
  return direction === "inbound" ? "inbound" : "outbound";
}

/** The customer's (external) number on a call event. */
export function getExternalNumber(event: DialpadCallEvent): string {
  return event.external_number || event.contact?.phone || "";
}

/** The agency's own (internal) number on a call event. */
export function getInternalNumber(event: DialpadCallEvent): string {
  return event.internal_number || event.target?.phone || "";
}
