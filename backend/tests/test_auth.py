from unittest.mock import patch

from app.database import Meeting, RefreshToken, User

VALID_PASSWORD = "correct-horse-battery-staple"


def register(client, email="alice@example.com", password=VALID_PASSWORD, name="Alice"):
    response = client.post("/auth/register", json={"email": email, "password": password, "name": name})
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Register / login
# ---------------------------------------------------------------------------


def test_register_creates_user_and_returns_tokens(real_auth_client, db_session):
    data = register(real_auth_client)

    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice"

    user = db_session.query(User).filter(User.email == "alice@example.com").first()
    assert user is not None
    assert user.hashed_password != VALID_PASSWORD  # never stored in plaintext

    # Refresh cookie was set
    assert "refresh_token" in real_auth_client.cookies


def test_register_rejects_duplicate_email(real_auth_client):
    register(real_auth_client)
    response = real_auth_client.post("/auth/register", json={"email": "alice@example.com", "password": VALID_PASSWORD})
    assert response.status_code == 409


def test_register_rejects_invalid_input(real_auth_client):
    response = real_auth_client.post("/auth/register", json={"email": "not-an-email", "password": "x" * 10})
    assert response.status_code == 400

    response = real_auth_client.post("/auth/register", json={"email": "valid@example.com", "password": "short"})
    assert response.status_code == 400


def test_login_success(real_auth_client):
    register(real_auth_client)
    response = real_auth_client.post("/auth/login", json={"email": "alice@example.com", "password": VALID_PASSWORD})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alice@example.com"


def test_login_wrong_password(real_auth_client):
    register(real_auth_client)
    response = real_auth_client.post("/auth/login", json={"email": "alice@example.com", "password": "wrong-password"})
    assert response.status_code == 401


def test_login_nonexistent_email(real_auth_client):
    response = real_auth_client.post("/auth/login", json={"email": "ghost@example.com", "password": VALID_PASSWORD})
    assert response.status_code == 401


def test_login_google_only_account_has_no_password(real_auth_client):
    with patch("app.auth.verify_google_id_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google-uid-1",
            "email": "googleuser@example.com",
            "email_verified": True,
            "name": "Google User",
        }
        real_auth_client.post("/auth/google", json={"id_token": "fake"})

    response = real_auth_client.post(
        "/auth/login", json={"email": "googleuser@example.com", "password": "anything-at-all"}
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Access token protects endpoints
# ---------------------------------------------------------------------------


def test_protected_endpoint_requires_auth(real_auth_client):
    response = real_auth_client.get("/meetings")
    assert response.status_code == 401


def test_protected_endpoint_rejects_garbage_token(real_auth_client):
    response = real_auth_client.get("/meetings", headers=auth_headers("not-a-real-jwt"))
    assert response.status_code == 401


def test_access_token_allows_protected_endpoint(real_auth_client):
    data = register(real_auth_client)
    response = real_auth_client.get("/meetings", headers=auth_headers(data["access_token"]))
    assert response.status_code == 200
    assert response.json() == []


def test_me_endpoint_returns_current_user(real_auth_client):
    data = register(real_auth_client)
    response = real_auth_client.get("/auth/me", headers=auth_headers(data["access_token"]))
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_uploaded_meeting_is_owned_by_uploader(real_auth_client, db_session, mock_gemini, mock_whisper):
    import io

    data = register(real_auth_client)
    fake_audio = io.BytesIO(b"RIFF....WAVEfmt ")

    response = real_auth_client.post(
        "/meetings/upload",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
        headers=auth_headers(data["access_token"]),
    )
    assert response.status_code == 200
    meeting = db_session.query(Meeting).filter(Meeting.id == response.json()["id"]).first()
    assert meeting.owner_id == data["user"]["id"]


# ---------------------------------------------------------------------------
# Refresh / logout
# ---------------------------------------------------------------------------


def test_refresh_issues_new_access_token(real_auth_client):
    register(real_auth_client)

    response = real_auth_client.post("/auth/refresh")
    assert response.status_code == 200
    refreshed = response.json()
    assert refreshed["access_token"]
    assert refreshed["user"]["email"] == "alice@example.com"

    # The new access token is itself usable
    me_response = real_auth_client.get("/auth/me", headers=auth_headers(refreshed["access_token"]))
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "alice@example.com"

    # And the refresh cookie was rotated (old one already covered by
    # test_refresh_token_is_single_use)
    assert real_auth_client.cookies.get("refresh_token") is not None


def test_refresh_without_cookie_rejected(real_auth_client):
    response = real_auth_client.post("/auth/refresh")
    assert response.status_code == 401


def test_refresh_token_is_single_use(real_auth_client):
    register(real_auth_client)
    old_refresh_token = real_auth_client.cookies.get("refresh_token")

    first = real_auth_client.post("/auth/refresh")
    assert first.status_code == 200

    # Reuse the now-rotated-away original token explicitly
    real_auth_client.cookies.set("refresh_token", old_refresh_token)
    second = real_auth_client.post("/auth/refresh")
    assert second.status_code == 401


def test_logout_revokes_refresh_token(real_auth_client, db_session):
    register(real_auth_client)

    logout_response = real_auth_client.post("/auth/logout")
    assert logout_response.status_code == 200

    refresh_response = real_auth_client.post("/auth/refresh")
    assert refresh_response.status_code == 401

    # The DB record itself is marked revoked, not deleted
    tokens = db_session.query(RefreshToken).all()
    assert len(tokens) == 1
    assert tokens[0].revoked_at is not None


# ---------------------------------------------------------------------------
# Google Sign-In (mocked - no live Google dependency in tests)
# ---------------------------------------------------------------------------


def test_google_auth_creates_new_user(real_auth_client, db_session):
    with patch("app.auth.verify_google_id_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google-uid-42",
            "email": "newgoogleuser@example.com",
            "email_verified": True,
            "name": "New Google User",
        }
        response = real_auth_client.post("/auth/google", json={"id_token": "fake-google-token"})

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "newgoogleuser@example.com"

    user = db_session.query(User).filter(User.email == "newgoogleuser@example.com").first()
    assert user.google_id == "google-uid-42"
    assert user.hashed_password is None


def test_google_auth_links_existing_email_account(real_auth_client, db_session):
    register(real_auth_client, email="shared@example.com")

    with patch("app.auth.verify_google_id_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google-uid-shared",
            "email": "shared@example.com",
            "email_verified": True,
            "name": "Shared Account",
        }
        response = real_auth_client.post("/auth/google", json={"id_token": "fake-google-token"})

    assert response.status_code == 200
    users = db_session.query(User).filter(User.email == "shared@example.com").all()
    assert len(users) == 1  # linked, not duplicated
    assert users[0].google_id == "google-uid-shared"
    assert users[0].hashed_password is not None  # original password preserved


def test_google_auth_invalid_token_rejected(real_auth_client):
    from fastapi import HTTPException

    with patch("app.auth.verify_google_id_token", side_effect=HTTPException(401, "Invalid Google sign-in token.")):
        response = real_auth_client.post("/auth/google", json={"id_token": "garbage"})
    assert response.status_code == 401


def test_google_auth_unverified_email_rejected(real_auth_client):
    from fastapi import HTTPException

    with patch("app.auth.verify_google_id_token") as mock_verify:
        mock_verify.side_effect = HTTPException(401, "Google account email is not verified.")
        response = real_auth_client.post("/auth/google", json={"id_token": "fake"})
    assert response.status_code == 401


def test_verify_google_id_token_rejects_unverified_email():
    """Unit test of the real (unmocked) verification helper's email_verified check."""
    from app import auth

    with patch("app.auth.settings") as mock_settings, patch("app.auth.google_id_token") as mock_id_token:
        mock_settings.google_client_id = "configured-client-id"
        mock_id_token.verify_oauth2_token.return_value = {
            "sub": "uid",
            "email": "someone@example.com",
            "email_verified": False,
        }
        try:
            auth.verify_google_id_token("token")
            raise AssertionError("expected HTTPException for unverified email")
        except Exception as e:
            assert getattr(e, "status_code", None) == 401
