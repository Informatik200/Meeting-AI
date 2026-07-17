def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["checks"] == {"database": True, "ai_service_configured": True}


def test_health_check_degraded_without_gemini_key(client):
    from app.config import settings

    original_key = settings.gemini_api_key
    settings.gemini_api_key = ""
    try:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["database"] is True
        assert data["checks"]["ai_service_configured"] is False
    finally:
        settings.gemini_api_key = original_key
