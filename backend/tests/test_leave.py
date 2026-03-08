from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace


@pytest.mark.asyncio
async def test_create_allowance(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/leave/allowances",
        headers=auth_headers,
        json={
            "user_id": str(test_user.id),
            "year": 2026,
            "entitlement_days": 25,
            "carried_forward": 3,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["user_id"] == str(test_user.id)
    assert data["year"] == 2026
    assert data["entitlement_days"] == 25
    assert data["carried_forward"] == 3
    assert data["remaining"] == 28  # 25 + 3 - 0 - 0


@pytest.mark.asyncio
async def test_list_allowances(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    # Create two allowances for different years
    for year in (2025, 2026):
        await client.post(
            f"/api/v1/workspaces/{workspace.id}/leave/allowances",
            headers=auth_headers,
            json={"user_id": str(test_user.id), "year": year, "entitlement_days": 25},
        )

    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/leave/allowances",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

    # Filter by year
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/leave/allowances",
        headers=auth_headers,
        params={"year": 2025},
    )
    assert resp.status_code == 200
    assert all(a["year"] == 2025 for a in resp.json())


@pytest.mark.asyncio
async def test_create_leave_request(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/leave/requests",
        headers=auth_headers,
        json={
            "leave_type": "annual",
            "start_date": "2026-04-01",
            "end_date": "2026-04-05",
            "days": 5,
            "notes": "Holiday",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["leave_type"] == "annual"
    assert data["status"] == "pending"
    assert data["days"] == 5
    assert data["user_id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_approve_leave_request(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    # Create a request
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/leave/requests",
        headers=auth_headers,
        json={
            "leave_type": "annual",
            "start_date": "2026-05-10",
            "end_date": "2026-05-12",
            "days": 3,
        },
    )
    request_id = create_resp.json()["id"]

    # Approve it (PUT, not PATCH)
    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/leave/requests/{request_id}",
        headers=auth_headers,
        json={"status": "approved"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["approved_by"] == str(test_user.id)


@pytest.mark.asyncio
async def test_reject_leave_request(client: AsyncClient, auth_headers, workspace: Workspace, test_user: User):
    create_resp = await client.post(
        f"/api/v1/workspaces/{workspace.id}/leave/requests",
        headers=auth_headers,
        json={
            "leave_type": "annual",
            "start_date": "2026-06-01",
            "end_date": "2026-06-03",
            "days": 3,
        },
    )
    request_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/workspaces/{workspace.id}/leave/requests/{request_id}",
        headers=auth_headers,
        json={"status": "rejected"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_list_leave_requests_filter_by_status(
    client: AsyncClient, auth_headers, workspace: Workspace, test_user: User
):
    # Create two requests
    for start, end in [("2026-07-01", "2026-07-02"), ("2026-08-01", "2026-08-02")]:
        await client.post(
            f"/api/v1/workspaces/{workspace.id}/leave/requests",
            headers=auth_headers,
            json={"leave_type": "annual", "start_date": start, "end_date": end, "days": 2},
        )

    # All should be pending
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/leave/requests",
        headers=auth_headers,
        params={"status": "pending"},
    )
    assert resp.status_code == 200
    assert all(r["status"] == "pending" for r in resp.json())

    # Nothing approved yet for this workspace (from this test run)
    resp = await client.get(
        f"/api/v1/workspaces/{workspace.id}/leave/requests",
        headers=auth_headers,
        params={"status": "approved"},
    )
    assert resp.status_code == 200
