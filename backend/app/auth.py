from fastapi import Header, HTTPException, Depends
from firebase_admin import auth
from typing import Optional, List
from app.database import user_service
from app.schemas import UserRole, UserResponse
import asyncio

async def verify_token(authorization: str = Header(...)) -> dict:
    """Verify Firebase ID token and return decoded token"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.split(" ")[1]

    try:
        # Try to verify token normally
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception as e:
        # If it's a clock skew error, try again with a small time buffer
        if "used too early" in str(e):
            # Wait a moment and retry once
            await asyncio.sleep(1)
            try:
                decoded = auth.verify_id_token(token)
                return decoded
            except Exception as retry_e:
                raise HTTPException(status_code=401, detail=f"Invalid token: {str(retry_e)}")
        else:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

async def get_current_user(token: dict = Depends(verify_token)) -> UserResponse:
    """Get current user from database using Firebase UID"""
    firebase_uid = token.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid token: missing uid")
    
    user = await user_service.get_user_by_firebase_uid(firebase_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")
    
    if not user.active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    return user

def require_role(required_roles: List[UserRole]):
    """Create dependency to require specific user roles"""
    def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {[role.value for role in required_roles]}"
            )
        return current_user
    return role_checker

# Role-specific dependencies
async def require_master(current_user: UserResponse = Depends(get_current_user)):
    """Require MASTER role"""
    if current_user.role != UserRole.MASTER:
        raise HTTPException(status_code=403, detail="Master access required")
    return current_user

async def require_staff_or_master(current_user: UserResponse = Depends(get_current_user)):
    """Require STAFF or MASTER role"""
    if current_user.role not in [UserRole.STAFF, UserRole.MASTER]:
        raise HTTPException(status_code=403, detail="Staff or Master access required")
    return current_user

async def require_any_role(current_user: UserResponse = Depends(get_current_user)):
    """Allow any authenticated user"""
    return current_user
