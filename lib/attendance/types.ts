export type AttendanceSettings = {
  block_expired: boolean;
  block_suspended: boolean;
  block_inactive: boolean;
};

export type AttendanceResult = { ok: boolean; message: string; memberName?: string; action?: "check-in" | "check-out" };

// "qr" needs its own label — a generic capitalize() would render it "Qr" instead of "QR".
const CHECKIN_METHOD_LABELS: Record<string, string> = { qr: "QR", manual: "Manual" };

export function checkinMethodLabel(method: string): string {
  return CHECKIN_METHOD_LABELS[method] ?? method;
}
