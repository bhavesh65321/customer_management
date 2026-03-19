import time
from collections import defaultdict
from threading import Lock

_attempts = defaultdict(list)
_lock = Lock()
WINDOW_SECONDS = 60
MAX_ATTEMPTS = 10


def _prune(key: str) -> None:
    now = time.monotonic()
    _attempts[key] = [t for t in _attempts[key] if now - t < WINDOW_SECONDS]


def is_rate_limited(key: str) -> bool:
    with _lock:
        _prune(key)
        return len(_attempts[key]) >= MAX_ATTEMPTS


def record_attempt(key: str) -> None:
    with _lock:
        _prune(key)
        _attempts[key].append(time.monotonic())
