from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.schemas import *
from app.database import user_service
from app.auth import get_current_user, require_master, require_staff_or_master

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: UserResponse = Depends(require_master)
):
    """Create a new user (Master only)"""
    try:
        return await user_service.create_user(user_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me/", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Get all users - filtered by role"""
    all_users = await user_service.get_all_users(skip=skip, limit=limit)
    
    # Staff can only see users assigned to their vessel
    if current_user.role == UserRole.STAFF:
        if not current_user.ship_id:
            return []  # No vessel assigned
        return [u for u in all_users if u.ship_id == current_user.ship_id]
    
    # Master can see all users
    return all_users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Get user by ID (Staff/Master only)"""
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: UserResponse = Depends(require_master)
):
    """Update user (Master only)"""
    user = await user_service.update_user(user_id, user_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/ship/{ship_id}/", response_model=List[UserResponse])
async def get_users_by_ship(
    ship_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Get all users assigned to a specific ship"""
    users = await user_service.get_all_users()
    ship_users = [user for user in users if user.ship_id == ship_id]
    return ship_users

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Delete user (Master only)"""
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    deleted = await user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete user")
    
    return {"message": "User deleted successfully"}
