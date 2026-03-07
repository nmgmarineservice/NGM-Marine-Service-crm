from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

# User and Authentication Schemas
class UserRole(str, Enum):
    MASTER = "master"
    STAFF = "staff"
    CREW = "crew"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    ship_id: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    ship_id: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    ship_id: Optional[str] = None
    ship_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    active: bool = True
    created_at: datetime
    updated_at: datetime

# Ship Schemas
class ShipStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    DOCKED = "docked"
    INACTIVE = "inactive"

class ShipType(str, Enum):
    BULK_CARRIER = "bulk_carrier"
    OIL_TANKER = "oil_tanker"
    CONTAINER_SHIP = "container_ship"
    CHEMICAL_TANKER = "chemical_tanker"

class ShipCreate(BaseModel):
    name: str
    type: ShipType
    imo_number: str
    flag_state: str
    call_sign: Optional[str] = None
    gross_tonnage: Optional[float] = None
    built_year: Optional[int] = None
    status: ShipStatus = "active"
    owner: Optional[str] = None
    operator: Optional[str] = None

class ShipUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ShipType] = None
    imo_number: Optional[str] = None
    flag_state: Optional[str] = None
    status: Optional[ShipStatus] = None
    call_sign: Optional[str] = None
    gross_tonnage: Optional[float] = None
    built_year: Optional[int] = None
    owner: Optional[str] = None
    operator: Optional[str] = None

class ShipResponse(BaseModel):
    id: str
    name: str
    type: ShipType
    imo_number: str
    flag_state: str
    call_sign: Optional[str] = None
    gross_tonnage: Optional[float] = None
    built_year: Optional[int] = None
    status: ShipStatus
    owner: Optional[str] = None
    operator: Optional[str] = None
    crew_count: int = 0
    created_at: datetime
    updated_at: datetime

# PMS (Planned Maintenance System) Schemas
class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    APPROVED = "approved"
    REJECTED = "rejected"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class MaintenanceFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

class PMSTaskCreate(BaseModel):
    ship_id: str
    equipment_name: str
    task_description: str
    frequency: str = "monthly"
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: Optional[str] = None
    due_date: str  # Accept date string like "2024-01-15"
    estimated_hours: Optional[float] = None
    instructions: Optional[str] = None
    safety_notes: Optional[str] = None
    
    @field_validator('due_date')
    @classmethod
    def parse_due_date(cls, v):
        """Accept various date formats"""
        if isinstance(v, datetime):
            return v.isoformat()
        if isinstance(v, date):
            return datetime.combine(v, datetime.min.time()).isoformat()
        # Try to parse string
        if isinstance(v, str):
            # If it's just a date like "2024-01-15", add time
            if len(v) == 10 and '-' in v:
                return f"{v}T00:00:00"
            return v
        return v

class PMSTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    assigned_to: Optional[str] = None
    ship_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    completion_notes: Optional[str] = None
    actual_hours: Optional[float] = None
    photos: Optional[List[str]] = None

class PMSTaskResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    equipment_name: str
    task_description: str
    frequency: MaintenanceFrequency
    priority: TaskPriority
    status: TaskStatus
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_date: datetime
    completed_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    instructions: Optional[str] = None
    safety_notes: Optional[str] = None
    completion_notes: Optional[str] = None
    photos: List[str] = []
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Crew Daily Logs Schemas
class LogType(str, Enum):
    ENGINE_MAINTENANCE = "engine_maintenance"
    DECK_WORK = "deck_work"
    SAFETY_INSPECTION = "safety_inspection"
    CLEANING = "cleaning"
    REPAIR_WORK = "repair_work"
    INVENTORY_CHECK = "inventory_check"
    OTHER = "other"

class LogStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class CrewLogCreate(BaseModel):
    ship_id: str
    log_date: datetime
    log_type: LogType
    description: str
    hours_worked: float
    photos: List[str] = []
    remarks: Optional[str] = None

class CrewLogUpdate(BaseModel):
    status: Optional[LogStatus] = None
    approval_notes: Optional[str] = None

class CrewLogResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    user_id: str
    user_name: str
    log_date: datetime
    log_type: LogType
    description: str
    hours_worked: float
    status: LogStatus
    photos: List[str] = []
    remarks: Optional[str] = None
    approved_by: Optional[str] = None
    approval_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Invoice Management Schemas
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"

class InvoiceCategory(str, Enum):
    FUEL = "fuel"
    MAINTENANCE = "maintenance"
    PROVISIONS = "provisions"
    PORT_FEES = "port_fees"
    CREW_WAGES = "crew_wages"
    INSURANCE = "insurance"
    OTHER = "other"

class InvoiceCreate(BaseModel):
    ship_id: str
    invoice_number: Optional[str] = None
    vendor_name: str
    category: InvoiceCategory
    amount: float
    currency: str = "USD"
    description: Optional[str] = None
    due_date: str  # Accept string date format
    attachments: List[str] = []
    remarks: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    remarks: Optional[str] = None
    approval_notes: Optional[str] = None
    paid_date: Optional[datetime] = None

class InvoiceResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    invoice_number: str
    vendor_name: str
    category: InvoiceCategory
    amount: float
    currency: str
    description: str
    status: InvoiceStatus
    due_date: datetime
    paid_date: Optional[datetime] = None
    attachments: List[str] = []
    remarks: Optional[str] = None
    created_by: str
    created_by_name: str
    approved_by: Optional[str] = None
    approval_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Dashboard and Analytics Schemas
class ShipStats(BaseModel):
    ship_id: str
    ship_name: str
    crew_count: int
    pending_pms_tasks: int
    overdue_pms_tasks: int
    pending_crew_logs: int
    pending_invoices: int
    total_invoice_amount: float

class FleetSummary(BaseModel):
    total_ships: int
    active_ships: int
    total_crew: int
    pending_pms_tasks: int
    pending_approvals: int
    monthly_expenses: float
    ships_stats: List[ShipStats]

# Notification Schemas
class NotificationType(str, Enum):
    PMS_DUE = "pms_due"
    PMS_OVERDUE = "pms_overdue"
    LOG_APPROVAL = "log_approval"
    INVOICE_APPROVAL = "invoice_approval"
    SYSTEM_ALERT = "system_alert"

class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None
    metadata: Dict[str, Any] = {}

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    read: bool = False
    created_at: datetime

# Incident Schemas
class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentType(str, Enum):
    SAFETY = "safety"
    EQUIPMENT = "equipment"
    ENVIRONMENTAL = "environmental"
    SECURITY = "security"
    MEDICAL = "medical"
    NEAR_MISS = "near_miss"

class IncidentStatus(str, Enum):
    REPORTED = "reported"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"

class IncidentCreate(BaseModel):
    ship_id: str
    title: str
    description: str
    incident_type: str = "safety"
    severity: str = "medium"
    location: str
    date_time: str
    injuries: bool = False
    witnesses: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    investigation_notes: Optional[str] = None
    corrective_actions: Optional[str] = None
    resolved_date: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    title: str
    description: str
    incident_type: str
    severity: str
    status: str
    location: str
    date_time: datetime
    injuries: bool
    witnesses: Optional[str] = None
    reported_by: str
    reported_by_name: str
    investigation_notes: Optional[str] = None
    corrective_actions: Optional[str] = None
    resolved_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Audit Schemas
class AuditType(str, Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"
    FLAG_STATE = "flag_state"
    CLASS = "class"
    PSC = "psc"

class AuditStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class AuditCreate(BaseModel):
    ship_id: str
    audit_type: str = "internal"
    title: str
    description: Optional[str] = None
    scheduled_date: str
    auditor: Optional[str] = None

class AuditUpdate(BaseModel):
    status: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    completed_date: Optional[str] = None

class AuditResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    audit_type: str
    title: str
    description: Optional[str] = None
    status: str
    scheduled_date: datetime
    completed_date: Optional[datetime] = None
    auditor: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime

# Cargo Operations Schemas
class CargoType(str, Enum):
    LOADING = "loading"
    UNLOADING = "unloading"
    TRANSFER = "transfer"

class CargoStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CargoCreate(BaseModel):
    ship_id: str
    cargo_type: str = "loading"
    cargo_name: str
    quantity: float
    unit: str = "MT"
    port: str
    scheduled_date: str
    notes: Optional[str] = None

class CargoUpdate(BaseModel):
    status: Optional[str] = None
    actual_quantity: Optional[float] = None
    completed_date: Optional[str] = None
    notes: Optional[str] = None

class CargoResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    cargo_type: str
    cargo_name: str
    quantity: float
    actual_quantity: Optional[float] = None
    unit: str
    port: str
    status: str
    scheduled_date: datetime
    completed_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime

# Work Log Schemas
class WorkLogStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class WorkLogCreate(BaseModel):
    ship_id: str
    date: date
    task_type: str
    description: str
    hours_worked: float
    photo_url: Optional[str] = None

class WorkLogUpdate(BaseModel):
    status: Optional[WorkLogStatus] = None
    remarks: Optional[str] = None

class WorkLogResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    crew_id: str
    crew_name: str
    date: date
    task_type: str
    description: str
    hours_worked: float
    status: WorkLogStatus
    photo_url: Optional[str] = None
    remarks: Optional[str] = None
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Bunkering Schemas
class BunkeringStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class FuelType(str, Enum):
    VLSFO = "vlsfo"
    HFO = "hfo"
    MGO = "mgo"
    LSMGO = "lsmgo"

class BunkeringCreate(BaseModel):
    ship_id: str
    port: str
    supplier: str
    fuel_type: FuelType
    quantity: float
    scheduled_date: datetime
    cost_per_mt: float
    officer_in_charge: Optional[str] = None
    remarks: Optional[str] = None

class BunkeringUpdate(BaseModel):
    status: Optional[BunkeringStatus] = None
    quantity: Optional[float] = None
    cost_per_mt: Optional[float] = None
    checklist_completed: Optional[bool] = None
    sample_taken: Optional[bool] = None
    remarks: Optional[str] = None

class BunkeringResponse(BaseModel):
    id: str
    ship_id: str
    ship_name: str
    port: str
    supplier: str
    fuel_type: FuelType
    quantity: float
    scheduled_date: datetime
    completed_date: Optional[datetime] = None
    status: BunkeringStatus
    cost_per_mt: float
    total_cost: float
    officer_in_charge: Optional[str] = None
    checklist_completed: bool = False
    sample_taken: bool = False
    remarks: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime

# Recruitment Schemas
class RecruitmentStage(str, Enum):
    APPLIED = "applied"
    SHORTLISTED_1 = "shortlisted1"
    SHORTLISTED_2 = "shortlisted2"
    FINAL = "final"
    PREJOINING = "prejoining"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class CandidateSource(str, Enum):
    WEBSITE = "Website"
    AGENT = "Agent"
    REFERRAL = "Referral"
    DIRECT = "Direct"

class CandidateCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    rank: str
    experience: str
    vessel_id: Optional[str] = None
    source: CandidateSource
    stage: RecruitmentStage = RecruitmentStage.APPLIED
    notes: Optional[str] = None

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rank: Optional[str] = None
    experience: Optional[str] = None
    vessel_id: Optional[str] = None
    source: Optional[CandidateSource] = None
    stage: Optional[RecruitmentStage] = None
    notes: Optional[str] = None

class CandidateResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    rank: str
    experience: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    source: CandidateSource
    stage: RecruitmentStage
    notes: Optional[str] = None
    initials: str
    created_at: datetime
    updated_at: datetime

# DG Communication Schemas
class DGCommunicationType(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"

class DGCommunicationStatus(str, Enum):
    PENDING = "pending"
    ACTION_REQUIRED = "action_required"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class DGCommunicationCategory(str, Enum):
    TRAINING = "training"
    MANNING = "manning"
    SAFETY = "safety"
    MEDICAL = "medical"
    DISPUTE = "dispute"
    CERTIFICATION = "certification"
    INSPECTION = "inspection"
    COMPLIANCE = "compliance"
    OTHER = "other"

class DGCommunicationCreate(BaseModel):
    comm_type: DGCommunicationType
    subject: str
    content: str
    category: DGCommunicationCategory
    dg_office: str
    ship_id: Optional[str] = None
    crew_id: Optional[str] = None
    priority: Optional[str] = "normal"
    due_date: Optional[datetime] = None
    attachments: Optional[List[str]] = []

class DGCommunicationUpdate(BaseModel):
    subject: Optional[str] = None
    content: Optional[str] = None
    category: Optional[DGCommunicationCategory] = None
    status: Optional[DGCommunicationStatus] = None
    dg_office: Optional[str] = None
    ship_id: Optional[str] = None
    crew_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    response: Optional[str] = None
    attachments: Optional[List[str]] = None

class DGCommunicationResponse(BaseModel):
    id: str
    ref_no: str
    comm_type: DGCommunicationType
    subject: str
    content: str
    category: DGCommunicationCategory
    status: DGCommunicationStatus
    dg_office: str
    ship_id: Optional[str] = None
    ship_name: Optional[str] = None
    crew_id: Optional[str] = None
    crew_name: Optional[str] = None
    priority: str = "normal"
    due_date: Optional[datetime] = None
    response: Optional[str] = None
    response_date: Optional[datetime] = None
    attachments: List[str] = []
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime

class DGResponseCreate(BaseModel):
    response: str
    mark_completed: bool = False

# Client Management Schemas
class ClientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class ClientCreate(BaseModel):
    name: str
    company: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    status: Optional[ClientStatus] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    name: str
    company: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    status: ClientStatus
    vessels_count: int = 0
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

from .documents import *
from .onboarding import *
