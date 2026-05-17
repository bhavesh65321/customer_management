import os
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config.database import get_db
from dependencies import require_staff
from models.push_token import PushToken
from services.notification import twilio_whatsapp_configured
from services.push import is_fcm_configured

router = APIRouter(tags=["Notifications"])


@router.get("/channels")
def get_notification_channels():
    return {
        "emailConfigured": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER")),
        "smsConfigured": bool(
            os.getenv("TWILIO_ACCOUNT_SID")
            and os.getenv("TWILIO_AUTH_TOKEN")
            and os.getenv("TWILIO_FROM_NUMBER")
        ),
        "whatsappConfigured": twilio_whatsapp_configured(),
        "pushConfigured": is_fcm_configured(),
    }


class PushTokenRegister(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)
    platform: str = Field("web", max_length=32)


@router.post("/push-token")
def register_staff_push_token(
    body: PushTokenRegister,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    user_id = payload.get("user_id")
    store_id = payload.get("store_id")
    if user_id is None:
        raise HTTPException(status_code=400, detail="User id required")
    existing = db.query(PushToken).filter(PushToken.token == body.token).first()
    if existing:
        existing.user_id = user_id
        existing.store_id = store_id
        existing.customer_id = None
        existing.platform = body.platform or "web"
    else:
        db.add(
            PushToken(
                token=body.token,
                user_id=user_id,
                store_id=store_id,
                customer_id=None,
                platform=body.platform or "web",
            )
        )
    db.commit()
    return {"message": "Device registered"}


@router.delete("/push-token")
def unregister_staff_push_token(
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_staff),
):
    user_id = payload.get("user_id")
    row = db.query(PushToken).filter(PushToken.token == token, PushToken.user_id == user_id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"message": "OK"}
