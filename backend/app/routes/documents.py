from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.database import db, ship_service
from app.auth import get_current_user, require_role, require_master, require_staff_or_master
from app.schemas import UserResponse, UserRole
from app.schemas.documents import (
    ManualCreate, ManualUpdate, ManualResponse, ManualType,
    FormTemplateCreate, FormTemplateUpdate, FormTemplateResponse, FormCategory,
    FormSubmissionCreate, FormSubmissionUpdate, FormSubmissionResponse, FormStatus,
    TriggerWorkRequest, BulkDeleteRequest
)

router = APIRouter(prefix="/documents", tags=["documents"])

# --- MANUALS (Layer 1) ---

@router.post("/manuals", response_model=ManualResponse)
async def create_manual(
    manual: ManualCreate,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Upload a new manual (Staff/Master only)"""
    try:
        now = datetime.utcnow()
        doc_data = manual.dict()
        doc_data.update({
            "created_by": current_user.id,
            "created_at": now,
            "updated_at": now
        })
        
        doc_ref = db.collection('manuals').document()
        doc_ref.set(doc_data)
        
        return ManualResponse(id=doc_ref.id, **doc_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/manuals", response_model=List[ManualResponse])
async def get_manuals(
    type: Optional[ManualType] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all manuals (Accessible by all roles)"""
    try:
        query = db.collection('manuals')
        if type:
            query = query.where('manual_type', '==', type)
            
        docs = query.stream()
        manuals = [ManualResponse(id=doc.id, **doc.to_dict()) for doc in docs]
        return manuals
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/manuals/{manual_id}")
async def delete_manual(
    manual_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Delete a manual (Staff/Master only)"""
    try:
        doc_ref = db.collection('manuals').document(manual_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Manual not found")
        
        doc_ref.delete()
        return {"message": "Manual deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- FORM TEMPLATES (Layer 2) ---

@router.post("/templates", response_model=FormTemplateResponse)
async def create_template(
    template: FormTemplateCreate,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF]))
):
    """Create a new form template (Staff only)"""
    try:
        now = datetime.utcnow()
        doc_data = template.dict()
        doc_data.update({
            "created_by": current_user.id,
            "created_at": now,
            "updated_at": now
        })
        
        doc_ref = db.collection('form_templates').document()
        doc_ref.set(doc_data)
        
        return FormTemplateResponse(id=doc_ref.id, **doc_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates", response_model=List[FormTemplateResponse])
async def get_templates(
    category: Optional[FormCategory] = None,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Get form templates (Staff/Master only) - Crew shouldn't see raw templates"""
    try:
        query = db.collection('form_templates')
        if category:
            query = query.where('category', '==', category)
            
        docs = query.stream()
        templates = [FormTemplateResponse(id=doc.id, **doc.to_dict()) for doc in docs]
        return templates
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates/{template_id}", response_model=FormTemplateResponse)
async def get_template(
    template_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific template by ID (Accessible by all roles for rendering)"""
    try:
        doc_ref = db.collection('form_templates').document(template_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return FormTemplateResponse(id=doc.id, **doc.to_dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Delete a form template (Staff only)"""
    try:
        doc_ref = db.collection('form_templates').document(template_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Template not found")
        
        doc_ref.delete()
        return {"message": "Template deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/bulk-delete")
async def bulk_delete_templates(
    request: BulkDeleteRequest,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Delete multiple form templates (Staff only)"""
    try:
        batch = db.batch()
        for t_id in request.template_ids:
            doc_ref = db.collection('form_templates').document(t_id)
            batch.delete(doc_ref)
        batch.commit()
        return {"message": f"Successfully deleted {len(request.template_ids)} templates"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- FORM SUBMISSIONS (Layer 3) ---

@router.post("/trigger-work", response_model=List[FormSubmissionResponse])
async def trigger_work(
    request: TriggerWorkRequest,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Trigger work for a vessel: Generates submissions from templates (Staff only)"""
    try:
        # Fetch ship details
        ship_doc = db.collection('ships').document(request.vessel_id).get()
        if not ship_doc.exists:
            raise HTTPException(status_code=404, detail="Ship not found")
        ship_data = ship_doc.to_dict()

        # 1. Get Templates
        templates_to_process = []
        if request.template_ids:
             # Fetch specific templates
             for t_id in request.template_ids:
                 t_ref = db.collection('form_templates').document(t_id)
                 t_doc = t_ref.get()
                 if t_doc.exists:
                     templates_to_process.append({"id": t_doc.id, **t_doc.to_dict()})
        elif request.form_category:
            # Fallback to category
            query = db.collection('form_templates').where('category', '==', request.form_category)
            t_docs = query.stream()
            templates_to_process = [{"id": d.id, **d.to_dict()} for d in t_docs]
        
        if not templates_to_process:
             raise HTTPException(status_code=404, detail="No templates found matching criteria")

        # 2. Determine Assignees
        assignees = [] # List of {id, name}
        if request.assigned_crew_ids:
            # Fetch specific users
            from app.database import user_service
            for uid in request.assigned_crew_ids:
                u = await user_service.get_user_by_id(uid)
                if u:
                    assignees.append({"id": u.id, "name": u.name})
        elif request.assign_to_all_crew:
             # Use the new specialized method to get users for this ship
             from app.database import user_service
             crew_members = await user_service.get_users_by_ship(request.vessel_id)
             # Filter for CREW role
             crew_members = [u for u in crew_members if u.role == UserRole.CREW]
             for u in crew_members:
                 assignees.append({"id": u.id, "name": u.name})
        
        # Fallback: If no assignees found, create one "Unassigned" submission for the vessel.
        if not assignees:
            assignees.append(None)

        created_submissions = []
        now = datetime.utcnow()
        batch = db.batch()

        for template in templates_to_process:
            for assignee in assignees:
                submission_ref = db.collection('form_submissions').document()
                submission_data = {
                    "template_id": template['id'],
                    "template_name": template.get("name"),
                    "vessel_id": request.vessel_id,
                    "vessel_name": ship_data.get("name"),
                    "filled_data": {},
                    "status": FormStatus.PENDING,
                    "assigned_by": current_user.id,
                    "assigned_by_name": current_user.name,
                    "assigned_at": now,
                    "created_at": now,
                    "updated_at": now
                }
                
                if assignee:
                    submission_data["assigned_to"] = assignee["id"]
                    submission_data["assigned_to_name"] = assignee["name"]
                
                batch.set(submission_ref, submission_data)
                created_submissions.append(FormSubmissionResponse(id=submission_ref.id, **submission_data))

        batch.commit()
        return created_submissions

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def update_submission(
    submission_id: str,
    update_data: FormSubmissionUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Fill a form (Crew) or update it"""
    try:
        doc_ref = db.collection('form_submissions').document(submission_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Submission not found")
            
        current_data = doc.to_dict()
        
        # RBAC Checks
        if current_user.role == UserRole.CREW:
            # Crew can only update if assigned to their vessel AND status is pending
            if current_data['vessel_id'] != current_user.ship_id:
                raise HTTPException(status_code=403, detail="Access denied: Wrong vessel")
            if current_data['status'] != FormStatus.PENDING:
                raise HTTPException(status_code=400, detail="Cannot edit submitted forms")
                
        # Prepare Update
        updates = {"updated_at": datetime.utcnow()}
        if update_data.filled_data is not None:
            updates["filled_data"] = update_data.filled_data
            
        if update_data.status:
            # Only allow transition to SUBMITTED by Crew
            if current_user.role == UserRole.CREW and update_data.status == FormStatus.SUBMITTED:
                updates["status"] = FormStatus.SUBMITTED
                updates["submitted_by"] = current_user.id
                updates["submitted_by_name"] = current_user.name
                updates["submitted_at"] = datetime.utcnow()
            elif current_user.role in [UserRole.STAFF, UserRole.MASTER]:
                # Staff/Master can update status freely
                updates["status"] = update_data.status
            else:
                raise HTTPException(status_code=403, detail="Cannot change status")
                
        if update_data.approval_notes:
            updates["approval_notes"] = update_data.approval_notes

        doc_ref.update(updates)
        
        # Return updated
        updated_doc = doc_ref.get().to_dict()
        return FormSubmissionResponse(id=submission_id, **updated_doc)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/submissions/{submission_id}/approve", response_model=FormSubmissionResponse)
async def approve_submission(
    submission_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Approve a submission (Master only)"""
    try:
        doc_ref = db.collection('form_submissions').document(submission_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Submission not found")
            
        current_data = doc.to_dict()
        
        # Master can only approve for their current vessel (if assigned) or any if they are fleet master (assumed check)
        # Assuming Master is assigned to a ship, check logic:
        # if current_user.ship_id and current_data['vessel_id'] != current_user.ship_id:
        #     raise HTTPException(status_code=403, detail="Cannot approve for other vessels")

        if current_data['status'] != FormStatus.SUBMITTED:
             raise HTTPException(status_code=400, detail="Form is not in submitted state")

        updates = {
            "status": FormStatus.APPROVED,
            "approved_by": current_user.id,
            "approved_by_name": current_user.name,
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        doc_ref.update(updates)
        updated_doc = doc_ref.get().to_dict()
        return FormSubmissionResponse(id=submission_id, **updated_doc)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/submissions", response_model=List[FormSubmissionResponse])
async def get_submissions(
    vessel_id: Optional[str] = None,
    status: Optional[FormStatus] = None,
    template_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get submissions (RBAC filtered)"""
    try:
        query = db.collection('form_submissions')
        
        # Crew: Only their vessel
        if current_user.role == UserRole.CREW:
            if not current_user.ship_id:
                return []
            query = query.where('vessel_id', '==', current_user.ship_id)
        
        # Staff/Master: Can user filters, but Master might be restricted to their vessel
        elif current_user.role == UserRole.MASTER:
             # If Master has a specific ship_id, restrict them (optional depending on if they are Fleet Master or Vessel Master)
             # User prompt says "Master = Vessel Authority", so likely restricted.
             # However, schemas show User.ship_id is optional. Let's assume if set, enforce it.
             if current_user.ship_id:
                 query = query.where('vessel_id', '==', current_user.ship_id)
             elif vessel_id:
                 query = query.where('vessel_id', '==', vessel_id)
        
        # Staff: Full access, respect filters
        elif current_user.role == UserRole.STAFF:
            if vessel_id:
                query = query.where('vessel_id', '==', vessel_id)

        # Apply other filters
        if status:
            query = query.where('status', '==', status)
        if template_id:
            query = query.where('template_id', '==', template_id)
            
        docs = query.stream()
        submissions = [FormSubmissionResponse(id=doc.id, **doc.to_dict()) for doc in docs]
        
        # Sort by updated_at desc
        submissions.sort(key=lambda x: x.updated_at, reverse=True)
        
        return submissions

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/submissions/{submission_id}")
async def delete_submission(
    submission_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.STAFF, UserRole.MASTER]))
):
    """Delete a form submission (Staff or Master)"""
    try:
        doc_ref = db.collection('form_submissions').document(submission_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Submission not found")
            
        # Optional: Additional check to ensure Master only deletes for their ship
        if current_user.role == UserRole.MASTER and current_user.ship_id:
            data = doc.to_dict()
            if data.get('vessel_id') != current_user.ship_id:
                raise HTTPException(status_code=403, detail="Master can only delete submissions for their assigned vessel")

        doc_ref.delete()
        return {"message": "Submission deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
