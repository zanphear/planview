"""Core tasks router contract tests (create / list / get / update status / delete).

Asserts on the JSON response contract and status codes only.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.models.workspace import Workspace


async def _create_project(client: AsyncClient, headers, workspace_id) -> str:
    resp = await client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        headers=headers,
        json={"name": "Host Project"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_task_under_project(client: AsyncClient, auth_headers, workspace: Workspace):
    project_id = await _create_project(client, auth_headers, workspace.id)

    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Write the spec", "project_id": project_id},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Write the spec"
    assert data["project_id"] == project_id
    assert data["workspace_id"] == str(workspace.id)
    # Default status from schema.
    assert data["status"] == "todo"
    # Relationship collections always present in the response contract.
    assert data["assignees"] == []
    assert data["tags"] == []
    assert uuid.UUID(data["id"])


@pytest.mark.asyncio
async def test_create_task_without_project(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Backlog item"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Backlog item"
    assert data["project_id"] is None


@pytest.mark.asyncio
async def test_list_tasks_scoped_to_workspace(client: AsyncClient, auth_headers, workspace: Workspace):
    project_id = await _create_project(client, auth_headers, workspace.id)
    for name in ("Task One", "Task Two"):
        await client.post(
            f"/api/v1/workspaces/{workspace.id}/tasks",
            headers=auth_headers,
            json={"name": name, "project_id": project_id},
        )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    names = [t["name"] for t in data]
    assert "Task One" in names and "Task Two" in names
    assert all(t["workspace_id"] == str(workspace.id) for t in data)


@pytest.mark.asyncio
async def test_list_tasks_filter_by_project(client: AsyncClient, auth_headers, workspace: Workspace):
    project_id = await _create_project(client, auth_headers, workspace.id)
    await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Scoped task", "project_id": project_id},
    )
    # A task in no project, to prove the filter excludes it.
    await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Unscoped task"},
    )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        params={"project_id": project_id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert all(t["project_id"] == project_id for t in data)
    assert "Scoped task" in [t["name"] for t in data]


@pytest.mark.asyncio
async def test_get_task_by_id(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Fetch me"},
    )
    task_id = create_resp.json()["id"]

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id
    assert resp.json()["name"] == "Fetch me"


@pytest.mark.asyncio
async def test_get_missing_task_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_task_status(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Move me"},
    )
    task_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/tasks/{task_id}",
        headers=auth_headers,
        json={"status": "in_progress"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["id"] == task_id


@pytest.mark.asyncio
async def test_update_missing_task_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/tasks/{uuid.uuid4()}",
        headers=auth_headers,
        json={"status": "done"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient, auth_headers, workspace: Workspace):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Delete me"},
    )
    task_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert del_resp.status_code == 204

    get_resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_missing_task_is_404(client: AsyncClient, auth_headers, workspace: Workspace):
    resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/tasks/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404
