from datetime import datetime, timedelta, timezone

import jwt

from config import Config


ACCESS_TOKEN_EXPIRES_SECONDS = 60 * 60
REFRESH_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60
JWT_ALGORITHM = "HS256"


class TokenError(Exception):
    pass


def _utc_now():
    return datetime.now(timezone.utc)


def _create_token(user_payload, token_type, expires_seconds):
    now = _utc_now()
    exp = now + timedelta(seconds=expires_seconds)
    payload = {
        "sub": str(user_payload["user_id"]),
        "role": user_payload.get("role") or "end_user",
        "username": user_payload.get("username"),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(user_payload):
    return _create_token(user_payload, "access", ACCESS_TOKEN_EXPIRES_SECONDS)


def create_refresh_token(user_payload):
    return _create_token(user_payload, "refresh", REFRESH_TOKEN_EXPIRES_SECONDS)


def create_token_pair(user_payload):
    return {
        "access_token": create_access_token(user_payload),
        "refresh_token": create_refresh_token(user_payload),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_EXPIRES_SECONDS,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRES_SECONDS,
    }


def decode_token(token, expected_type=None):
    try:
        payload = jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token sudah expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Token tidak valid") from exc

    token_type = payload.get("type")
    if expected_type and token_type != expected_type:
        raise TokenError(f"Token harus bertipe {expected_type}")

    if not payload.get("sub"):
        raise TokenError("Token tidak memiliki subject user")

    return payload
