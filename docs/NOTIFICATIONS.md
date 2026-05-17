# Notifications: SMS, WhatsApp, email, and mobile push

## What is implemented

| Channel | Use case | Configuration |
|--------|-----------|----------------|
| **Email** | Purchase confirmation, payment reminders | `SMTP_*`, `FROM_EMAIL` |
| **SMS** | Same (Twilio Programmable SMS) | `TWILIO_*`, `TWILIO_FROM_NUMBER` |
| **WhatsApp** | Same messages via Twilio WhatsApp API | `TWILIO_WHATSAPP_FROM=whatsapp:+...` (same SID/token as SMS) |
| **Push (FCM)** | Mobile app / PWA — purchase + payment reminders | Firebase service account JSON + optional device registration |
| **Email / SMS / WhatsApp / push** | **Custom orders & repairs** — on create and on every status change; optional manual “due” nudges | Same as above + `NOTIFY_ORDER_*` and `NOTIFY_ORDER_DUE_REMINDER_*` (see `docs/ORDER_WORKFLOW.md`) |

## WhatsApp (Twilio)

1. In [Twilio Console](https://console.twilio.com/), enable **WhatsApp** (sandbox for testing, or approved business sender for production).
2. Set in `.env`:
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (same as SMS)
   - `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (example sandbox sender; use your approved `whatsapp:+...` number in production)
3. Optional toggles (default **on**):
   - `NOTIFY_WHATSAPP_ON_PURCHASE=1`
   - `NOTIFY_WHATSAPP_ON_REMINDER=1`

Messages use the customer’s primary phone; numbers are normalized to E.164 (default `+91` for India if no country code).

## Mobile push (Firebase Cloud Messaging)

1. Create a Firebase project → Project settings → Service accounts → Generate new private key → save JSON.
2. Set `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_CREDENTIALS_PATH` to that file’s absolute path.
3. Install backend deps: `pip install -r requirements.txt` (includes `firebase-admin`).
4. **Customer devices:** `POST /api/customer-portal/push-token` with customer JWT body `{ "token": "<FCM token>", "platform": "web"|"android"|"ios" }`.
5. **Staff devices:** `POST /api/notifications/push-token` with staff JWT.
6. Unregister: `DELETE /api/customer-portal/push-token?token=...` or `DELETE /api/notifications/push-token?token=...`.

The **customer app / PWA** must obtain an FCM registration token using the Firebase SDK (web: `getToken()` with VAPID key; Android/iOS: standard FCM setup). This repo does not bundle the Firebase JS SDK in the customer portal UI yet; integrate your client and call the register endpoint after login.

Optional toggles (default **on**):

- `NOTIFY_PUSH_ON_PURCHASE=1`
- `NOTIFY_PUSH_ON_REMINDER=1`
- `FCM_PUSH_DISABLED=1` — disable all FCM sends without removing credentials

Push payload for orders uses `data.type = order_status` and `order_id` for deep linking in your app.

## API helpers

- `GET /api/notifications/channels` — returns booleans: `emailConfigured`, `smsConfigured`, `whatsappConfigured`, `pushConfigured` (no auth; safe for UI hints).

## Reminders response

`POST /api/reminders/send` returns `channels`: `{ email, sms, whatsapp, push }` counts for successful sends.
