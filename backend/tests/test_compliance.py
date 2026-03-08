import pytest
from httpx import AsyncClient

from app.models.user import User
from app.models.workspace import Workspace


@pytest.mark.asyncio
async def test_create_compliance_item(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "item_type": "dbs_check",
            "title": "Enhanced DBS Check",
            "expiry_date": "2027-06-01",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["item_type"] == "dbs_check"
    assert data["title"] == "Enhanced DBS Check"
    assert data["status"] == "active"
    assert data["user_id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_list_compliance_items(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    # Create items of different types
    for item_type, title in [("visa", "Work Visa"), ("certification", "ISO 27001")]:
        await client.post(
            f"/api/v1/workspaces/{workspace.id}/compliance",
            headers=auth_headers,
            json={
                "user_id": str(test_user.id),
                "item_type": item_type,
                "title": title,
            },
        )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_filter_compliance_by_type(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    await client.post(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "item_type": "contract",
            "title": "Employment Contract",
        },
    )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        params={"item_type": "contract"},
    )
    assert resp.status_code == 200
    items = resp.json()
    assert all(i["item_type"] == "contract" for i in items)


@pytest.mark.asyncio
async def test_update_compliance_status(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "item_type": "right_to_work",
            "title": "Right to Work Check",
            "expiry_date": "2026-12-31",
        },
    )
    item_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/compliance/{item_id}",
        headers=auth_headers,
        json={"status": "expired"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "expired"


@pytest.mark.asyncio
async def test_get_compliance_item(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "item_type": "certification",
            "title": "First Aid Certificate",
        },
    )
    item_id = create_resp.json()["id"]

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/compliance/{item_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "First Aid Certificate"


@pytest.mark.asyncio
async def test_get_compliance_item_not_found(client: AsyncClient, auth_headers, workspace: Workspace):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/compliance/{fake_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_compliance_item(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/compliance",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "item_type": "other",
            "title": "To Be Deleted",
        },
    )
    item_id = create_resp.json()["id"]

    # Delete
    resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/compliance/{item_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 204

    # Confirm gone
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/compliance/{item_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_compliance_item_not_found(client: AsyncClient, auth_headers, workspace: Workspace):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.delete(
        f"/api/v1/workspaces/{workspace.id}/compliance/{fake_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 404
