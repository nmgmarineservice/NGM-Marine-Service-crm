export enum ManualType {
    FPM = "FPM", // Fleet Procedures Manual
    SMM = "SMM", // Safety Management Manual
    CPM = "CPM", // Company Procedures Manual
    OTHER = "Other"
}

export enum FormCategory {
    CHECKLIST = "Checklist",
    REPORT = "Report",
    ISM = "ISM",
    PMS = "PMS",
    HR = "HR"
}

export enum FormStatus {
    PENDING = "pending",
    SUBMITTED = "submitted",
    APPROVED = "approved",
    REJECTED = "rejected",
    FLAGGED = "flagged"
}

export enum ScheduleFrequency {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    HALFYEARLY = "halfyearly",
    YEARLY = "yearly"
}

export enum AssignedRole {
    CREW = "crew",
    STAFF = "staff",
    MASTER = "master"
}

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'signature' | 'photo' | 'table' | 'grid';
    required: boolean;
    options?: string[];
    default_value?: any;
    columns?: FormField[]; // For Table type definitions
}

export interface Manual {
    id: string;
    title: string;
    manual_type: ManualType;
    version: string;
    file_url: string;
    description?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface FormTemplate {
    id: string;
    name: string;
    category: FormCategory;
    description?: string;
    fields: FormField[];
    spreadsheet_data?: any;
    document_data?: any;
    approval_required: boolean;
    manual_reference_id?: string;
    scheduled: ScheduleFrequency;
    role: AssignedRole;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface FormSubmission {
    id: string;
    template_id: string;
    template_name: string;
    vessel_id: string;
    vessel_name: string;
    filled_data: Record<string, any>;
    status: FormStatus;
    // Assignment fields
    assigned_to?: string;
    assigned_to_name?: string;
    assigned_by?: string;
    assigned_by_name?: string;
    assigned_at?: string;
    // Submission fields
    submitted_by?: string;
    submitted_by_name?: string;
    submitted_at?: string;
    // Approval fields
    reviewed_by?: string;
    reviewed_by_name?: string;
    reviewed_at?: string;
    approval_notes?: string;
    // Metadata
    created_at: string;
    updated_at: string;
}

export interface TriggerWorkRequest {
    vessel_id: string;
    form_category?: FormCategory;
    template_ids?: string[];
    assigned_crew_ids?: string[];
    assign_to_all_crew?: boolean;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: AssignedRole;
    ship_id?: string;
    active: boolean;
}
