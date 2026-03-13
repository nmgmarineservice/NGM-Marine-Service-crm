import { useState, useEffect } from 'react';
import { Wrench, Calendar, CheckCircle2, Clock, AlertCircle, Plus, Filter, Download, Upload, Image as ImageIcon, Loader2, Eye, Edit, Trash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { pmsApi, shipsApi, userApi, PMSTaskResponse, PMSTaskCreate, PMSTaskUpdate, UserResponse } from '../services/api';

export function PMS() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PMSTaskResponse[]>([]);
  const [ships, setShips] = useState<Array<{id: string, name: string}>>([]);
  const [selectedShip, setSelectedShip] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<PMSTaskResponse | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '' as string,
    assigned_to: '',
    remarks: '',
    photo: null as File | null
  });
  const [createForm, setCreateForm] = useState({
    equipment_name: '',
    task_description: '',
    frequency: 'monthly',
    due_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    estimated_hours: '1'
  });
  const [crewMembers, setCrewMembers] = useState<UserResponse[]>([]);

  const currentShip = ships.find((s: {id: string, name: string}) => s.id === selectedShip);
  const isMaster = user?.role === 'master';
  const isStaff = user?.role === 'staff';
  const isCrew = user?.role === 'crew';
  const canCreateDelete = isMaster || isStaff;

  // Load ships and tasks
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load ships
        const shipsResponse = await shipsApi.getAllShips();
        if (shipsResponse.error) {
          throw new Error(shipsResponse.error);
        }
        
        const shipsList = (shipsResponse.data || []).map(ship => ({ id: ship.id, name: ship.name }));
        setShips(shipsList);
        
        // Set default ship for crew and staff users
        let defaultShipId = '';
        if ((user?.role === 'crew' || user?.role === 'staff') && user.ship_id) {
          defaultShipId = user.ship_id;
        } else if (shipsList.length > 0) {
          defaultShipId = shipsList[0].id;
        }
        setSelectedShip(defaultShipId);

        // Load tasks - Master sees all, others filter by ship
        const taskParams: any = {};
        if (user?.role !== 'master' && defaultShipId) {
          taskParams.ship_id = defaultShipId;
        }
        const tasksResponse = await pmsApi.getAllTasks(taskParams);
        if (tasksResponse.error) {
          throw new Error(tasksResponse.error);
        }
        setTasks(tasksResponse.data || []);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Load tasks and crew when ship changes or after initial load
  useEffect(() => {
    if (!loading) {
      // Master loads all tasks regardless of selectedShip
      // Staff/Crew need selectedShip
      if (isMaster || selectedShip) {
        loadTasks();
      }
    }
    if (selectedShip) {
      loadCrewMembers(selectedShip);
    }
  }, [selectedShip, loading, isMaster]);

  const loadCrewMembers = async (shipId?: string) => {
    try {
      let response;
      if (isMaster) {
        // Master sees all active crew members
        response = await userApi.getAllUsers();
      } else if (isStaff && user?.ship_id) {
        // Staff sees only crew from their assigned vessel
        response = await userApi.getUsersByShip(user.ship_id);
      } else if (shipId) {
        // Fallback to ship-based filtering
        response = await userApi.getUsersByShip(shipId);
      } else {
        setCrewMembers([]);
        return;
      }

      if (response.error) {
        console.error('Failed to load crew members:', response.error);
        return;
      }

      // Filter to only show active crew members
      const activeCrewMembers = (response.data || []).filter(
        (u: UserResponse) => u.role === 'crew' && u.active
      );
      setCrewMembers(activeCrewMembers);
    } catch (err) {
      console.error('Error loading crew members:', err);
    }
  };

  const loadTasks = async () => {
    try {
      const params: any = {};
      // Master sees all tasks (no ship_id filter)
      // Staff/Crew filter by selected ship
      if (!isMaster && selectedShip) {
        params.ship_id = selectedShip;
      }
      
      const response = await pmsApi.getAllTasks(params);
      if (response.error) {
        throw new Error(response.error);
      }
      
      setTasks(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  // Count tasks by status
  const taskCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    pendingApproval: tasks.filter(t => t.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'overdue':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
      default:
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };

  const getApprovalBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Approval</Badge>;
      default:
        return null;
    }
  };

  const handleViewTask = (task: PMSTaskResponse) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleUpdateTask = (task: PMSTaskResponse) => {
    setSelectedTask(task);
    setUpdateForm({ 
      status: task.status,
      assigned_to: task.assigned_to || '',
      remarks: task.completion_notes || '', 
      photo: null 
    });
    setIsUpdateDialogOpen(true);
  };

  const handleDeleteTask = (task: PMSTaskResponse) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!selectedTask) return;
    
    try {
      setSubmitting(true);
      const response = await pmsApi.deleteTask(selectedTask.id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      await loadTasks();
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      toast.success('Task deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const submitTaskUpdate = async () => {
    if (!selectedTask) return;

    try {
      const updateData: PMSTaskUpdate = {
        status: updateForm.status,
        completion_notes: updateForm.remarks,
        actual_hours: undefined, // Could be added to form later
      };

      // Staff/Master can update assigned_to
      if (!isCrew && updateForm.assigned_to) {
        updateData.assigned_to = updateForm.assigned_to;
      }

      const response = await pmsApi.updateTask(selectedTask.id, updateData);
      if (response.error) {
        throw new Error(response.error);
      }

      // Refresh tasks
      await loadTasks();
      setIsUpdateDialogOpen(false);
      toast.success('Task updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      toast.error(errorMessage);
    }
  };

  const handleApproval = async (taskId: string, approved: boolean) => {
    try {
      if (approved) {
        const response = await pmsApi.approveTask(taskId);
        if (response.error) {
          throw new Error(response.error);
        }
      } else {
        const response = await pmsApi.rejectTask(taskId, 'Task rejected by master');
        if (response.error) {
          throw new Error(response.error);
        }
      }

      // Refresh tasks
      await loadTasks();
      toast.success(`Task ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task approval';
      toast.error(errorMessage);
    }
  };

  const handleCreateTask = async () => {
    if (!createForm.equipment_name || !createForm.task_description || (!isStaff && !selectedShip)) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const taskData: PMSTaskCreate = {
        ship_id: isStaff ? user?.ship_id || '' : selectedShip,
        equipment_name: createForm.equipment_name,
        task_description: createForm.task_description,
        frequency: createForm.frequency,
        due_date: createForm.due_date,
        assigned_to: createForm.assigned_to || user?.name || 'Unassigned',
        estimated_hours: parseFloat(createForm.estimated_hours) || 1,
      };

      const response = await pmsApi.createTask(taskData);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadTasks();
      setIsCreateDialogOpen(false);
      setCreateForm({
        equipment_name: '',
        task_description: '',
        frequency: 'monthly',
        due_date: new Date().toISOString().split('T')[0],
        assigned_to: '',
        estimated_hours: '1'
      });
      toast.success('Task created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Planned Maintenance System</h1>
          <p className="text-muted-foreground mt-1">
            {currentShip?.name || 'All Ships'} - Manage equipment maintenance schedules
          </p>
        </div>
        {!isCrew && (
          <Button 
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{taskCounts.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{taskCounts.inProgress}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{taskCounts.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-semibold text-destructive mt-1">{taskCounts.overdue}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {isMaster && (
          <Card className="shadow-md border-accent/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                  <p className="text-2xl font-semibold text-accent mt-1">{taskCounts.pendingApproval}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tasks">Maintenance Tasks</TabsTrigger>
          {isMaster && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {!isMaster && <TabsTrigger value="history">History</TabsTrigger>}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Task List</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    {isMaster && <TableHead>Approval</TableHead>}
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.equipment_name}</TableCell>
                      <TableCell>Equipment</TableCell>
                      <TableCell>{task.task_description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(task.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{task.assigned_to_name || 'Unassigned'}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      {isMaster && <TableCell>{task.status === 'completed' ? getApprovalBadge('pending') : null}</TableCell>}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleViewTask(task)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {task.status !== 'completed' && task.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleUpdateTask(task)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isCrew && task.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteTask(task)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isMaster && (
          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.filter(t => t.status === 'completed' && !t.approved_by).map((task) => (
                    <div key={task.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">{task.equipment_name} - {task.task_description}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Completed on {task.completed_date ? new Date(task.completed_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      {task.completion_notes && (
                        <div className="mb-3 p-3 bg-muted rounded">
                          <p className="text-sm text-foreground"><span className="font-medium">Notes:</span> {task.completion_notes}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproval(task.id, true)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleApproval(task.id, false)}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'completed' && !t.approved_by).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No pending approvals</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Completed By</TableHead>
                    <TableHead>Approval Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.filter(t => t.status === 'completed').map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.equipment_name}</TableCell>
                      <TableCell>{task.task_description}</TableCell>
                      <TableCell>{task.completed_date ? new Date(task.completed_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>System User</TableCell>
                      <TableCell>{task.approved_by ? getApprovalBadge('approved') : getApprovalBadge('pending')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Task Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTask?.equipment_name} - {selectedTask?.task_description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={updateForm.status} onValueChange={(value: string) => setUpdateForm({ ...updateForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Crew can only update status, Master/Staff can update assigned_to, remarks and photos */}
            {!isCrew && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="updateAssignedTo">Assigned To</Label>
                  <Select value={updateForm.assigned_to} onValueChange={(value) => setUpdateForm({ ...updateForm, assigned_to: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select crew member" />
                    </SelectTrigger>
                    <SelectContent>
                      {crewMembers.map((crew) => (
                        <SelectItem key={crew.id} value={crew.id}>
                          {crew.name} {crew.position ? `(${crew.position})` : ''}
                        </SelectItem>
                      ))}
                      {crewMembers.length === 0 && (
                        <SelectItem value="none-available" disabled>No crew members available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={updateForm.remarks}
                    onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                    placeholder="Add any notes or observations..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Upload Photo (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <label htmlFor="photo" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                        <input
                          id="photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setUpdateForm({ ...updateForm, photo: e.target.files?.[0] || null })}
                        />
                      </label>
                    </Button>
                  </div>
                  {updateForm.photo && (
                    <p className="text-xs text-muted-foreground">{updateForm.photo.name}</p>
                  )}
                </div>
              </>
            )}
            {isCrew && (
              <p className="text-sm text-muted-foreground">
                As a crew member, you can only update the task status.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submitTaskUpdate}>
              Submit Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Maintenance Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment Name *</Label>
              <Input
                id="equipment"
                value={createForm.equipment_name}
                onChange={(e) => setCreateForm({ ...createForm, equipment_name: e.target.value })}
                placeholder="e.g., Main Engine, Generator #1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description *</Label>
              <Textarea
                id="description"
                value={createForm.task_description}
                onChange={(e) => setCreateForm({ ...createForm, task_description: e.target.value })}
                placeholder="Describe the maintenance task..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={createForm.frequency} onValueChange={(value) => setCreateForm({ ...createForm, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Select value={createForm.assigned_to} onValueChange={(value) => setCreateForm({ ...createForm, assigned_to: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew member" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewMembers.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id}>
                        {crew.name} {crew.position ? `(${crew.position})` : ''}
                      </SelectItem>
                    ))}
                    {crewMembers.length === 0 && (
                      <SelectItem value="none-available" disabled>No crew members available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  value={createForm.estimated_hours}
                  onChange={(e) => setCreateForm({ ...createForm, estimated_hours: e.target.value })}
                  min="0.5"
                  step="0.5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreateTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Equipment</p>
                  <p className="font-medium">{selectedTask.equipment_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Task Description</p>
                <p className="mt-1">{selectedTask.task_description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                  <Badge variant="outline">{selectedTask.frequency}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <p>{selectedTask.priority || 'Normal'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p>{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <p>{selectedTask.assigned_to_name || 'Unassigned'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Hours</p>
                  <p>{selectedTask.estimated_hours || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Actual Hours</p>
                  <p>{selectedTask.actual_hours || '-'}</p>
                </div>
              </div>
              
              {selectedTask.completion_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Notes</p>
                  <p className="mt-1">{selectedTask.completion_notes}</p>
                </div>
              )}
              
              {selectedTask.instructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                  <p className="mt-1">{selectedTask.instructions}</p>
                </div>
              )}
              
              {selectedTask.safety_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Safety Notes</p>
                  <p className="mt-1">{selectedTask.safety_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this task? This action cannot be undone.</p>
          {selectedTask && (
            <div className="p-3 bg-muted rounded mt-2">
              <p className="font-medium">{selectedTask.equipment_name}</p>
              <p className="text-sm text-muted-foreground">{selectedTask.task_description}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTask} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
