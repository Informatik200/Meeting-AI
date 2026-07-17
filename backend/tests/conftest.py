import os
import sys
from unittest.mock import MagicMock, patch

# Mock faster_whisper before other imports to prevent loading binary wheels in headless CI
sys.modules["faster_whisper"] = MagicMock()

import pytest

# Force SQLite memory database and a dummy api key for config loading during testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["GEMINI_API_KEY"] = "mock_gemini_api_key_value_for_testing_12345"
# Rate limiting is exercised by its own isolated unit test (test_rate_limit.py);
# disable it here so the shared in-memory buckets can't make unrelated tests flaky.
os.environ["RATE_LIMIT_ENABLED"] = "false"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user, get_current_user_optional, hash_password
from app.database import Base, User, get_db
from app.database import SessionLocal as AppSessionLocal
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    # Set settings manually just to be absolutely sure
    import shutil
    import tempfile

    from app.config import settings

    temp_dir = tempfile.mkdtemp()
    settings.database_url = "sqlite:///:memory:"
    settings.gemini_api_key = "mock_gemini_api_key_value_for_testing_12345"
    settings.upload_dir = temp_dir
    settings.rate_limit_enabled = False
    yield
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(name="db_session")
def db_session_fixture():
    # Create an in-memory SQLite database for testing
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # process_meeting() (run as a background task) opens its own session via
    # app.database.SessionLocal() rather than the request-scoped get_db
    # override below. Point that factory at this same test engine, otherwise
    # a background task would silently operate on the real app database
    # (empty, and a different SQLite :memory: instance) instead of this one.
    AppSessionLocal.configure(bind=engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="test_user")
def test_user_fixture(db_session):
    """The default user that the `client` fixture is authenticated as."""
    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(name="client")
def client_fixture(db_session, test_user):
    """A TestClient auto-authenticated as `test_user`, via dependency overrides
    (same pattern as get_db below) rather than real tokens - this is what
    lets the ~30 pre-existing, auth-agnostic tests keep working unmodified.
    Use `real_auth_client` instead when testing the auth flow itself."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return test_user

    def override_get_current_user_optional():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="real_auth_client")
def real_auth_client_fixture(db_session):
    """A TestClient with real authentication - no user is implied, tests must
    register/login and attach their own Authorization header."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_gemini():
    """Mock generative model response to prevent actual Gemini API calls."""
    with patch("app.services.ai_summary.get_gemini_client") as mock_get_client:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = """
        {
          "title": "Test Meeting Title",
          "summary": "This is a mock summary of the meeting, discussing various test cases.",
          "key_points": ["Point one discussed", "Point two decided"],
          "decisions": ["Decided to add tests"],
          "action_items": [
            {"task": "Write test cases", "owner": "Developer", "due": "Today"}
          ]
        }
        """
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_whisper():
    """Mock whisper transcription function to avoid running neural networks locally."""
    with patch("app.services.pipeline.transcribe_audio") as mock_transcribe:
        mock_transcribe.return_value = "This is a mock transcript of the recorded audio file."
        yield mock_transcribe
