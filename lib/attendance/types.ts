export type AttendanceSettings = {
  block_expired: boolean;
  block_suspended: boolean;
  block_inactive: boolean;
};

export type AttendanceResult = { ok: boolean; message: string; memberName?: string; action?: "check-in" | "check-out" };
