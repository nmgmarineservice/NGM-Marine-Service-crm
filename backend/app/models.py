from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
from app.schemas import UserRole, ShipStatus, ShipType, TaskStatus, TaskPriority, MaintenanceFrequency
from app.schemas import LogType, LogStatus, InvoiceStatus, InvoiceCategory, NotificationType, WorkLogStatus, BunkeringStatus, FuelType
from app.schemas import RecruitmentStage, CandidateSource
from app.schemas import DGCommunicationType, DGCommunicationStatus, DGCommunicationCategory
from app.schemas import ClientStatus
from app.schemas import FormCategory, ScheduleFrequency, AssignedRole
from app.schemas import OnboardingStatus


def safe_enum_convert(enum_class, value, default=None):
    """
    Safely convert a string value to an enum, handling both uppercase and lowercase.
    This handles cases where Firestore data might have uppercase enum names instead of values.
    """
    if value is None:
        return default
    
    if isinstance(value, enum_class):
        return value
    
    if isinstance(value, str):
        # First try the value as-is (lowercase like "active")
        try:
            return enum_class(value)
        except ValueError:
            pass
        
        # Try lowercase version
        try:
            return enum_class(value.lower())
        except ValueError:
            pass
        
        # Try getting by name (uppercase like "ACTIVE")
        try:
            return enum_class[value.upper()]
        except (KeyError, ValueError):
            pass
    
    # Return default if all else fails
    return default

class BaseModel:
    """Base model with common fields"""
    def __init__(self, **kwargs):
        self.id: str = kwargs.get('id', '')
        self.created_at: datetime = kwargs.get('created_at', datetime.now())
        self.updated_at: datetime = kwargs.get('updated_at', datetime.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for Firestore"""
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, datetime):
                result[key] = value
            elif isinstance(value, Enum):
                result[key] = value.value
            else:
                result[key] = value
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any], doc_id: str = None):
        """Create model instance from Firestore document"""
        if doc_id:
            data['id'] = doc_id
        return cls(**data)

class User(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.email: str = kwargs.get('email', '')
        self.name: str = kwargs.get('name', '')
        self.role: UserRole = safe_enum_convert(UserRole, kwargs.get('role'), UserRole.CREW)
        self.ship_id: Optional[str] = kwargs.get('ship_id')
        self.phone: Optional[str] = kwargs.get('phone')
        self.position: Optional[str] = kwargs.get('position')
        self.active: bool = kwargs.get('active', True)
        self.firebase_uid: str = kwargs.get('firebase_uid', '')

class Ship(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name: str = kwargs.get('name', '')
        self.type: ShipType = safe_enum_convert(ShipType, kwargs.get('type'), ShipType.BULK_CARRIER)
        self.imo_number: str = kwargs.get('imo_number', '')
        self.flag_state: str = kwargs.get('flag_state', '')
        self.call_sign: Optional[str] = kwargs.get('call_sign')
        self.gross_tonnage: Optional[float] = kwargs.get('gross_tonnage')
        self.built_year: Optional[int] = kwargs.get('built_year')
        self.status: ShipStatus = safe_enum_convert(ShipStatus, kwargs.get('status'), ShipStatus.ACTIVE)
        self.owner: Optional[str] = kwargs.get('owner')
        self.operator: Optional[str] = kwargs.get('operator')

class PMSTask(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ship_id: str = kwargs.get('ship_id', '')
        self.equipment_name: str = kwargs.get('equipment_name', '')
        self.task_description: str = kwargs.get('task_description', '')
        self.frequency: MaintenanceFrequency = safe_enum_convert(MaintenanceFrequency, kwargs.get('frequency'), MaintenanceFrequency.MONTHLY)
        self.priority: TaskPriority = safe_enum_convert(TaskPriority, kwargs.get('priority'), TaskPriority.MEDIUM)
        self.status: TaskStatus = safe_enum_convert(TaskStatus, kwargs.get('status'), TaskStatus.PENDING)
        self.assigned_to: Optional[str] = kwargs.get('assigned_to')
        self.due_date: datetime = kwargs.get('due_date', datetime.now())
        self.completed_date: Optional[datetime] = kwargs.get('completed_date')
        self.estimated_hours: Optional[float] = kwargs.get('estimated_hours')
        self.actual_hours: Optional[float] = kwargs.get('actual_hours')
        self.instructions: Optional[str] = kwargs.get('instructions')
        self.safety_notes: Optional[str] = kwargs.get('safety_notes')
        self.completion_notes: Optional[str] = kwargs.get('completion_notes')
        self.photos: List[str] = kwargs.get('photos', [])
        self.created_by: str = kwargs.get('created_by', '')
        self.approved_by: Optional[str] = kwargs.get('approved_by')

class CrewLog(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ship_id: str = kwargs.get('ship_id', '')
        self.user_id: str = kwargs.get('user_id', '')
        self.log_date: datetime = kwargs.get('log_date', datetime.now())
        self.log_type: LogType = safe_enum_convert(LogType, kwargs.get('log_type'), LogType.OTHER)
        self.description: str = kwargs.get('description', '')
        self.hours_worked: float = kwargs.get('hours_worked', 0.0)
        self.status: LogStatus = safe_enum_convert(LogStatus, kwargs.get('status'), LogStatus.PENDING)
        self.photos: List[str] = kwargs.get('photos', [])
        self.remarks: Optional[str] = kwargs.get('remarks')
        self.approved_by: Optional[str] = kwargs.get('approved_by')
        self.approval_notes: Optional[str] = kwargs.get('approval_notes')

class FormTemplate(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name: str = kwargs.get('name', '')
        self.category: FormCategory = safe_enum_convert(FormCategory, kwargs.get('category'), FormCategory.CHECKLIST)
        self.description: Optional[str] = kwargs.get('description')
        self.fields: List[Dict[str, Any]] = kwargs.get('fields', [])
        # Spreadsheet Integration
        self.spreadsheet_data: Optional[Dict[str, Any]] = kwargs.get('spreadsheet_data')
        
        self.approval_required: bool = kwargs.get('approval_required', True)
        self.manual_reference_id: Optional[str] = kwargs.get('manual_reference_id')
        self.scheduled: ScheduleFrequency = safe_enum_convert(ScheduleFrequency, kwargs.get('scheduled'), ScheduleFrequency.WEEKLY)
        self.role: AssignedRole = safe_enum_convert(AssignedRole, kwargs.get('role'), AssignedRole.CREW)
        self.created_by: str = kwargs.get('created_by', '')

def parse_date_string(date_val) -> datetime:
    """Parse various date formats to datetime"""
    if date_val is None:
        return datetime.now()
    if isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, str):
        try:
            # Try ISO format with T separator
            if 'T' in date_val:
                return datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            # Try simple date format YYYY-MM-DD
            return datetime.strptime(date_val, '%Y-%m-%d')
        except:
            return datetime.now()
    return datetime.now()

class Invoice(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ship_id: str = kwargs.get('ship_id', '')
        self.invoice_number: str = kwargs.get('invoice_number', '')
        self.vendor_name: str = kwargs.get('vendor_name', '')
        self.category: InvoiceCategory = safe_enum_convert(InvoiceCategory, kwargs.get('category'), InvoiceCategory.OTHER)
        self.amount: float = kwargs.get('amount', 0.0)
        self.currency: str = kwargs.get('currency', 'USD')
        self.description: str = kwargs.get('description', '') or ''
        self.status: InvoiceStatus = safe_enum_convert(InvoiceStatus, kwargs.get('status'), InvoiceStatus.DRAFT)
        self.due_date: datetime = parse_date_string(kwargs.get('due_date'))
        self.paid_date: Optional[datetime] = kwargs.get('paid_date')
        self.attachments: List[str] = kwargs.get('attachments', [])
        self.remarks: Optional[str] = kwargs.get('remarks')
        self.created_by: str = kwargs.get('created_by', '')
        self.approved_by: Optional[str] = kwargs.get('approved_by')
        self.approval_notes: Optional[str] = kwargs.get('approval_notes')

class Notification(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.user_id: str = kwargs.get('user_id', '')
        self.type: NotificationType = safe_enum_convert(NotificationType, kwargs.get('type'), NotificationType.SYSTEM_ALERT)
        self.title: str = kwargs.get('title', '')
        self.message: str = kwargs.get('message', '')
        self.related_id: Optional[str] = kwargs.get('related_id')
        self.metadata: Dict[str, Any] = kwargs.get('metadata', {})
        self.read: bool = kwargs.get('read', False)

class WorkLog(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ship_id: str = kwargs.get('ship_id', '')
        self.crew_id: str = kwargs.get('crew_id', '')
        self.date: datetime = kwargs.get('date', datetime.now())
        self.task_type: str = kwargs.get('task_type', '')
        self.description: str = kwargs.get('description', '')
        self.hours_worked: float = kwargs.get('hours_worked', 0.0)
        self.status: WorkLogStatus = safe_enum_convert(WorkLogStatus, kwargs.get('status'), WorkLogStatus.PENDING)
        self.photo_url: Optional[str] = kwargs.get('photo_url')
        self.remarks: Optional[str] = kwargs.get('remarks')
        self.approved_by: Optional[str] = kwargs.get('approved_by')
        self.approved_at: Optional[datetime] = kwargs.get('approved_at')

class Bunkering(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ship_id: str = kwargs.get('ship_id', '')
        self.port: str = kwargs.get('port', '')
        self.supplier: str = kwargs.get('supplier', '')
        self.fuel_type: FuelType = safe_enum_convert(FuelType, kwargs.get('fuel_type'), FuelType.VLSFO)
        self.quantity: float = kwargs.get('quantity', 0.0)
        self.scheduled_date: datetime = kwargs.get('scheduled_date', datetime.now())
        self.completed_date: Optional[datetime] = kwargs.get('completed_date')
        self.status: BunkeringStatus = safe_enum_convert(BunkeringStatus, kwargs.get('status'), BunkeringStatus.SCHEDULED)
        self.cost_per_mt: float = kwargs.get('cost_per_mt', 0.0)
        self.officer_in_charge: Optional[str] = kwargs.get('officer_in_charge')
        self.checklist_completed: bool = kwargs.get('checklist_completed', False)
        self.sample_taken: bool = kwargs.get('sample_taken', False)
        self.remarks: Optional[str] = kwargs.get('remarks')
        self.created_by: str = kwargs.get('created_by', '')

class Candidate(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name: str = kwargs.get('name', '')
        self.email: Optional[str] = kwargs.get('email')
        self.phone: Optional[str] = kwargs.get('phone')
        self.rank: str = kwargs.get('rank', '')
        self.experience: str = kwargs.get('experience', '')
        self.vessel_id: Optional[str] = kwargs.get('vessel_id')
        self.source: CandidateSource = safe_enum_convert(CandidateSource, kwargs.get('source'), CandidateSource.WEBSITE)
        self.stage: RecruitmentStage = safe_enum_convert(RecruitmentStage, kwargs.get('stage'), RecruitmentStage.APPLIED)
        self.notes: Optional[str] = kwargs.get('notes')

class DGCommunication(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ref_no: str = kwargs.get('ref_no', '')
        self.comm_type: DGCommunicationType = safe_enum_convert(DGCommunicationType, kwargs.get('comm_type'), DGCommunicationType.INCOMING)
        self.subject: str = kwargs.get('subject', '')
        self.content: str = kwargs.get('content', '')
        self.category: DGCommunicationCategory = safe_enum_convert(DGCommunicationCategory, kwargs.get('category'), DGCommunicationCategory.OTHER)
        self.status: DGCommunicationStatus = safe_enum_convert(DGCommunicationStatus, kwargs.get('status'), DGCommunicationStatus.PENDING)
        self.dg_office: str = kwargs.get('dg_office', '')
        self.ship_id: Optional[str] = kwargs.get('ship_id')
        self.crew_id: Optional[str] = kwargs.get('crew_id')
        self.priority: str = kwargs.get('priority', 'normal')
        self.due_date: Optional[datetime] = kwargs.get('due_date')
        self.response: Optional[str] = kwargs.get('response')
        self.response_date: Optional[datetime] = kwargs.get('response_date')
        self.attachments: List[str] = kwargs.get('attachments', [])
        self.created_by: str = kwargs.get('created_by', '')

class Client(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name: str = kwargs.get('name', '')
        self.company: str = kwargs.get('company', '')
        self.contact_person: str = kwargs.get('contact_person', '')
        self.email: str = kwargs.get('email', '')
        self.phone: Optional[str] = kwargs.get('phone')
        self.address: Optional[str] = kwargs.get('address')
        self.country: Optional[str] = kwargs.get('country')
        self.contract_start: Optional[datetime] = kwargs.get('contract_start')
        self.contract_end: Optional[datetime] = kwargs.get('contract_end')
        self.status: ClientStatus = safe_enum_convert(ClientStatus, kwargs.get('status'), ClientStatus.ACTIVE)
        self.notes: Optional[str] = kwargs.get('notes')
        self.created_by: str = kwargs.get('created_by', '')

class CrewOnboarding(BaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.candidate_id: str = kwargs.get('candidate_id', '')
        self.crew_id: str = kwargs.get('crew_id', '')
        self.status: OnboardingStatus = safe_enum_convert(OnboardingStatus, kwargs.get('status'), OnboardingStatus.PENDING_SUBMISSION)
        
        self.application_data: Dict[str, Any] = kwargs.get('application_data', {})
        self.documents: List[str] = kwargs.get('documents', [])
        
        self.master_approval_date: Optional[datetime] = kwargs.get('master_approval_date')
        self.master_id: Optional[str] = kwargs.get('master_id')
        self.rejection_reason: Optional[str] = kwargs.get('rejection_reason')
        
        self.agreement_url: Optional[str] = kwargs.get('agreement_url')
        self.agreement_details: Optional[Dict[str, Any]] = kwargs.get('agreement_details')
        
        self.accepted_at: Optional[datetime] = kwargs.get('accepted_at')
        self.accepted_ip: Optional[str] = kwargs.get('accepted_ip')
        self.accepted_user_agent: Optional[str] = kwargs.get('accepted_user_agent')
        self.agreement_version_id: Optional[str] = kwargs.get('agreement_version_id')
