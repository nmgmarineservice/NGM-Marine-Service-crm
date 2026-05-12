from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.schemas import *
from app.database import client_service
from app.auth import get_current_user, require_master, require_staff_or_master

router = APIRouter(prefix="/clients", tags=["clients"])

@router.post("/", response_model=ClientResponse)
async def create_client(
    data: ClientCreate,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Create a new client"""
    try:
        return await client_service.create_client(data, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    status: Optional[ClientStatus] = Query(None),
    country: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all clients with optional filtering"""
    return await client_service.get_all_clients(status=status, country=country)

@router.get("/stats/")
async def get_client_stats(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get client statistics"""
    return await client_service.get_stats()

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get specific client by ID"""
    client = await client_service.get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Update a client"""
    client = await client_service.get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Convert enum values to strings
    for key, value in update_data.items():
        if hasattr(value, 'value'):
            update_data[key] = value.value
    
    updated = await client_service.update_client(client_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update client")
    
    return updated

@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Delete a client (Master only)"""
    deleted = await client_service.delete_client(client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client deleted successfully"}
