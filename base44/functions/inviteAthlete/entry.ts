from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

# Assuming 'db' is a configured database client, e.g., for SQLite or Base44's internal persistence.
# For Base44 functions, 'db' is usually available via the context or a global setup.
# In a real Base44 function, you would interact with entities directly.

# Define a Pydantic model for the request body
class InviteRequest(BaseModel):
    coach_id: str
    invitee_email: str

# Create an API router for this function
router = APIRouter()

@router.post("/inviteAthlete")
def invite_athlete(request: InviteRequest):
    """
    Generates a secure coach invite token with a 48-hour expiration window.
    Records the invite for later acceptance.
    """
    coach_id = request.coach_id
    invitee_email = request.invitee_email

    if not coach_id or not invitee_email:
        raise HTTPException(status_code=400, detail="Coach ID and Invitee Email are required.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    invite_record = {
        "coach_id": coach_id,
        "invitee_email": invitee_email.lower().strip(),
        "token": token,
        "expires_at": expires_at.isoformat(),
        "status": "pending" # status can be 'pending', 'accepted', 'expired', 'revoked'
    }
    
    # --- Persistence Layer Placeholder ---
    # In a live Base44 environment, you would use Base44's entity system here.
    # For example:
    # invite_entity = db.entities.CoachInvite.create(invite_record)
    # For this exercise, we are returning the record as if it were saved.
    print(f"DEBUG: Storing invite record: {invite_record}") 
    # --- End Persistence Layer Placeholder ---
    
    return {
        "status": "success",
        "token": token,
        "expires_at": invite_record["expires_at"]
    }

