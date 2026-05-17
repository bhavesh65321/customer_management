"""
tests/test_utils.py
====================
Unit tests for pure utility functions (no DB / HTTP needed):
  - utils/auth_utils.py  — hashing, JWT creation & verification
  - utils/errors.py      — ErrorCode mapping
  - utils/rate_limit.py  — sliding-window rate limiter
  - controllers/auth_controller.py — _validate_password_strength
"""

import time
import pytest


# ─────────────────────────────────────────────────────────────────────────────
# auth_utils — password hashing
# ─────────────────────────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        from utils.auth_utils import hash_password
        assert hash_password("MySecret1") != "MySecret1"

    def test_verify_correct_password(self):
        from utils.auth_utils import hash_password, verify_password
        hashed = hash_password("Correct123")
        assert verify_password("Correct123", hashed) is True

    def test_verify_wrong_password(self):
        from utils.auth_utils import hash_password, verify_password
        hashed = hash_password("Correct123")
        assert verify_password("Wrong123", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt uses random salt — each hash should be unique."""
        from utils.auth_utils import hash_password
        h1 = hash_password("Same123")
        h2 = hash_password("Same123")
        assert h1 != h2

    def test_verify_both_hashes_of_same_password(self):
        from utils.auth_utils import hash_password, verify_password
        h1 = hash_password("Same123")
        h2 = hash_password("Same123")
        assert verify_password("Same123", h1) is True
        assert verify_password("Same123", h2) is True


# ─────────────────────────────────────────────────────────────────────────────
# auth_utils — JWT tokens
# ─────────────────────────────────────────────────────────────────────────────

class TestJWT:
    def _sample_payload(self):
        return {"sub": "test@example.com", "user_id": 42, "role": "staff", "store_id": 1}

    def test_access_token_is_string(self):
        from utils.auth_utils import create_access_token
        token = create_access_token(self._sample_payload())
        assert isinstance(token, str)
        assert len(token) > 20

    def test_verify_valid_access_token(self):
        from utils.auth_utils import create_access_token, verify_token
        token = create_access_token(self._sample_payload())
        decoded = verify_token(token)
        assert decoded is not None
        assert decoded["user_id"] == 42
        assert decoded["role"] == "staff"

    def test_verify_tampered_token_returns_none(self):
        from utils.auth_utils import create_access_token, verify_token
        token = create_access_token(self._sample_payload())
        tampered = token[:-5] + "XXXXX"
        assert verify_token(tampered) is None

    def test_verify_garbage_string_returns_none(self):
        from utils.auth_utils import verify_token
        assert verify_token("not.a.token") is None

    def test_verify_empty_string_returns_none(self):
        from utils.auth_utils import verify_token
        assert verify_token("") is None

    def test_refresh_token_is_string(self):
        from utils.auth_utils import create_refresh_token
        token = create_refresh_token(self._sample_payload())
        assert isinstance(token, str)

    def test_verify_valid_refresh_token(self):
        from utils.auth_utils import create_refresh_token, verify_refresh_token
        token = create_refresh_token(self._sample_payload())
        decoded = verify_refresh_token(token)
        assert decoded is not None
        assert decoded["user_id"] == 42

    def test_access_token_rejected_as_refresh_token(self):
        """Access and refresh tokens use different secrets — should not be interchangeable."""
        from utils.auth_utils import create_access_token, verify_refresh_token
        access = create_access_token(self._sample_payload())
        assert verify_refresh_token(access) is None


# ─────────────────────────────────────────────────────────────────────────────
# errors — ErrorCode
# ─────────────────────────────────────────────────────────────────────────────

class TestErrorCode:
    def test_from_status_400(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(400) == ErrorCode.BAD_REQUEST

    def test_from_status_401(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(401) == ErrorCode.UNAUTHORIZED

    def test_from_status_403(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(403) == ErrorCode.FORBIDDEN

    def test_from_status_404(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(404) == ErrorCode.NOT_FOUND

    def test_from_status_422(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(422) == ErrorCode.UNPROCESSABLE

    def test_from_status_500(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(500) == ErrorCode.INTERNAL_ERROR

    def test_from_unknown_status_returns_http_code_string(self):
        from utils.errors import ErrorCode
        assert ErrorCode.from_status(599) == "HTTP_599"

    def test_make_error_body_shape(self):
        from utils.errors import ErrorCode, make_error_body
        body = make_error_body(
            code=ErrorCode.NOT_FOUND,
            message="Thing not found",
            path="/api/things/1",
        )
        assert body["success"] is False
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Thing not found"
        assert body["path"] == "/api/things/1"
        assert "timestamp" in body

    def test_make_error_body_with_details(self):
        from utils.errors import ErrorCode, make_error_body
        details = [{"field": "email", "issue": "invalid"}]
        body = make_error_body(
            code=ErrorCode.UNPROCESSABLE,
            message="Validation failed",
            path="/api/register",
            details=details,
        )
        assert body["error"]["details"] == details


# ─────────────────────────────────────────────────────────────────────────────
# rate_limit — sliding-window limiter
# ─────────────────────────────────────────────────────────────────────────────

class TestRateLimit:
    def _fresh_key(self):
        """Each test uses a unique key to avoid cross-test pollution."""
        return f"test:{time.time_ns()}"

    def test_not_limited_initially(self):
        from utils.rate_limit import is_rate_limited
        assert is_rate_limited(self._fresh_key()) is False

    def test_limited_after_max_attempts(self):
        from utils.rate_limit import is_rate_limited, record_attempt, MAX_ATTEMPTS
        key = self._fresh_key()
        for _ in range(MAX_ATTEMPTS):
            record_attempt(key)
        assert is_rate_limited(key) is True

    def test_not_limited_one_below_max(self):
        from utils.rate_limit import is_rate_limited, record_attempt, MAX_ATTEMPTS
        key = self._fresh_key()
        for _ in range(MAX_ATTEMPTS - 1):
            record_attempt(key)
        assert is_rate_limited(key) is False

    def test_different_keys_are_independent(self):
        from utils.rate_limit import is_rate_limited, record_attempt, MAX_ATTEMPTS
        key_a = self._fresh_key()
        key_b = self._fresh_key()
        for _ in range(MAX_ATTEMPTS):
            record_attempt(key_a)
        # key_b should not be affected
        assert is_rate_limited(key_b) is False


# ─────────────────────────────────────────────────────────────────────────────
# _validate_password_strength
# ─────────────────────────────────────────────────────────────────────────────

class TestPasswordStrength:
    def _validate(self, pw):
        from controllers.auth_controller import _validate_password_strength
        _validate_password_strength(pw)

    def test_valid_password_passes(self):
        self._validate("Valid123")  # should not raise

    def test_too_short_raises(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self._validate("Sh0rt")
        assert exc_info.value.status_code == 400

    def test_no_letter_raises(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self._validate("12345678")
        assert exc_info.value.status_code == 400

    def test_no_digit_raises(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self._validate("NoDigitsHere")
        assert exc_info.value.status_code == 400

    def test_exactly_eight_chars_with_letter_and_digit(self):
        self._validate("Passw0rd")  # should not raise
