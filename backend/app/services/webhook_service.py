"""Webhook delivery service — fires HTTP POST to registered webhook URLs."""
import hashlib
import hmac
import json
import logging
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook, WebhookLog

logger = logging.getLogger(__name__)


async def deliver_webhooks(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    event: str,
    payload: dict,
) -> None:
    result = await db.execute(
        select(Webhook).where(
            Webhook.workspace_id == workspace_id,
            Webhook.is_active == True,  # noqa: E712
        )
    )
    webhooks = result.scalars().all()

    for wh in webhooks:
        if wh.events and event not in wh.events:
            continue

        body = json.dumps({"event": event, "payload": payload}, default=str)
        headers = {"Content-Type": "application/json"}

        if wh.secret:
            sig = hmac.new(wh.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
            headers["X-Webhook-Signature"] = sig

        log = WebhookLog(
            webhook_id=wh.id,
            event=event,
            payload=payload,
        )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(wh.url, content=body, headers=headers)
                log.response_status = resp.status_code
                log.response_body = resp.text[:2000] if resp.text else None
                log.success = 200 <= resp.status_code < 300
        except Exception as exc:
            logger.warning("Webhook delivery failed for %s: %s", wh.url, exc)
            log.response_status = 0
            log.response_body = str(exc)[:2000]
            log.success = False

        db.add(log)

    await db.commit()
