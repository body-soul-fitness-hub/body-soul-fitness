import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaWebhookSignature } from "./webhook";

describe("verifyMetaWebhookSignature", () => {
  const secret = "meta-app-secret";
  const body = '{"object":"whatsapp_business_account"}';
  const signature = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;

  it("accepts a valid Meta signature", () => {
    expect(verifyMetaWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a modified body, signature, or missing secret", () => {
    expect(verifyMetaWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, "sha256=bad", secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, signature, undefined)).toBe(false);
  });
});
