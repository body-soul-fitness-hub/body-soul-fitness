import { describe, expect, it } from "vitest";
import { WhatsAppService } from "./click-to-chat";

describe("WhatsApp click-to-chat", () => {
  it.each([
    ["9876543210", "919876543210"],
    ["+91 9876543210", "919876543210"],
    ["91-9876543210", "919876543210"],
    ["919876543210", "919876543210"],
    ["987 654-3210", "919876543210"],
  ])("normalizes %s", (input, expected) => expect(WhatsAppService.normalizePhone(input)).toBe(expected));

  it("rejects missing and invalid numbers", () => {
    expect(WhatsAppService.buildWhatsAppUrl(null, "Hello")).toBeNull();
    expect(WhatsAppService.buildWhatsAppUrl("12345", "Hello")).toBeNull();
  });

  it("encodes unicode and multiline content without leaking other data", () => {
    const message = WhatsAppService.buildMessage("general", { memberName: "Asha & Riya", gymName: "Body & Soul" });
    const url = WhatsAppService.buildWhatsAppUrl("9876543210", `${message}\nAmount: ₹1,000`);
    expect(url).toBe(`https://wa.me/919876543210?text=${encodeURIComponent(`${message}\nAmount: ₹1,000`)}`);
  });

  it("creates invoice and renewal messages from provided fields only", () => {
    expect(WhatsAppService.buildMessage("invoice", { memberName: "Asha", gymName: "Gym", invoiceNumber: "INV-1", amount: 1200, paymentDate: "2026-09-02" })).not.toContain("Membership Plan");
    const renewal = WhatsAppService.buildMessage("renewal", { memberName: "Asha", gymName: "Gym", membershipExpiryDate: "2026-10-01", membershipPlan: "Gold", renewalAmount: 1200 });
    expect(renewal).toContain("₹1,200.00");
    expect(renewal).toContain("2026-10-01");
  });
});
