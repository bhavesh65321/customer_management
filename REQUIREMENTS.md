# Project requirements

This document lists the requirements for the customer management project and how to install them.

**New modules (see `docs/NEW_FEATURES_PLAN.md`):** Girvi (loans), Metal Exchange, Orders & Repairs, Stock. Backend APIs: `/api/girvi`, `/api/metal-exchange`, `/api/orders`, `/api/stock`. Run the backend once so new DB tables are created (`Base.metadata.create_all`).

**Jewellery intelligence (serialized pieces, karigars, lifecycle, insights):** APIs `/api/inventory` (piece lifecycle under `/api/inventory/{id}/events`), `/api/karigars`, `/api/insights`. Bills can link a line to a serialized piece via optional `pieceId` on each product. **Existing MySQL DBs:** run `docs/sql/add_jewellery_intelligence.sql` (or rely on `create_all` for new databases only).

**Store company logo:** The `stores` table includes optional `logo_url`. On an **existing** database created before this feature, run:  
`ALTER TABLE stores ADD COLUMN logo_url VARCHAR(500) NULL;`  
(see `docs/sql/add_store_logo_url.sql`). Logos are saved under `backend/uploads/store_logos/` and served at `/uploads/store_logos/...`.

---

## Backend (Python)

**Location:** `backend/requirements.txt`

| Package | Purpose |
|---------|---------|
| fastapi | API framework |
| uvicorn[standard] | ASGI server |
| sqlalchemy | ORM |
| pymysql | MySQL driver |
| pydantic | Data validation |
| python-dotenv | Environment variables |
| email-validator | Email validation |
| python-jose[cryptography] | JWT |
| passlib[bcrypt] | Password hashing |
| reportlab | PDF generation (purchase order / invoice) |
| twilio | SMS notifications (purchase order) |
| firebase-admin | Optional FCM push (mobile / PWA) |

**Install:**

```bash
cd backend
pip install -r requirements.txt
```

Optional: use a virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Frontend (Node.js)

**Location:** `frontend/package.json`

| Package | Purpose |
|---------|---------|
| react, react-dom | UI |
| react-router-dom | Routing |
| react-scripts | Build & dev server (Create React App) |
| @headlessui/react | UI components |
| @heroicons/react | Icons |
| recharts | Charts |
| tailwindcss | Styling (devDependencies) |

**Install:**

```bash
cd frontend
npm install
```

---

## Optional: email, SMS, WhatsApp, and push (backend)

Purchase order and payment reminders can use:

- **Email:** SMTP. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`.
- **SMS:** Twilio Programmable SMS. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- **WhatsApp:** Same Twilio account; set `TWILIO_WHATSAPP_FROM=whatsapp:+...` (see `docs/NOTIFICATIONS.md`).
- **Mobile push (FCM):** Firebase service account JSON path (`GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_CREDENTIALS_PATH`); device registration via `POST /api/customer-portal/push-token` or `POST /api/notifications/push-token`.

See `backend/.env.example` and `docs/NOTIFICATIONS.md`. If channels are not configured, the app runs without sending on those channels.
