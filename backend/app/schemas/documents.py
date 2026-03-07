from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums
class ManualType(str, Enum):
    FPM = "FPM" # Fleet Procedures Manual
    SMM = "SMM" # Safety Management Manual
    CPM = "CPM" # Company Procedures Manual
    OTHER = "Other"

class FormCategory(str, Enum):
    CHECKLIST = "Checklist"
    REPORT = "Report"
    ISM = "ISM"
    PMS = "PMS"
    HR = "HR"

class FormStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"

class ScheduleFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALFYEARLY = "halfyearly"
    YEARLY = "yearly"

class AssignedRole(str, Enum):
    CREW = "crew"
    STAFF = "staff"
    MASTER = "master"

# Shared Models
class FormField(BaseModel):
    id: str
    label: str
    type: str # text, number, date, boolean, select, signature, photo, table
    required: bool = False
    options: Optional[List[str]] = None # For select inputs
    default_value: Optional[Any] = None
    columns: Optional[List['FormField']] = None # For Table type definitions

FormField.update_forward_refs()

# Manuals (Layer 1)
class ManualCreate(BaseModel):
    title: str
    manual_type: ManualType
    version: str
    file_url: str
    description: Optional[str] = None

class ManualUpdate(BaseModel):
    title: Optional[str] = None
    manual_type: Optional[ManualType] = None
    version: Optional[str] = None
    file_url: Optional[str] = None
    description: Optional[str] = None

class ManualResponse(BaseModel):
    id: str
    title: str
    manual_type: ManualType
    version: str
    file_url: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

# Form Templates (Layer 2)
class FormTemplateCreate(BaseModel):
    name: str
    category: FormCategory
    description: Optional[str] = None
    fields: List[FormField]
    approval_required: bool = True
    manual_reference_id: Optional[str] = None # Link to source manual
    scheduled: ScheduleFrequency = ScheduleFrequency.WEEKLY
    role: AssignedRole = AssignedRole.CREW
    spreadsheet_data: Optional[Dict[str, Any]] = None
    document_data: Optional[Dict[str, Any]] = None

class FormTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[FormCategory] = None
    description: Optional[str] = None
    fields: Optional[List[FormField]] = None
    approval_required: Optional[bool] = None
    manual_reference_id: Optional[str] = None
    scheduled: Optional[ScheduleFrequency] = None
    role: Optional[AssignedRole] = None
    spreadsheet_data: Optional[Dict[str, Any]] = None
    document_data: Optional[Dict[str, Any]] = None

class FormTemplateResponse(BaseModel):
    id: str
    name: str
    category: FormCategory
    description: Optional[str] = None
    fields: List[FormField]
    approval_required: bool
    manual_reference_id: Optional[str] = None
    scheduled: ScheduleFrequency
    role: AssignedRole
    spreadsheet_data: Optional[Dict[str, Any]] = None
    document_data: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

# Form Submissions (Layer 3)
class FormSubmissionCreate(BaseModel):
    template_id: str
    vessel_id: str
    # Initial data might be empty or partial
    filled_data: Dict[str, Any] = {} 

class FormSubmissionUpdate(BaseModel):
    filled_data: Optional[Dict[str, Any]] = None
    status: Optional[FormStatus] = None
    approval_notes: Optional[str] = None

class FormSubmissionResponse(BaseModel):
    id: str
    template_id: str
    template_name: str # De-normalized for convenience
    vessel_id: str
    vessel_name: str # De-normalized
    filled_data: Dict[str, Any]
    status: FormStatus
    # Assignment fields
    assigned_to: Optional[str] = None  # User ID who this is assigned to
    assigned_to_name: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_by_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    # Submission fields
    submitted_by: Optional[str] = None # Crew ID
    submitted_by_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    # Approval fields
    reviewed_by: Optional[str] = None # Master/Staff ID
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    # Metadata
    created_at: datetime
    updated_at: datetime

# Trigger Logic Input
class TriggerWorkRequest(BaseModel):
    vessel_id: str
    form_category: Optional[FormCategory] = None # Legacy filter
    template_ids: Optional[List[str]] = None # Specific templates
    assigned_crew_ids: Optional[List[str]] = None # Specific crew members
    assign_to_all_crew: bool = False # Flag to assign to all crew on ship

class BulkDeleteRequest(BaseModel):
    template_ids: List[str]
