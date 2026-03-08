# Project requirements

This document lists the requirements for the customer management project and how to install them.

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

## Optional: email & SMS (backend)

Purchase order notifications use:

- **Email:** SMTP (e.g. Gmail, SendGrid). Set in `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`.
- **SMS:** Twilio. Set in `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

See `backend/.env.example` for placeholders. If these are not set, the app runs without sending email or SMS.
