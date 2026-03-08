import asyncio
import logging
import time
import uuid

from app.database import async_session
from app.models.analysis_report import AnalysisReport
from app.services.analysis_service import build_analysis_prompt, call_llm, gather_context
from app.websocket.events import emit_event

logger = logging.getLogger(__name__)

# Serialize LLM calls — one at a time to avoid overloading the model server
_semaphore = asyncio.Semaphore(1)


async def _process_report(report_id: uuid.UUID, workspace_id: uuid.UUID, report_type: str) -> None:
    async with _semaphore:
        async with async_session() as db:
            result = await db.get(AnalysisReport, report_id)
            if not result:
                logger.warning("Report %s not found, skipping", report_id)
                return

            result.status = "generating"
            await db.commit()

            await emit_event(str(workspace_id), "report.status_changed", {
                "report_id": str(report_id),
                "status": "generating",
            })

            start = time.time()
            try:
                context = await gather_context(report_type, db, workspace_id)
                messages = build_analysis_prompt(report_type, context)
                content = await call_llm(messages)
                elapsed = round(time.time() - start, 1)

                result.content = content
                result.status = "completed"
                result.generation_time_seconds = elapsed
            except Exception as e:
                elapsed = round(time.time() - start, 1)
                logger.exception("Report %s generation failed", report_id)
                result.content = f"Report generation failed: {e}"
                result.status = "failed"
                result.generation_time_seconds = elapsed

            await db.commit()

            await emit_event(str(workspace_id), "report.status_changed", {
                "report_id": str(report_id),
                "status": result.status,
                "generation_time_seconds": result.generation_time_seconds,
            })


def enqueue_report(report_id: uuid.UUID, workspace_id: uuid.UUID, report_type: str) -> None:
    asyncio.create_task(_process_report(report_id, workspace_id, report_type))
