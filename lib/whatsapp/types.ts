export const NOTIFICATION_TYPES = [
  { value: "bill_generated", label: "Bill generated", variables: ["member_name", "invoice_number", "amount", "balance_due", "receipt_link", "gym_name"] },
  { value: "expiry_reminder_7", label: "Expiry reminder — 7 days", variables: ["member_name", "plan_name", "end_date", "gym_name"] },
  { value: "expiry_reminder_3", label: "Expiry reminder — 3 days", variables: ["member_name", "plan_name", "end_date", "gym_name"] },
  { value: "expiry_reminder_1", label: "Expiry reminder — 1 day", variables: ["member_name", "plan_name", "end_date", "gym_name"] },
  { value: "expired", label: "Subscription expired", variables: ["member_name", "plan_name", "end_date", "gym_name"] },
  { value: "custom", label: "Custom notification", variables: ["message"] },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["value"];

export const ESSENTIAL_NOTIFICATION_TYPES: readonly NotificationType[] = ["bill_generated", "expiry_reminder_7", "expiry_reminder_3", "expiry_reminder_1", "expired"];

export const DELIVERY_STATUSES = [
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]["value"];

export const TRIGGER_SOURCES = [
  { value: "staff", label: "Staff" },
  { value: "automation", label: "Automation" },
] as const;

export type TriggerSource = (typeof TRIGGER_SOURCES)[number]["value"];

export const TEMPLATE_APPROVAL_STATUSES = [
  { value: "unknown", label: "Unknown" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export type TemplateApprovalStatus = (typeof TEMPLATE_APPROVAL_STATUSES)[number]["value"];

export type WhatsAppSettings = {
  id: number;
  business_phone_number: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  graph_api_version: string;
  access_token_ciphertext: string | null;
  access_token_last4: string | null;
  access_token_updated_at: string | null;
  test_mode: boolean;
  test_recipient_number: string | null;
  bill_generated_enabled: boolean;
  expiry_reminders_enabled: boolean;
  expired_notice_enabled: boolean;
  custom_notifications_enabled: boolean;
  updated_at: string;
};

export const WHATSAPP_SETTINGS_ID = 1;

export const DEFAULT_WHATSAPP_SETTINGS: Omit<WhatsAppSettings, "id" | "updated_at"> = {
  business_phone_number: null,
  phone_number_id: null,
  business_account_id: null,
  graph_api_version: "v21.0",
  access_token_ciphertext: null,
  access_token_last4: null,
  access_token_updated_at: null,
  test_mode: true,
  test_recipient_number: null,
  bill_generated_enabled: true,
  expiry_reminders_enabled: true,
  expired_notice_enabled: true,
  custom_notifications_enabled: true,
};

export type WhatsAppTemplate = {
  id: string;
  key: NotificationType;
  label: string;
  meta_template_name: string | null;
  meta_template_language: string;
  variables: string[];
  body_preview: string;
  meta_approval_status: TemplateApprovalStatus;
  meta_approval_checked_at: string | null;
  enabled: boolean;
  updated_at: string;
};

export type MemberNotificationLog = {
  id: string;
  member_id: string;
  channel: string;
  message: string;
  status: DeliveryStatus;
  sent_at: string;
  created_by: string | null;
  created_at: string;
  notification_type: NotificationType | null;
  template_key: string | null;
  recipient_number: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  trigger_source: TriggerSource | null;
  subscription_id: string | null;
  invoice_id: string | null;
  updated_at: string;
};

export function isAutomationEnabled(settings: WhatsAppSettings, type: NotificationType): boolean {
  switch (type) {
    case "bill_generated":
      return settings.bill_generated_enabled;
    case "expiry_reminder_7":
    case "expiry_reminder_3":
    case "expiry_reminder_1":
      return settings.expiry_reminders_enabled;
    case "expired":
      return settings.expired_notice_enabled;
    case "custom":
      return settings.custom_notifications_enabled;
  }
}
