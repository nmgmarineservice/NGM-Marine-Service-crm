from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.schemas import *
from app.database import invoice_service
from app.auth import get_current_user, require_master, require_staff_or_master

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    data: InvoiceCreate,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Create a new invoice"""
    try:
        return await invoice_service.create_invoice(data, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[InvoiceResponse])
async def get_invoices(
    ship_id: Optional[str] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all invoices with optional filtering - role-based access"""
    # Staff can only see invoices for their assigned vessel
    if current_user.role == UserRole.STAFF:
        if not current_user.ship_id:
            return []  # No vessel assigned
        return await invoice_service.get_all_invoices(ship_id=current_user.ship_id, status=status)
    
    # Master can see all invoices
    return await invoice_service.get_all_invoices(ship_id=ship_id, status=status)

@router.get("/stats/")
async def get_invoice_stats(
    ship_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get invoice statistics - role-based access"""
    # Staff can only see stats for their assigned vessel
    if current_user.role == UserRole.STAFF:
        if not current_user.ship_id:
            return {"total_count": 0, "total_amount": 0, "pending_amount": 0, "paid_amount": 0}
        return await invoice_service.get_stats(ship_id=current_user.ship_id)
    
    # Master can see all stats
    return await invoice_service.get_stats(ship_id=ship_id)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get specific invoice by ID"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Update an invoice"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Convert enum values to strings
    for key, value in update_data.items():
        if hasattr(value, 'value'):
            update_data[key] = value.value
    
    updated = await invoice_service.update_invoice(invoice_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update invoice")
    
    return updated

@router.post("/{invoice_id}/submit/", response_model=InvoiceResponse)
async def submit_invoice(
    invoice_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Submit an invoice for approval"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft invoices can be submitted")
    
    updated = await invoice_service.submit_invoice(invoice_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to submit invoice")
    
    return updated

@router.post("/{invoice_id}/approve/", response_model=InvoiceResponse)
async def approve_invoice(
    invoice_id: str,
    notes: Optional[str] = None,
    current_user: UserResponse = Depends(require_master)
):
    """Approve an invoice (Master only)"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted invoices can be approved")
    
    updated = await invoice_service.approve_invoice(invoice_id, current_user.id, notes)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to approve invoice")
    
    return updated

@router.post("/{invoice_id}/reject/", response_model=InvoiceResponse)
async def reject_invoice(
    invoice_id: str,
    notes: Optional[str] = None,
    current_user: UserResponse = Depends(require_master)
):
    """Reject an invoice (Master only)"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted invoices can be rejected")
    
    updated = await invoice_service.reject_invoice(invoice_id, current_user.id, notes)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to reject invoice")
    
    return updated

@router.post("/{invoice_id}/mark-paid/", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Mark an approved invoice as paid"""
    invoice = await invoice_service.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != InvoiceStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved invoices can be marked as paid")
    
    updated = await invoice_service.mark_paid(invoice_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to mark invoice as paid")
    
    return updated

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Delete an invoice (Master only)"""
    deleted = await invoice_service.delete_invoice(invoice_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice deleted successfully"}
