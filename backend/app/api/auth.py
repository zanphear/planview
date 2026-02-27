import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.user import TokenRefresh, TokenResponse, UserLogin, UserRegister, UserResponse
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)

try:
    import pyotp
    import qrcode
    import qrcode.image.svg
    HAS_TOTP = True
except ImportError:
    HAS_TOTP = False

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create workspace
    workspace_name = data.workspace_name or f"{data.name}'s Workspace"
    workspace = Workspace(name=workspace_name)
    db.add(workspace)
    await db.flush()

    # Create user
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

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


class LoginRequest(BaseModel):
    email: str
    password: str
    totp_code: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.totp_enabled and user.totp_secret:
        if not HAS_TOTP:
            raise HTTPException(status_code=500, detail="2FA libraries not installed")
        if not data.totp_code:
            raise HTTPException(status_code=403, detail="2FA code required")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(data.totp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


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
        raise HTTPException(status_code=400, detail="2FA not set up — call /2fa/setup first")

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
