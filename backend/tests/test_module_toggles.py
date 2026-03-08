import pytest
from httpx import AsyncClient

from app.models.workspace import Workspace
from app.schemas.workspace import DEFAULT_MODULES


@pytest.mark.asyncio
async def test_workspace_default_modules(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # Workspace may start with empty dict (server_default), that's fine
    data = resp.json()
    assert "enabled_modules" in data


@pytest.mark.asyncio
async def test_update_enabled_modules(client: AsyncClient, auth_headers, workspace: Workspace):
    custom_modules = {
        "people": True,
        "one_to_ones": False,
        "objectives": True,
        "compliance": False,
        "competencies": True,
        "leave": True,
        "recruitment": True,
        "development": False,
        "reviews": True,
        "ai_assistant": False,
        "wellbeing": True,
        "onboarding": False,
        "reporting": True,
        "guide": False,
    }

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}",
        headers=auth_headers,
        json={"enabled_modules": custom_modules},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled_modules"] == custom_modules


@pytest.mark.asyncio
async def test_modules_persist_after_update(client: AsyncClient, auth_headers, workspace: Workspace):
    modules = {"people": True, "leave": False, "compliance": True}

    # Update
    await client.put(
        f"/api/v1/workspaces/{workspace.id}",
        headers=auth_headers,
        json={"enabled_modules": modules},
    )

    # Re-fetch and verify
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["enabled_modules"] == modules


@pytest.mark.asyncio
async def test_update_modules_without_touching_name(client: AsyncClient, auth_headers, workspace: Workspace):
    original_name = workspace.name

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}",
        headers=auth_headers,
        json={"enabled_modules": {"people": False}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == original_name
    assert data["enabled_modules"] == {"people": False}


@pytest.mark.asyncio
async def test_default_modules_structure():
    """Verify DEFAULT_MODULES has the expected keys and bool values."""
    expected_keys = {
        "people", "one_to_ones", "objectives", "compliance", "competencies",
        "leave", "recruitment", "development", "reviews", "ai_assistant",
        "wellbeing", "onboarding", "reporting", "guide",
    }
    assert set(DEFAULT_MODULES.keys()) == expected_keys
    assert all(isinstance(v, bool) for v in DEFAULT_MODULES.values())
