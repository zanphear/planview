from __future__ import annotations

import time
import logging

import httpx
from jose import jwt

from app.config import settings

logger = logging.getLogger(__name__)

_metadata_cache: dict | None = None
_metadata_cache_time: float = 0
_CACHE_TTL = 3600  # 1 hour


async def get_metadata() -> dict:
    global _metadata_cache, _metadata_cache_time

    if _metadata_cache and (time.monotonic() - _metadata_cache_time) < _CACHE_TTL:
        return _metadata_cache

    issuer = settings.oidc_issuer_url.rstrip("/")
    url = f"{issuer}/.well-known/openid-configuration"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _metadata_cache = resp.json()
        _metadata_cache_time = time.monotonic()
        return _metadata_cache


async def get_jwks(jwks_uri: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(jwks_uri)
        resp.raise_for_status()
        return resp.json()


async def get_authorization_url(redirect_uri: str, state: str, nonce: str | None = None) -> str:
    meta = await get_metadata()
    auth_endpoint = meta["authorization_endpoint"]
    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
    }
    if nonce:
        params["nonce"] = nonce
    query = httpx.QueryParams(params)
    return f"{auth_endpoint}?{query}"


async def exchange_code(code: str, redirect_uri: str, expected_nonce: str | None = None) -> dict:
    """Exchange authorization code for tokens, return decoded ID token claims."""
    meta = await get_metadata()
    token_endpoint = meta["token_endpoint"]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.oidc_client_id,
                "client_secret": settings.oidc_client_secret,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        token_data = resp.json()

    id_token = token_data.get("id_token")
    if not id_token:
        raise ValueError("No id_token in OIDC token response")

    jwks_uri = meta.get("jwks_uri")
    if not jwks_uri:
        raise ValueError("No jwks_uri in OIDC discovery document")

    jwks = await get_jwks(jwks_uri)

    header = jwt.get_unverified_header(id_token)
    kid = header.get("kid")

    rsa_key = {}
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            rsa_key = key
            break

    if not rsa_key:
        raise ValueError(f"No matching key found in JWKS for kid={kid}")

    issuer = settings.oidc_issuer_url.rstrip("/")
    claims = jwt.decode(
        id_token,
        rsa_key,
        algorithms=["RS256", "ES256"],
        audience=settings.oidc_client_id,
        issuer=issuer,
    )

    # Validate nonce to prevent ID token replay
    if expected_nonce:
        if claims.get("nonce") != expected_nonce:
            raise ValueError("OIDC nonce mismatch — possible ID token replay")

    return claims
