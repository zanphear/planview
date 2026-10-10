import asyncio
import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import get_db
from app.main import app
from app.models import Base
from app.utils.auth import create_access_token, hash_password
from app.models.user import User
from app.models.workspace import Workspace

# Tests run against a DEDICATED disposable database, never the configured prod one.
# CI sets TEST_DATABASE_URL to an ephemeral Postgres service; locally, point it at a
# scratch DB. Falls back to settings.database_url only if nothing else is set.
TEST_DB_URL = os.getenv("TEST_DATABASE_URL", settings.database_url)

test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db():
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def workspace(db: AsyncSession):
    ws = Workspace(name="Test Workspace")
    db.add(ws)
    await db.flush()
    return ws


@pytest_asyncio.fixture
async def test_user(db: AsyncSession, workspace: Workspace):
    user = User(
        name="Test User",
        email=f"test-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("testpass123"),
        role="owner",
        workspace_id=workspace.id,
        colour="#4186E0",
        initials="TU",
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User):
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def client(db: AsyncSession):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
