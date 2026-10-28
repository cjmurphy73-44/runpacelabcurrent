import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import httpx

router = APIRouter(prefix="/api/v1/garmin", tags=["garmin"])

GARMIN_CLIENT_ID = os.getenv("GARMIN_CLIENT_ID", "")
GARMIN_CLIENT_SECRET = os.getenv("GARMIN_CLIENT_SECRET", "")

@router.get("/oauth/authorize")
async def garmin_authorize(request: Request):
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("host", request.url.netloc)
    base_url = os.getenv("APP_BASE_URL", f"{forwarded_proto}://{host}")
    redirect_uri = f"{base_url}/api/v1/garmin/oauth/callback"

    auth_url = (
        f"https://connect.garmin.com/oauth2Confirm?"
        f"client_id={GARMIN_CLIENT_ID}&response_type=code&"
        f"redirect_uri={redirect_uri}&scope=read_activities"
    )
    return RedirectResponse(url=auth_url, status_code=303)

@router.get("/oauth/callback")
async def garmin_callback(request: Request, code: str = None, error: str = None):
    if error:
        return RedirectResponse(url=f"/settings?error=garmin_denied&message={error}", status_code=303)
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Garmin")

    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("host", request.url.netloc)
    base_url = os.getenv("APP_BASE_URL", f"{forwarded_proto}://{host}")
    redirect_uri = f"{base_url}/api/v1/garmin/oauth/callback"

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://connect.garmin.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": GARMIN_CLIENT_ID,
                "client_secret": GARMIN_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_response.status_code != 200:
        return RedirectResponse(url="/settings?error=token_exchange_failed", status_code=303)

    # TODO: Store tokens securely against user session
    return RedirectResponse(url="/settings?success=garmin_connected", status_code=303)
