"""Core projects router contract tests (create / list / get / update / delete).

Asserts on the JSON response contract and status codes only.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.models.workspace import Workspace


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
        json={"name": "Apollo", "colour": "#FF8800"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Apollo"
    assert data["colour"] == "#FF8800"
    assert data["workspace_id"] == str(workspace.id)
    # Server-side defaults / required response fields present.
    assert uuid.UUID(data["id"])
    assert "status" in data
    assert "is_favourite" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_project_uses_default_colour(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
        json={"name": "No Colour Given"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["colour"] == "#4186E0"


@pytest.mark.asyncio
async def test_list_projects_scoped_to_workspace(client: AsyncClient, auth_headers, workspace: Workspace):
    for name in ("Beta", "Alpha"):
        await client.post(
            f"/api/v1/workspaces/{workspace.id}/projects",
            headers=auth_headers,
            json={"name": name},
        )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    names = [p["name"] for p in data]
    assert "Alpha" in names and "Beta" in names
    # Every returned project belongs to this workspace.
    assert all(p["workspace_id"] == str(workspace.id) for p in data)
    # Ordered by name (router does .order_by(Project.name)).
    assert names.index("Alpha") < names.index("Beta")


@pytest.mark.asyncio
async def test_get_project_by_id(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
        json={"name": "Gemini"},
    )
    project_id = create_resp.json()["id"]

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/projects/{project_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == project_id
    assert resp.json()["name"] == "Gemini"


@pytest.mark.asyncio
async def test_get_missing_project_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/projects/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
        json={"name": "Mercury"},
    )
    project_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/projects/{project_id}",
        headers=auth_headers,
        json={"name": "Mercury Redstone", "is_favourite": True, "status": "archived"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Mercury Redstone"
    assert data["is_favourite"] is True
    assert data["status"] == "archived"


@pytest.mark.asyncio
async def test_update_missing_project_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/projects/{uuid.uuid4()}",
        headers=auth_headers,
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/projects",
        headers=auth_headers,
        json={"name": "Saturn"},
    )
    project_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/projects/{project_id}",
        headers=auth_headers,
    )
    assert del_resp.status_code == 204

    # Gone afterwards.
    get_resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/projects/{project_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_missing_project_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/projects/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404
