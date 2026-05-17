import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_firebase_initialized = False


def is_fcm_configured() -> bool:
    if os.getenv("FCM_PUSH_DISABLED", "").lower() in ("1", "true", "yes"):
        return False
    cred = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred or not os.path.isfile(cred):
        return False
    try:
        import firebase_admin  # noqa: F401
    except ImportError:
        return False
    return True


def _ensure_firebase() -> bool:
    global _firebase_initialized
    if _firebase_initialized:
        return True
    if not is_fcm_configured():
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_CREDENTIALS_PATH")
            cred = credentials.Certificate(path)
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception as e:
        logger.warning("Firebase Admin init failed: %s", e)
        return False


def send_fcm_multicast(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> int:
    if not tokens:
        return 0
    if not _ensure_firebase():
        return 0
    from firebase_admin import messaging

    data_dict = {k: str(v) for k, v in (data or {}).items()}
    sent = 0
    batch_size = 500
    for i in range(0, len(tokens), batch_size):
        chunk = [t for t in tokens[i : i + batch_size] if t and len(t) > 8]
        if not chunk:
            continue
        kw = {
            "notification": messaging.Notification(title=title, body=body),
            "tokens": chunk,
        }
        if data_dict:
            kw["data"] = data_dict
        msg = messaging.MulticastMessage(**kw)
        try:
            resp = messaging.send_each_for_multicast(msg)
            sent += getattr(resp, "success_count", 0) or 0
            fc = getattr(resp, "failure_count", 0) or 0
            if fc:
                logger.warning("FCM partial failure: %s failures", fc)
        except Exception as e:
            logger.warning("FCM multicast error: %s", e)
    return sent
