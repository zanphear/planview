"""Cross-tenant (IDOR) security regression tests.

These guard the workspace isolation contract (ADR 0007). Two distinct failure
modes are covered:

  * Using ANOTHER workspace's id in the path  -> 403 (not a member of it).
  * Using your OWN workspace's id in the path but a resource id that belongs to a
    DIFFERENT workspace -> 404 (the scoped query simply doesn't find it; no leak).

Everything asserts on the HTTP status contract, never on internals.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace
from app.utils.auth import create_access_token, hash_password


async def _make_other_workspace_user(db: AsyncSession) -> tuple[Workspace, dict]:
    """Build a second workspace + owner user inline, return (workspace, auth_headers)."""
    other_ws = Workspace(name="Other Workspace")
    db.add(other_ws)
    await db.flush()

    other_user = User(
        name="Other User",
        email=f"other-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("otherpass123"),
        role="owner",
        workspace_id=other_ws.id,
        colour="#E04141",
        initials="OU",
    )
    db.add(other_user)
    await db.flush()

    token = create_access_token(other_user.id)
    return other_ws, {"Authorization": f"Bearer {token}"}


async def _create_programme(client: AsyncClient, headers, workspace_id) -> dict:
    resp = await client.post(
        f"/api/v1/workspaces/{workspace_id}/early-talent/programmes",
        headers=headers,
        json={
            "name": "Grad Scheme A",
            "programme_type": "graduate",
            "start_date": "2026-09-01",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_cross_tenant_programme_via_own_workspace_path_is_404(
    client: AsyncClient, auth_headers, workspace: Workspace, db: AsyncSession
):
    """User B uses their OWN workspace id but workspace A's programme id -> 404 on every verb."""
    programme = await _create_programme(client, auth_headers, workspace.id)
    other_ws, other_headers = await _make_other_workspace_user(db)

    base = f"/api/v1/workspaces/{other_ws.id}/early-talent/programmes/{programme['id']}"

    get_resp = await client.get(base, headers=other_headers)
    assert get_resp.status_code == 404

    put_resp = await client.put(base, headers=other_headers, json={"name": "Hijacked"})
    assert put_resp.status_code == 404

    del_resp = await client.delete(base, headers=other_headers)
    assert del_resp.status_code == 404


@pytest.mark.asyncio
async def test_access_other_workspace_path_without_membership_is_403(
    client: AsyncClient, auth_headers, workspace: Workspace, db: AsyncSession
):
    """User B addresses workspace A's path directly -> 403 (not a member of A)."""
    programme = await _create_programme(client, auth_headers, workspace.id)
    _other_ws, other_headers = await _make_other_workspace_user(db)

    base = f"/api/v1/workspaces/{workspace.id}/early-talent/programmes/{programme['id']}"

    get_resp = await client.get(base, headers=other_headers)
    assert get_resp.status_code == 403

    put_resp = await client.put(base, headers=other_headers, json={"name": "Hijacked"})
    assert put_resp.status_code == 403

    del_resp = await client.delete(base, headers=other_headers)
    assert del_resp.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_still_reach_own_programme(
    client: AsyncClient, auth_headers, workspace: Workspace
):
    """Sanity: the legitimate owner is not locked out by the guard."""
    programme = await _create_programme(client, auth_headers, workspace.id)
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/early-talent/programmes/{programme['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == programme["id"]


@pytest.mark.asyncio
async def test_cross_tenant_participant_via_own_workspace_path_is_404(
    client: AsyncClient, auth_headers, workspace: Workspace, test_user: User, db: AsyncSession
):
    """A participant created in workspace A is invisible (404) to a workspace B caller."""
    programme = await _create_programme(client, auth_headers, workspace.id)

    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/early-talent/participants",
        headers=auth_headers,
        json={
            "programme_id": programme["id"],
            "user_id": str(test_user.id),
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    participant = create_resp.json()

    other_ws, other_headers = await _make_other_workspace_user(db)
    base = f"/api/v1/workspaces/{other_ws.id}/early-talent/participants/{participant['id']}"

    get_resp = await client.get(base, headers=other_headers)
    assert get_resp.status_code == 404

    put_resp = await client.put(base, headers=other_headers, json={"status": "withdrawn"})
    assert put_resp.status_code == 404

    del_resp = await client.delete(base, headers=other_headers)
    assert del_resp.status_code == 404


@pytest.mark.asyncio
async def test_attachment_list_for_task_outside_workspace_is_404(
    client: AsyncClient, auth_headers, workspace: Workspace, db: AsyncSession
):
    """Attachments hang off a task; a task from workspace A must 404 under workspace B's path.

    No real file upload is needed to exercise the IDOR guard: the task-not-in-workspace
    check (`_task_in_workspace`) runs before any attachment lookup.
    """
    task_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Task in A"},
    )
    assert task_resp.status_code == 201, task_resp.text
    task = task_resp.json()

    other_ws, other_headers = await _make_other_workspace_user(db)

    list_resp = await client.get(
        f"/api/v1/workspaces/{other_ws.id}/tasks/{task['id']}/attachments",
        headers=other_headers,
    )
    assert list_resp.status_code == 404


@pytest.mark.asyncio
async def test_attachment_list_via_other_workspace_path_is_403(
    client: AsyncClient, auth_headers, workspace: Workspace, db: AsyncSession
):
    """Addressing workspace A's task path as a non-member -> 403 at the workspace guard."""
    task_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/tasks",
        headers=auth_headers,
        json={"name": "Task in A"},
    )
    assert task_resp.status_code == 201, task_resp.text
    task = task_resp.json()

    _other_ws, other_headers = await _make_other_workspace_user(db)

    list_resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/tasks/{task['id']}/attachments",
        headers=other_headers,
    )
    assert list_resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_request_is_rejected(
    client: AsyncClient, workspace: Workspace
):
    """No bearer token at all -> 401 (auth required before any workspace check)."""
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/early-talent/programmes",
    )
    assert resp.status_code == 401
