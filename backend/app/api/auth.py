import io
import secrets
import time
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.logging_config import get_logger
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.user import TokenRefresh, TokenResponse, UserLogin, UserRegister, UserResponse
from app.services import oidc_service
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = get_logger("planview.auth")

try:
    import pyotp
    import qrcode
    import qrcode.image.svg
    HAS_TOTP = True
except ImportError:
    HAS_TOTP = False

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Redis helpers for rate limiting and token revocation ---

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 900  # 15 minutes
REFRESH_TOKEN_PREFIX = "rt:jti:"


async def _check_login_rate(email: str) -> None:
    r = await _get_redis()
    key = f"login_attempts:{email.lower()}"
    attempts = await r.get(key)
    if attempts and int(attempts) >= LOGIN_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again in 15 minutes.",
        )


async def _record_login_attempt(email: str) -> None:
    r = await _get_redis()
    key = f"login_attempts:{email.lower()}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, LOGIN_RATE_WINDOW)
    await pipe.execute()


async def _clear_login_attempts(email: str) -> None:
    r = await _get_redis()
    await r.delete(f"login_attempts:{email.lower()}")


async def _store_refresh_jti(jti: str, user_id: str) -> None:
    r = await _get_redis()
    ttl = settings.jwt_refresh_token_expire_days * 86400
    await r.set(f"{REFRESH_TOKEN_PREFIX}{jti}", user_id, ex=ttl)


async def _consume_refresh_jti(jti: str) -> str | None:
    r = await _get_redis()
    key = f"{REFRESH_TOKEN_PREFIX}{jti}"
    user_id = await r.get(key)
    if user_id:
        await r.delete(key)
    return user_id


async def _revoke_refresh_jti(jti: str) -> None:
    r = await _get_redis()
    await r.delete(f"{REFRESH_TOKEN_PREFIX}{jti}")


def _issue_tokens(user_id: uuid.UUID) -> tuple[TokenResponse, str]:
    jti = secrets.token_urlsafe(16)
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id, jti=jti),
    ), jti


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    if settings.auth_mode == "oidc_only":
        raise HTTPException(status_code=400, detail="Registration disabled in OIDC-only mode")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    workspace_name = data.workspace_name or f"{data.name}'s Workspace"
    workspace = Workspace(name=workspace_name)
    db.add(workspace)
    await db.flush()

    initials = "".join(word[0].upper() for word in data.name.split()[:2]) or data.name[:2].upper()
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        initials=initials,
        role="owner",
        workspace_id=workspace.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    resp, jti = _issue_tokens(user.id)
    await _store_refresh_jti(jti, str(user.id))
    return resp


class LoginRequest(BaseModel):
    email: str
    password: str
    totp_code: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    if settings.auth_mode == "oidc_only":
        raise HTTPException(status_code=400, detail="Password login disabled")

    await _check_login_rate(data.email)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        await _record_login_attempt(data.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.totp_enabled and user.totp_secret:
        if not HAS_TOTP:
            raise HTTPException(status_code=500, detail="2FA libraries not installed")
        if not data.totp_code:
            raise HTTPException(status_code=403, detail="2FA code required")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(data.totp_code):
            await _record_login_attempt(data.email)
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    await _clear_login_attempts(data.email)
    resp, jti = _issue_tokens(user.id)
    await _store_refresh_jti(jti, str(user.id))
    return resp


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    jti = payload.get("jti")
    user_id = payload.get("sub")

    # If token has JTI, validate and consume it (rotation)
    if jti:
        stored_user = await _consume_refresh_jti(jti)
        if stored_user is None:
            raise HTTPException(status_code=401, detail="Refresh token has been revoked or already used")
        if stored_user != user_id:
            raise HTTPException(status_code=401, detail="Token mismatch")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    resp, new_jti = _issue_tokens(user.id)
    await _store_refresh_jti(new_jti, str(user.id))
    return resp


@router.post("/logout", status_code=204)
async def logout(data: TokenRefresh):
    try:
        payload = decode_token(data.refresh_token)
        jti = payload.get("jti")
        if jti:
            await _revoke_refresh_jti(jti)
    except Exception:
        # Best-effort revocation: a malformed/expired token can't be revoked, but
        # surface it to the logs rather than swallowing silently (forbidden-1).
        logger.warning("refresh_revoke_failed", exc_info=True)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password", status_code=204)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.password_hash or not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()


# --- 2FA (TOTP) ---


class TotpSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_svg: str


class TotpVerifyRequest(BaseModel):
    code: str


@router.post("/2fa/setup", response_model=TotpSetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not HAS_TOTP:
        raise HTTPException(status_code=501, detail="2FA libraries not installed (pyotp, qrcode)")
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    await db.commit()

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email or current_user.name, issuer_name="Planview")

    img = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    qr_svg = buf.getvalue().decode()

    return TotpSetupResponse(secret=secret, otpauth_uri=uri, qr_svg=qr_svg)


@router.post("/2fa/verify", status_code=204)
async def verify_2fa(
    data: TotpVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not HAS_TOTP:
        raise HTTPException(status_code=501, detail="2FA libraries not installed")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not set up, call /2fa/setup first")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.totp_enabled = True
    await db.commit()


@router.post("/2fa/disable", status_code=204)
async def disable_2fa(
    data: TotpVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not HAS_TOTP:
        raise HTTPException(status_code=501, detail="2FA libraries not installed")
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    await db.commit()


# --- OIDC ---

# In-memory state+nonce store with TTL (per-process, good enough for auth flows)
_oidc_states: dict[str, dict] = {}
_STATE_TTL = 600  # 10 minutes


def _is_oidc_configured() -> bool:
    return bool(settings.oidc_issuer_url and settings.oidc_client_id)


def _cleanup_expired_states() -> None:
    now = time.monotonic()
    expired = [k for k, v in _oidc_states.items() if now - v["ts"] > _STATE_TTL]
    for k in expired:
        del _oidc_states[k]


class OIDCConfigResponse(BaseModel):
    oidc_enabled: bool
    auth_mode: str
    authorization_url: str | None = None


class OIDCAuthorizeResponse(BaseModel):
    redirect_url: str
    state: str


class OIDCCallbackRequest(BaseModel):
    code: str
    state: str
    redirect_uri: str


@router.get("/oidc/config", response_model=OIDCConfigResponse)
async def oidc_config():
    enabled = _is_oidc_configured()
    return OIDCConfigResponse(
        oidc_enabled=enabled,
        auth_mode=settings.auth_mode,
    )


@router.get("/oidc/authorize")
async def oidc_authorize(redirect_uri: str):
    if not _is_oidc_configured():
        raise HTTPException(status_code=400, detail="OIDC is not configured")

    _cleanup_expired_states()

    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    _oidc_states[state] = {"ts": time.monotonic(), "nonce": nonce}

    try:
        url = await oidc_service.get_authorization_url(redirect_uri, state, nonce=nonce)
    except Exception as e:
        logger.error("oidc_authorize_url_failed", error=str(e))
        raise HTTPException(status_code=502, detail="Failed to contact OIDC provider")

    return OIDCAuthorizeResponse(redirect_url=url, state=state)


@router.post("/oidc/callback", response_model=TokenResponse)
async def oidc_callback(data: OIDCCallbackRequest, db: AsyncSession = Depends(get_db)):
    if not _is_oidc_configured():
        raise HTTPException(status_code=400, detail="OIDC is not configured")

    _cleanup_expired_states()
    state_data = _oidc_states.pop(data.state, None)
    if state_data is None:
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")

    expected_nonce = state_data.get("nonce")

    try:
        claims = await oidc_service.exchange_code(data.code, data.redirect_uri, expected_nonce=expected_nonce)
    except Exception as e:
        logger.error("oidc_token_exchange_failed", error=str(e))
        raise HTTPException(status_code=502, detail="OIDC token exchange failed")

    sub = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name") or claims.get("preferred_username") or email or "OIDC User"

    if not sub:
        raise HTTPException(status_code=400, detail="OIDC provider did not return a subject claim")

    # Look up existing user by oidc_sub
    result = await db.execute(select(User).where(User.oidc_sub == sub))
    user = result.scalar_one_or_none()

    if user:
        resp, jti = _issue_tokens(user.id)
        await _store_refresh_jti(jti, str(user.id))
        return resp

    # No existing OIDC user, check if there's a password user with same email we can link
    if email:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing and existing.auth_provider == "password":
            existing.oidc_sub = sub
            existing.oidc_issuer = settings.oidc_issuer_url
            existing.auth_provider = "hybrid"
            await db.commit()
            resp, jti = _issue_tokens(existing.id)
            await _store_refresh_jti(jti, str(existing.id))
            return resp

    # Auto-provision new user
    if not settings.oidc_auto_provision:
        raise HTTPException(status_code=403, detail="User not found and auto-provisioning is disabled")

    ws_result = await db.execute(select(Workspace).limit(1))
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        workspace = Workspace(name=f"{name}'s Workspace")
        db.add(workspace)
        await db.flush()

    initials = "".join(word[0].upper() for word in name.split()[:2]) or name[:2].upper()
    user = User(
        name=name,
        email=email,
        oidc_sub=sub,
        oidc_issuer=settings.oidc_issuer_url,
        auth_provider="oidc",
        initials=initials,
        role=settings.oidc_default_role,
        workspace_id=workspace.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    resp, jti = _issue_tokens(user.id)
    await _store_refresh_jti(jti, str(user.id))
    return resp
