from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class OnboardingStatus(str, Enum):
    PENDING_SUBMISSION = "pending_submission"
    SUBMITTED = "crew_onboarding_submitted"
    APPROVED_BY_MASTER = "crew_onboarding_approved_by_master"
    REJECTED_BY_MASTER = "rejected_by_master"
    AGREEMENT_UPLOADED = "agreement_uploaded" # Agreement uploaded by staff
    AGREEMENT_DOWNLOADED = "agreement_downloaded_by_crew"

class CrewApplicationSubmit(BaseModel):
    application_data: Dict[str, Any]
    documents: List[str] = []

class MasterReviewAction(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class AgreementPrepare(BaseModel):
    agreement_url: str
    vessel_name: str
    crew_name: str
    rank: str
    joining_date: datetime
    contract_duration: str

class AgreementAccept(BaseModel):
    accepted: bool
    ip_address: str
    user_agent: str

class OnboardingResponse(BaseModel):
    id: str
    candidate_id: str
    crew_id: str
    status: OnboardingStatus
    
    application_data: Dict[str, Any] = {}
    documents: List[str] = []
    
    master_approval_date: Optional[datetime] = None
    master_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    agreement_url: Optional[str] = None
    agreement_details: Optional[Dict[str, Any]] = None
    
    accepted_at: Optional[datetime] = None
    accepted_ip: Optional[str] = None
    accepted_user_agent: Optional[str] = None
    agreement_version_id: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
