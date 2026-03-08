import json

import httpx

from app.config import settings


def is_enabled() -> bool:
    return bool(getattr(settings, "ai_model_url", ""))


def build_system_prompt(workspace_name: str) -> str:
    return f"""You are an AI assistant for {workspace_name} in the Planview people management platform.
You help with team management, objectives tracking, compliance, leave management, and people analytics.
Be concise, professional, and helpful. When asked about data, provide specific insights where possible."""


async def stream_chat(messages: list[dict], workspace_name: str):
    if not is_enabled():
        yield "AI assistant is not configured. Set AI_MODEL_URL in your environment."
        return

    system_prompt = build_system_prompt(workspace_name)
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{settings.ai_model_url}/v1/chat/completions",
            json={
                "model": settings.ai_model_name,
                "messages": full_messages,
                "stream": True,
            },
            headers={"Content-Type": "application/json"},
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        content = chunk["choices"][0]["delta"].get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


QUICK_REPORT_TYPE_MAP = {
    "team_health": "team_health",
    "compliance": "compliance",
    "skills_coverage": "skills_gap",
    "leave_forecast": "leave_forecast",
    "objectives_progress": "objectives",
    "onboarding_status": "onboarding",
}


async def run_quick_report(
    report_type: str,
    workspace_name: str,
    db,
    workspace_id,
):
    from app.services.analysis_service import gather_context, build_analysis_prompt

    analysis_type = QUICK_REPORT_TYPE_MAP.get(report_type, report_type)
    context = await gather_context(analysis_type, db, workspace_id)
    messages = build_analysis_prompt(analysis_type, context)

    async for chunk in _stream_llm(messages):
        yield chunk


async def _stream_llm(messages: list[dict]):
    if not is_enabled():
        yield "AI assistant is not configured. Set AI_MODEL_URL in your environment."
        return

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{settings.ai_model_url}/v1/chat/completions",
            json={
                "model": settings.ai_model_name,
                "messages": messages,
                "stream": True,
            },
            headers={"Content-Type": "application/json"},
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        content = chunk["choices"][0]["delta"].get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
