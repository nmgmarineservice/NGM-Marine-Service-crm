import { API_BASE_URL } from '../firebase';
import { auth } from '../firebase';

// Base API configuration
const API_URL = API_BASE_URL + '/api/v1';

// API response types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Get auth token for API calls
const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

// Base API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = await getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.detail || 'An error occurred',
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
};

// User API
export const userApi = {
  getCurrentUser: () => apiRequest<UserResponse>('/users/me'),

  getAllUsers: (skip = 0, limit = 100) =>
    apiRequest<UserResponse[]>(`/users?skip=${skip}&limit=${limit}`),

  getUserById: (userId: string) =>
    apiRequest<UserResponse>(`/users/${userId}`),

  createUser: (userData: UserCreate) =>
    apiRequest<UserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (userId: string, userData: UserUpdate) =>
    apiRequest<UserResponse>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deleteUser: (userId: string) =>
    apiRequest<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    }),

  getUsersByShip: (shipId: string) =>
    apiRequest<UserResponse[]>(`/users/ship/${shipId}`),
};

// Ships API
export const shipsApi = {
  getAllShips: () => apiRequest<ShipResponse[]>('/ships'),

  getShipById: (shipId: string) =>
    apiRequest<ShipResponse>(`/ships/${shipId}`),

  createShip: (shipData: ShipCreate) =>
    apiRequest<ShipResponse>('/ships', {
      method: 'POST',
      body: JSON.stringify(shipData),
    }),

  updateShip: (shipId: string, shipData: ShipUpdate) =>
    apiRequest<ShipResponse>(`/ships/${shipId}`, {
      method: 'PUT',
      body: JSON.stringify(shipData),
    }),

  deleteShip: (shipId: string) =>
    apiRequest<{ message: string }>(`/ships/${shipId}`, {
      method: 'DELETE',
    }),
};

// PMS API
export const pmsApi = {
  getAllTasks: (params?: { ship_id?: string; status?: string; assigned_to?: string }) => {
    const query = new URLSearchParams();
    if (params?.ship_id) query.append('ship_id', params.ship_id);
    if (params?.status) query.append('status', params.status);
    if (params?.assigned_to) query.append('assigned_to', params.assigned_to);
    const queryString = query.toString();
    return apiRequest<PMSTaskResponse[]>(`/pms${queryString ? '?' + queryString : ''}`);
  },

  getTaskById: (taskId: string) =>
    apiRequest<PMSTaskResponse>(`/pms/${taskId}`),

  createTask: (taskData: PMSTaskCreate) =>
    apiRequest<PMSTaskResponse>('/pms', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),

  updateTask: (taskId: string, taskData: PMSTaskUpdate) =>
    apiRequest<PMSTaskResponse>(`/pms/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    }),

  approveTask: (taskId: string, notes?: string) =>
    apiRequest<PMSTaskResponse>(`/pms/${taskId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_notes: notes }),
    }),

  rejectTask: (taskId: string, notes: string) =>
    apiRequest<PMSTaskResponse>(`/pms/${taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_notes: notes }),
    }),

  getShipStats: (shipId: string) =>
    apiRequest<PMSStats>(`/pms/ship/${shipId}/stats`),

  deleteTask: (taskId: string) =>
    apiRequest<{ message: string }>(`/pms/${taskId}`, {
      method: 'DELETE',
    }),
};

// Dashboard API
export const dashboardApi = {
  getFleetSummary: () =>
    apiRequest<FleetSummary>('/dashboard/fleet-summary'),

  getMyTasks: () =>
    apiRequest<MyTasksResponse>('/dashboard/my-tasks'),

  getNotifications: () =>
    apiRequest<NotificationsResponse>('/dashboard/notifications'),
};

export interface WorkLogUpdate {
  task_type?: string;
  description?: string;
  hours_worked?: number;
  date?: string;
  photo_url?: string;
}

// Work Logs API
export const worklogsApi = {
  getAllLogs: (params?: { ship_id?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ship_id) queryParams.append('ship_id', params.ship_id);
    if (params?.status) queryParams.append('status', params.status);
    const queryString = queryParams.toString();
    return apiRequest<WorkLogResponse[]>(`/worklogs${queryString ? `?${queryString}` : ''}`);
  },

  getLogById: (logId: string) =>
    apiRequest<WorkLogResponse>(`/worklogs/${logId}`),

  createLog: (logData: WorkLogCreate) =>
    apiRequest<WorkLogResponse>('/worklogs', {
      method: 'POST',
      body: JSON.stringify(logData),
    }),

  updateLog: (logId: string, logData: WorkLogUpdate) =>
    apiRequest<WorkLogResponse>(`/worklogs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(logData),
    }),

  deleteLog: (logId: string) =>
    apiRequest<{ message: string }>(`/worklogs/${logId}`, {
      method: 'DELETE',
    }),

  approveLog: (logId: string) =>
    apiRequest<WorkLogResponse>(`/worklogs/${logId}/approve`, {
      method: 'POST',
    }),

  rejectLog: (logId: string) =>
    apiRequest<WorkLogResponse>(`/worklogs/${logId}/reject`, {
      method: 'POST',
    }),
};

// Type definitions for API responses
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'master' | 'staff' | 'crew';
  ship_id?: string;
  ship_name?: string;
  phone?: string;
  position?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role: 'master' | 'staff' | 'crew';
  ship_id?: string | null;
  phone?: string;
  position?: string;
}

export interface UserUpdate {
  name?: string;
  role?: 'master' | 'staff' | 'crew';
  ship_id?: string | null;
  phone?: string;
  position?: string;
  active?: boolean;
}

export interface ShipResponse {
  id: string;
  name: string;
  type: string;
  imo_number: string;
  flag_state: string;
  call_sign?: string;
  gross_tonnage?: number;
  built_year?: number;
  status: 'active' | 'maintenance' | 'docked' | 'inactive';
  owner?: string;
  operator?: string;
  crew_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShipCreate {
  name: string;
  type: string;
  imo_number: string;
  flag_state: string;
  call_sign?: string;
  gross_tonnage?: number;
  built_year?: number;
  status?: 'active' | 'maintenance' | 'docked' | 'inactive';
  owner?: string;
  operator?: string;
}

export interface ShipUpdate {
  name?: string;
  type?: string;
  imo_number?: string;
  flag_state?: string;
  status?: 'active' | 'maintenance' | 'docked' | 'inactive';
  call_sign?: string;
  gross_tonnage?: number;
  built_year?: number;
  owner?: string;
  operator?: string;
}

export interface PMSTaskResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  equipment_name: string;
  task_description: string;
  frequency: string;
  priority: string;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  instructions?: string;
  safety_notes?: string;
  completion_notes?: string;
  photos: string[];
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PMSTaskCreate {
  ship_id: string;
  equipment_name: string;
  task_description: string;
  frequency: string;
  priority?: string;
  assigned_to?: string;
  due_date: string;
  estimated_hours?: number;
  instructions?: string;
  safety_notes?: string;
}

export interface PMSTaskUpdate {
  status?: string;
  assigned_to?: string;
  ship_id?: string;
  due_date?: string;
  priority?: string;
  completion_notes?: string;
  actual_hours?: number;
  photos?: string[];
}

export interface PMSStats {
  ship_id: string;
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  approved_tasks: number;
  awaiting_approval: number;
}

export interface FleetSummary {
  total_ships: number;
  active_ships: number;
  total_crew: number;
  pending_pms_tasks: number;
  pending_approvals: number;
  monthly_expenses: number;
  ships_stats: ShipStats[];
}

export interface ShipStats {
  ship_id: string;
  ship_name: string;
  crew_count: number;
  pending_pms_tasks: number;
  overdue_pms_tasks: number;
  pending_crew_logs: number;
  pending_invoices: number;
  total_invoice_amount: number;
}

export interface MyTasksResponse {
  tasks?: PMSTaskResponse[];
  ship_name?: string;
  total_tasks?: number;
  pending_tasks?: number;
  in_progress_tasks?: number;
  completed_tasks?: number;
  overdue_tasks?: number;
  ships?: ShipResponse[];
  total_ships?: number;
  total_crew?: number;
  active_ships?: number;
}

export interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
  }>;
}

// Incident types
export interface IncidentCreate {
  ship_id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  location: string;
  date_time: string;
  injuries: boolean;
  witnesses?: string;
}

export interface IncidentUpdate {
  status?: string;
  investigation_notes?: string;
  corrective_actions?: string;
  resolved_date?: string;
}

export interface IncidentResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  location: string;
  date_time: string;
  injuries: boolean;
  witnesses?: string;
  reported_by: string;
  reported_by_name: string;
  investigation_notes?: string;
  corrective_actions?: string;
  resolved_date?: string;
  created_at: string;
  updated_at: string;
}

// Audit types
export interface AuditCreate {
  ship_id: string;
  audit_type: string;
  title: string;
  description?: string;
  scheduled_date: string;
  auditor?: string;
}

export interface AuditUpdate {
  status?: string;
  findings?: string;
  recommendations?: string;
  completed_date?: string;
}

export interface AuditResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  audit_type: string;
  title: string;
  description?: string;
  status: string;
  scheduled_date: string;
  completed_date?: string;
  auditor?: string;
  findings?: string;
  recommendations?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// Cargo types
export interface CargoCreate {
  ship_id: string;
  cargo_type: string;
  cargo_name: string;
  quantity: number;
  unit: string;
  port: string;
  scheduled_date: string;
  notes?: string;
}

export interface CargoUpdate {
  status?: string;
  actual_quantity?: number;
  completed_date?: string;
  notes?: string;
}

export interface CargoResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  cargo_type: string;
  cargo_name: string;
  quantity: number;
  actual_quantity?: number;
  unit: string;
  port: string;
  status: string;
  scheduled_date: string;
  completed_date?: string;
  notes?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// Incidents API
export const incidentsApi = {
  getAll: (shipId?: string) =>
    apiRequest<IncidentResponse[]>(`/incidents${shipId ? `?ship_id=${shipId}` : ''}`),

  getById: (incidentId: string) =>
    apiRequest<IncidentResponse>(`/incidents/${incidentId}`),

  create: (data: IncidentCreate) =>
    apiRequest<IncidentResponse>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (incidentId: string, data: IncidentUpdate) =>
    apiRequest<IncidentResponse>(`/incidents/${incidentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Work Log Types
export interface WorkLogResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  crew_id: string;
  crew_name: string;
  date: string;
  task_type: string;
  description: string;
  hours_worked: number;
  status: 'pending' | 'approved' | 'rejected';
  photo_url?: string;
  remarks?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkLogCreate {
  ship_id: string;
  date: string;
  task_type: string;
  description: string;
  hours_worked: number;
  photo_url?: string;
}

// Audits API
export const auditsApi = {
  getAll: (shipId?: string) =>
    apiRequest<AuditResponse[]>(`/audits${shipId ? `?ship_id=${shipId}` : ''}`),

  getById: (auditId: string) =>
    apiRequest<AuditResponse>(`/audits/${auditId}`),

  create: (data: AuditCreate) =>
    apiRequest<AuditResponse>('/audits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (auditId: string, data: AuditUpdate) =>
    apiRequest<AuditResponse>(`/audits/${auditId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Cargo API
export const cargoApi = {
  getAll: (shipId?: string) =>
    apiRequest<CargoResponse[]>(`/cargo${shipId ? `?ship_id=${shipId}` : ''}`),

  getById: (cargoId: string) =>
    apiRequest<CargoResponse>(`/cargo/${cargoId}`),

  create: (data: CargoCreate) =>
    apiRequest<CargoResponse>('/cargo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (cargoId: string, data: CargoUpdate) =>
    apiRequest<CargoResponse>(`/cargo/${cargoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Bunkering Types
export interface BunkeringResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  port: string;
  supplier: string;
  fuel_type: 'vlsfo' | 'hfo' | 'mgo' | 'lsmgo';
  quantity: number;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost_per_mt: number;
  total_cost: number;
  officer_in_charge?: string;
  checklist_completed: boolean;
  sample_taken: boolean;
  remarks?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface BunkeringCreate {
  ship_id: string;
  port: string;
  supplier: string;
  fuel_type: 'vlsfo' | 'hfo' | 'mgo' | 'lsmgo';
  quantity: number;
  scheduled_date: string;
  cost_per_mt: number;
  officer_in_charge?: string;
  remarks?: string;
}

export interface BunkeringUpdate {
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  quantity?: number;
  cost_per_mt?: number;
  checklist_completed?: boolean;
  sample_taken?: boolean;
  remarks?: string;
}

// Bunkering API
export const bunkeringApi = {
  getAll: (params?: { ship_id?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.ship_id) queryParams.append('ship_id', params.ship_id);
    if (params?.status) queryParams.append('status', params.status);
    const queryString = queryParams.toString();
    return apiRequest<BunkeringResponse[]>(`/bunkering${queryString ? `?${queryString}` : ''}`);
  },

  getById: (operationId: string) =>
    apiRequest<BunkeringResponse>(`/bunkering/${operationId}`),

  create: (data: BunkeringCreate) =>
    apiRequest<BunkeringResponse>('/bunkering', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (operationId: string, data: BunkeringUpdate) =>
    apiRequest<BunkeringResponse>(`/bunkering/${operationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  completeChecklist: (operationId: string) =>
    apiRequest<BunkeringResponse>(`/bunkering/${operationId}/complete-checklist`, {
      method: 'POST',
    }),

  markSampleTaken: (operationId: string) =>
    apiRequest<BunkeringResponse>(`/bunkering/${operationId}/sample-taken`, {
      method: 'POST',
    }),
};

// Recruitment Types
export type RecruitmentStage = 'applied' | 'shortlisted1' | 'shortlisted2' | 'final' | 'prejoining' | 'accepted' | 'rejected';
export type CandidateSource = 'Website' | 'Agent' | 'Referral' | 'Direct';

export interface CandidateResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rank: string;
  experience: string;
  vessel_id?: string;
  vessel_name?: string;
  source: CandidateSource;
  stage: RecruitmentStage;
  notes?: string;
  initials: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateCreate {
  name: string;
  email?: string;
  phone?: string;
  rank: string;
  experience: string;
  vessel_id?: string;
  source: CandidateSource;
  stage?: RecruitmentStage;
  notes?: string;
}

export interface CandidateUpdate {
  name?: string;
  email?: string;
  phone?: string;
  rank?: string;
  experience?: string;
  vessel_id?: string | null;
  source?: CandidateSource;
  stage?: RecruitmentStage;
  notes?: string;
}

// Recruitment API
export const recruitmentApi = {
  getAllCandidates: () =>
    apiRequest<CandidateResponse[]>('/recruitment'),

  getCandidateById: (candidateId: string) =>
    apiRequest<CandidateResponse>(`/recruitment/${candidateId}`),

  createCandidate: (candidateData: CandidateCreate) =>
    apiRequest<CandidateResponse>('/recruitment', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    }),

  updateCandidate: (candidateId: string, candidateData: CandidateUpdate) =>
    apiRequest<CandidateResponse>(`/recruitment/${candidateId}`, {
      method: 'PUT',
      body: JSON.stringify(candidateData),
    }),

  deleteCandidate: (candidateId: string) =>
    apiRequest<{ message: string }>(`/recruitment/${candidateId}`, {
      method: 'DELETE',
    }),

  moveCandidateStage: (candidateId: string, newStage: RecruitmentStage) =>
    apiRequest<CandidateResponse>(`/recruitment/${candidateId}/stage?new_stage=${newStage}`, {
      method: 'PATCH',
    }),
};

// DG Communication Types
export type DGCommunicationType = 'incoming' | 'outgoing';
export type DGCommunicationStatus = 'pending' | 'action_required' | 'in_progress' | 'completed' | 'archived';
export type DGCommunicationCategory = 'training' | 'manning' | 'safety' | 'medical' | 'dispute' | 'certification' | 'inspection' | 'compliance' | 'other';

export interface DGCommunicationResponse {
  id: string;
  ref_no: string;
  comm_type: DGCommunicationType;
  subject: string;
  content: string;
  category: DGCommunicationCategory;
  status: DGCommunicationStatus;
  dg_office: string;
  ship_id?: string;
  ship_name?: string;
  crew_id?: string;
  crew_name?: string;
  priority: string;
  due_date?: string;
  response?: string;
  response_date?: string;
  attachments: string[];
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DGCommunicationCreate {
  comm_type: DGCommunicationType;
  subject: string;
  content: string;
  category: DGCommunicationCategory;
  dg_office: string;
  ship_id?: string;
  crew_id?: string;
  priority?: string;
  due_date?: string;
  attachments?: string[];
}

export interface DGCommunicationUpdate {
  subject?: string;
  content?: string;
  category?: DGCommunicationCategory;
  status?: DGCommunicationStatus;
  dg_office?: string;
  ship_id?: string;
  crew_id?: string;
  priority?: string;
  due_date?: string;
  response?: string;
  attachments?: string[];
}

export interface DGCommunicationStats {
  total: number;
  pending: number;
  action_required: number;
  completed: number;
  incoming: number;
  outgoing: number;
}

// DG Communications API
export const dgCommunicationApi = {
  getAll: (params?: {
    comm_type?: DGCommunicationType;
    status?: DGCommunicationStatus;
    category?: DGCommunicationCategory;
    ship_id?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.comm_type) query.append('comm_type', params.comm_type);
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.ship_id) query.append('ship_id', params.ship_id);

    return apiRequest<DGCommunicationResponse[]>(`/dg-communications?${query.toString()}`);
  },

  getById: (commId: string) =>
    apiRequest<DGCommunicationResponse>(`/dg-communications/${commId}`),

  getStats: () =>
    apiRequest<DGCommunicationStats>('/dg-communications/stats'),

  create: (data: DGCommunicationCreate) =>
    apiRequest<DGCommunicationResponse>('/dg-communications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (commId: string, data: DGCommunicationUpdate) =>
    apiRequest<DGCommunicationResponse>(`/dg-communications/${commId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addResponse: (commId: string, response: string, markCompleted: boolean = false) =>
    apiRequest<DGCommunicationResponse>(`/dg-communications/${commId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response, mark_completed: markCompleted }),
    }),

  markCompleted: (commId: string) =>
    apiRequest<DGCommunicationResponse>(`/dg-communications/${commId}/complete`, {
      method: 'POST',
    }),

  delete: (commId: string) =>
    apiRequest<{ message: string }>(`/dg-communications/${commId}`, {
      method: 'DELETE',
    }),
};

// Invoice Types
export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
export type InvoiceCategory = 'fuel' | 'maintenance' | 'provisions' | 'port_fees' | 'crew_wages' | 'insurance' | 'other';

export interface InvoiceResponse {
  id: string;
  ship_id: string;
  ship_name: string;
  invoice_number: string;
  vendor_name: string;
  category: InvoiceCategory;
  amount: number;
  currency: string;
  description: string;
  status: InvoiceStatus;
  due_date: string;
  paid_date?: string;
  attachments: string[];
  remarks?: string;
  created_by: string;
  created_by_name: string;
  approved_by?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  ship_id: string;
  invoice_number?: string;
  vendor_name: string;
  category: InvoiceCategory;
  amount: number;
  currency?: string;
  description: string;
  due_date: string;
  attachments?: string[];
  remarks?: string;
}

export interface InvoiceStats {
  total_count: number;
  total_amount: number;
  pending_amount: number;
  paid_amount: number;
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  paid_count: number;
  rejected_count: number;
}

// Invoices API
export const invoicesApi = {
  getAll: (params?: { ship_id?: string; status?: InvoiceStatus }) => {
    const query = new URLSearchParams();
    if (params?.ship_id) query.append('ship_id', params.ship_id);
    if (params?.status) query.append('status', params.status);

    return apiRequest<InvoiceResponse[]>(`/invoices?${query.toString()}`);
  },

  getById: (invoiceId: string) =>
    apiRequest<InvoiceResponse>(`/invoices/${invoiceId}`),

  getStats: (shipId?: string) => {
    const query = shipId ? `?ship_id=${shipId}` : '';
    return apiRequest<InvoiceStats>(`/invoices/stats${query}`);
  },

  create: (data: InvoiceCreate) =>
    apiRequest<InvoiceResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submit: (invoiceId: string) =>
    apiRequest<InvoiceResponse>(`/invoices/${invoiceId}/submit`, {
      method: 'POST',
    }),

  approve: (invoiceId: string, notes?: string) =>
    apiRequest<InvoiceResponse>(`/invoices/${invoiceId}/approve${notes ? `?notes=${encodeURIComponent(notes)}` : ''}`, {
      method: 'POST',
    }),

  reject: (invoiceId: string, notes?: string) =>
    apiRequest<InvoiceResponse>(`/invoices/${invoiceId}/reject${notes ? `?notes=${encodeURIComponent(notes)}` : ''}`, {
      method: 'POST',
    }),

  markPaid: (invoiceId: string) =>
    apiRequest<InvoiceResponse>(`/invoices/${invoiceId}/mark-paid`, {
      method: 'POST',
    }),

  delete: (invoiceId: string) =>
    apiRequest<{ message: string }>(`/invoices/${invoiceId}`, {
      method: 'DELETE',
    }),
};

// Client Types
export type ClientStatus = 'active' | 'inactive';

export interface ClientResponse {
  id: string;
  name: string;
  company: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  contract_start?: string;
  contract_end?: string;
  status: ClientStatus;
  vessels_count: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
  company: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  contract_start?: string;
  contract_end?: string;
  notes?: string;
}

export interface ClientUpdate {
  name?: string;
  company?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  contract_start?: string;
  contract_end?: string;
  status?: ClientStatus;
  notes?: string;
}

export interface ClientStats {
  total_count: number;
  active_count: number;
  inactive_count: number;
  total_vessels: number;
}

// Clients API
export const clientsApi = {
  getAll: (params?: { status?: ClientStatus; country?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.country) query.append('country', params.country);

    return apiRequest<ClientResponse[]>(`/clients?${query.toString()}`);
  },

  getById: (clientId: string) =>
    apiRequest<ClientResponse>(`/clients/${clientId}`),

  getStats: () =>
    apiRequest<ClientStats>('/clients/stats'),

  create: (data: ClientCreate) =>
    apiRequest<ClientResponse>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (clientId: string, data: ClientUpdate) =>
    apiRequest<ClientResponse>(`/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (clientId: string) =>
    apiRequest<{ message: string }>(`/clients/${clientId}`, {
      method: 'DELETE',
    }),
};

// Onboarding Types
export type OnboardingStatus =
  | 'pending_submission'
  | 'crew_onboarding_submitted'
  | 'crew_onboarding_approved_by_master'
  | 'rejected_by_master'
  | 'agreement_uploaded'
  | 'agreement_downloaded_by_crew';

export interface CrewApplicationSubmit {
  application_data: Record<string, any>;
  documents?: string[];
}

export interface MasterReviewAction {
  approved: boolean;
  rejection_reason?: string;
}

export interface AgreementPrepare {
  agreement_url: string;
  vessel_name: string;
  crew_name: string;
  rank: string;
  joining_date: string; // ISO date string
  contract_duration: string;
}

export interface AgreementAccept {
  accepted: boolean;
  ip_address?: string; // Optional as backend can fill
  user_agent?: string; // Optional as backend can fill
}

export interface OnboardingResponse {
  id: string;
  candidate_id: string;
  crew_id: string;
  status: OnboardingStatus;

  application_data: Record<string, any>;
  documents: string[];

  master_approval_date?: string;
  master_id?: string;
  rejection_reason?: string;

  agreement_url?: string;
  agreement_details?: Record<string, any>;

  accepted_at?: string;
  accepted_ip?: string;
  accepted_user_agent?: string;
  agreement_version_id?: string;

  created_at: string;
  updated_at: string;
}

// Onboarding API
export const onboardingApi = {
  trigger: (candidateId: string, crewId: string) =>
    apiRequest<OnboardingResponse>(`/onboarding/trigger?candidate_id=${candidateId}&crew_id=${crewId}`, {
      method: 'POST'
    }),

  getMyApplications: () =>
    apiRequest<OnboardingResponse[]>('/onboarding/my'),

  getAllApplications: () =>
    apiRequest<OnboardingResponse[]>('/onboarding/all'),


  getApplicationById: (id: string) =>
    apiRequest<OnboardingResponse>(`/onboarding/${id}`),

  getApplicationByCandidate: (candidateId: string) =>
    apiRequest<OnboardingResponse>(`/onboarding/candidate/${candidateId}`),

  submitApplication: (id: string, data: CrewApplicationSubmit) =>
    apiRequest<OnboardingResponse>(`/onboarding/${id}/submit`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  masterReview: (id: string, action: MasterReviewAction) =>
    apiRequest<OnboardingResponse>(`/onboarding/${id}/master-review`, {
      method: 'POST',
      body: JSON.stringify(action)
    }),

  prepareAgreement: (id: string, data: AgreementPrepare) =>
    apiRequest<OnboardingResponse>(`/onboarding/${id}/agreement/prepare`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  respondAgreement: (id: string, action: AgreementAccept) =>
    apiRequest<OnboardingResponse>(`/onboarding/${id}/agreement/respond`, {
      method: 'POST',
      body: JSON.stringify(action)
    })
};
