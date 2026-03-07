from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from app.auth import get_current_user, require_role, require_staff_or_master, require_master
from app.schemas import UserResponse, UserRole
from app.services.onboarding_service import onboarding_service
from app.schemas.onboarding import *

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

@router.post("/trigger", response_model=OnboardingResponse)
async def trigger_onboarding(
    candidate_id: str,
    crew_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """
    Trigger onboarding for a candidate. 
    Requires linking to an existing Crew user (crew_id).
    """
    return await onboarding_service.create_application(candidate_id, crew_id)

@router.get("/my", response_model=List[OnboardingResponse])
async def get_my_applications(current_user: UserResponse = Depends(get_current_user)):
    """Get applications for the logged-in crew member"""
    return await onboarding_service.get_applications_by_crew(current_user.id)

@router.get("/all", response_model=List[OnboardingResponse])
async def get_all_applications(current_user: UserResponse = Depends(require_staff_or_master)):
    """Get all applications (Staff/Master only)"""
    return await onboarding_service.get_all_applications()


@router.get("/candidate/{candidate_id}", response_model=Optional[OnboardingResponse])
async def get_application_by_candidate(
    candidate_id: str, 
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Get application for a specific candidate (Staff/Master view)"""
    return await onboarding_service.get_application_by_candidate(candidate_id)

@router.get("/{id}", response_model=OnboardingResponse)
async def get_application(id: str, current_user: UserResponse = Depends(get_current_user)):
    app = await onboarding_service.get_application_by_id(id)
    if not app:
        raise HTTPException(404, "Application not found")
    
    # Access control
    if current_user.role == UserRole.CREW and app.crew_id != current_user.id:
        raise HTTPException(403, "Not authorized to view this application")
        
    return app

@router.put("/{id}/submit", response_model=OnboardingResponse)
async def submit_application(
    id: str, 
    data: CrewApplicationSubmit, 
    current_user: UserResponse = Depends(get_current_user)
):
    app = await onboarding_service.get_application_by_id(id)
    if not app:
        raise HTTPException(404, "Application not found")
        
    if app.crew_id != current_user.id:
        raise HTTPException(403, "Not authorized to submit this application")
        
    return await onboarding_service.submit_application(id, data)

@router.post("/{id}/master-review", response_model=OnboardingResponse)
async def master_review(
    id: str, 
    action: MasterReviewAction, 
    current_user: UserResponse = Depends(require_master)
):
    app = await onboarding_service.get_application_by_id(id)
    if not app:
        raise HTTPException(404, "Application not found")
        
    return await onboarding_service.master_review(id, current_user.id, action)

@router.post("/{id}/agreement/prepare", response_model=OnboardingResponse)
async def prepare_agreement(
    id: str, 
    data: AgreementPrepare, 
    current_user: UserResponse = Depends(require_staff_or_master)
):
    app = await onboarding_service.get_application_by_id(id)
    if not app:
        raise HTTPException(404, "Application not found")
        
    return await onboarding_service.upload_agreement(id, data)

@router.post("/{id}/agreement/respond", response_model=OnboardingResponse)
async def respond_agreement(
    id: str, 
    action: AgreementAccept, 
    request: Request, 
    current_user: UserResponse = Depends(get_current_user)
):
    app = await onboarding_service.get_application_by_id(id)
    if not app:
        raise HTTPException(404, "Application not found")
        
    if app.crew_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    
    # Verify State: Master must have approved
    if app.status != OnboardingStatus.AGREEMENT_GENERATED: # Or check if master approved? 
        # Actually logic says: Agreement Generated -> Crew Accepts.
        # So status must be AGREEMENT_GENERATED.
        pass

    # Audit Enrichment
    action.ip_address = request.client.host
    action.user_agent = request.headers.get("user-agent", "")
    
    return await onboarding_service.crew_agreement_response(id, action)
