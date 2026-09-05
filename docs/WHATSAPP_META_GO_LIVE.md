# Meta WhatsApp API go-live checklist

This checklist is for the official Meta WhatsApp Cloud API. It does not change the normal
click-to-chat (`wa.me`) buttons, which continue to require a staff member to press Send.

## 1. Choose the onboarding path

- **New API-only number:** finish Meta's standard phone registration flow.
- **Existing WhatsApp Business app number:** do not use the standard migration flow if staff must
  keep using the mobile app. Use Meta's eligible Coexistence/Embedded Signup flow, which presents
  an explicit option to connect the existing WhatsApp Business app number and pairs it by QR code.

## 2. Configure Vercel secrets

Create these server-side Production environment variables. Never prefix them with `NEXT_PUBLIC_`.

| Key | Value source |
| --- | --- |
| `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A separate long random secret; use exactly the same value in Meta's webhook verification form |
| `WHATSAPP_APP_SECRET` | Meta Developer Dashboard → App Settings → Basic → App Secret |
| `CRON_SECRET` | A separate long random secret for the daily renewal/birthday job |

Redeploy production after changing environment variables.

## 3. Register the webhook

In Meta, set the callback URL to:

`https://www.bodyandsoul.co.in/api/webhooks/whatsapp`

Use `WHATSAPP_WEBHOOK_VERIFY_TOKEN` as the verify token and subscribe to `messages`. The server
validates Meta's `X-Hub-Signature-256` on every POST using `WHATSAPP_APP_SECRET`.

## 4. Configure the Gym software

In **Settings → WhatsApp**, enter the business number, Meta Graph API version, Phone Number ID,
WABA ID, and a production System User access token. Start with Test mode enabled and your own
number as the test recipient.

## 5. Create and approve templates in Meta

Create templates in WhatsApp Manager first, then enter their exact name and language in
**Settings → WhatsApp**. The template variables must exactly match the variables displayed beside
each row in the Gym software.

| Software type | Suggested Meta category | Purpose |
| --- | --- | --- |
| Bill generated | Utility | Invoice/payment notification with receipt link |
| Expiry reminders / expired | Utility | Membership renewal and expiry notices |
| Birthday greeting | Marketing | Daily birthday job; only members with consent and no promotional opt-out |
| Custom notification | Marketing or Utility, as approved | Staff-driven festival, offer, or selected-group campaign |

For festival and offer campaigns, use **Notifications → Send custom message** with a Meta-approved
template. Filter recipients where possible. An unfiltered all-member send requires explicit
confirmation; the server still excludes members without WhatsApp consent and members opted out of
promotional messages.

## 6. Test before enabling live sends

1. Keep Test mode on.
2. Save every template's approved name/language and use **Check status with Meta**.
3. Create a test invoice and test each expiry/birthday/custom notification.
4. Confirm the notification log records `sent`, then delivery/read status after Meta posts to the
   verified webhook.
5. Disable Test mode only after all checks pass.

## 7. Operational rules

- Do not paste access tokens, app secrets, or verify tokens into chat, source control, or client-side code.
- Use only approved templates for business-initiated API messages.
- Keep utility notices separate from promotional campaigns.
- Honor consent and promotional opt-outs; do not override exclusions for bulk campaigns.
- Use the WhatsApp Business app for normal staff conversations when Coexistence is active.
