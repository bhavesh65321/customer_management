# Orders & repairs workflow

## Status flow (same for **new order** and **repair**)

1. **Pending** — Booked when staff creates the order. Customer gets a “registered” notification.
2. **In progress** — Workshop / karigar is working on it.
3. **Ready** — Ready for pickup or delivery; customer is notified.
4. **Delivered** — Handed over; `delivered_at` is set. Moving back to another status clears `delivered_at`.

Staff updates status on **Orders & repairs → Open** on an order. Each **status change** triggers customer notifications (if channels are configured).

## Customer notifications

Implemented in `services/order_notifications.py`:

- **On create:** email / SMS / WhatsApp / push (same toggles as purchase notifications, separate env keys `NOTIFY_ORDER_*`).
- **On status change:** same channels with a short, plain-language status line.

Requires the same infrastructure as purchase notifications: SMTP, Twilio SMS, optional Twilio WhatsApp, optional FCM for push.

## Staff alerts

`GET /api/orders/workflow-alerts?days_ahead=3` returns:

- **due_soon_not_started** — `pending`, expected date from today through today + N days.
- **overdue_not_started** — `pending`, expected date before today.
- **overdue_in_progress** — `in_progress`, expected date before today.

The **Orders & repairs** page shows these as banners.

## Customer “due” nudges (manual)

`POST /api/orders/send-due-reminders?days_ahead=3` sends a gentle message to customers whose orders are **still pending** and whose expected date is **on or before** today + `days_ahead` (includes overdue). Use occasionally to avoid duplicate SMS.

## Customer portal

- `GET /api/customer-portal/work-orders` — custom orders & repairs for the logged-in customer.
- Portal **Orders** page has tabs: **Shop purchases (bills)** vs **Custom orders & repairs**.
