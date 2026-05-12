import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Loader2, Building2, Users, Ship } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { clientsApi, ClientResponse, ClientCreate, ClientUpdate, ClientStats } from '../services/api';

export function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editClient, setEditClient] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    contract_start: '',
    contract_end: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    contract_start: '',
    contract_end: '',
    notes: '',
  });

  const isMaster = user?.role === 'master';
  const isStaff = user?.role === 'staff';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, statsRes] = await Promise.all([
        clientsApi.getAll(),
        clientsApi.getStats()
      ]);
      
      if (clientsRes.data) {
        setClients(clientsRes.data);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      toast.error('Failed to load clients');
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.company || !newClient.contact_person || !newClient.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const data: ClientCreate = {
        name: newClient.name,
        company: newClient.company,
        contact_person: newClient.contact_person,
        email: newClient.email,
        phone: newClient.phone || undefined,
        address: newClient.address || undefined,
        country: newClient.country || undefined,
        contract_start: newClient.contract_start || undefined,
        contract_end: newClient.contract_end || undefined,
        notes: newClient.notes || undefined,
      };

      const response = await clientsApi.create(data);
      if (response.error) throw new Error(response.error);

      toast.success('Client created successfully');
      setIsCreateDialogOpen(false);
      setNewClient({
        name: '',
        company: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        contract_start: '',
        contract_end: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      toast.error('Failed to create client');
      console.error('Error creating client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const response = await clientsApi.delete(clientId);
      if (response.error) throw new Error(response.error);
      toast.success('Client deleted successfully');
      await loadData();
    } catch (err) {
      toast.error('Failed to delete client');
    }
  };

  const handleViewClient = (client: ClientResponse) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  const handleEditClient = (client: ClientResponse) => {
    setSelectedClient(client);
    setEditClient({
      name: client.name,
      company: client.company,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      country: client.country || '',
      contract_start: client.contract_start ? client.contract_start.split('T')[0] : '',
      contract_end: client.contract_end ? client.contract_end.split('T')[0] : '',
      status: client.status,
      notes: client.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    if (!editClient.name || !editClient.company || !editClient.contact_person || !editClient.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const data: ClientUpdate = {
        name: editClient.name,
        company: editClient.company,
        contact_person: editClient.contact_person,
        email: editClient.email,
        phone: editClient.phone || undefined,
        address: editClient.address || undefined,
        country: editClient.country || undefined,
        contract_start: editClient.contract_start || undefined,
        contract_end: editClient.contract_end || undefined,
        status: editClient.status,
        notes: editClient.notes || undefined,
      };

      const response = await clientsApi.update(selectedClient.id, data);
      if (response.error) throw new Error(response.error);

      toast.success('Client updated successfully');
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      await loadData();
    } catch (err) {
      toast.error('Failed to update client');
      console.error('Error updating client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-foreground text-2xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">Manage your client relationships and contracts</p>
        </div>
        {(isStaff || isMaster) && (
          <Button 
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats?.total_count || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats?.active_count || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats?.inactive_count || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vessels</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats?.total_vessels || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Ship className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No clients found. Click "Add Client" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email / Phone</TableHead>
                <TableHead className="text-center">Vessels</TableHead>
                <TableHead>Contract Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.company}</TableCell>
                  <TableCell>{client.contact_person}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{client.email}</div>
                      <div className="text-muted-foreground">{client.phone || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{client.vessels_count}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(client.contract_start)}</div>
                      <div className="text-muted-foreground">to {formatDate(client.contract_end)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={client.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}>
                      {client.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" title="View Details" onClick={() => handleViewClient(client)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(isStaff || isMaster) && (
                        <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEditClient(client)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {isMaster && (
                        <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDeleteClient(client.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Fill in the details below to create a new client record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={newClient.contact_person}
                  onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                  placeholder="Enter contact person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={newClient.country}
                  onChange={(e) => setNewClient({ ...newClient, country: e.target.value })}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_start">Contract Start</Label>
                <Input
                  id="contract_start"
                  type="date"
                  value={newClient.contract_start}
                  onChange={(e) => setNewClient({ ...newClient, contract_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_end">Contract End</Label>
                <Input
                  id="contract_end"
                  type="date"
                  value={newClient.contract_end}
                  onChange={(e) => setNewClient({ ...newClient, contract_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90" 
              onClick={handleCreateClient}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>View full details of the selected client.</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">{selectedClient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedClient.company}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{selectedClient.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedClient.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedClient.country || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedClient.address || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Start</p>
                  <p className="font-medium">{formatDate(selectedClient.contract_start)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract End</p>
                  <p className="font-medium">{formatDate(selectedClient.contract_end)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={selectedClient.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}>
                    {selectedClient.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vessels</p>
                  <p className="font-medium">{selectedClient.vessels_count}</p>
                </div>
              </div>
              {selectedClient.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update the client information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Client Name *</Label>
                <Input
                  id="edit_name"
                  value={editClient.name}
                  onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_company">Company *</Label>
                <Input
                  id="edit_company"
                  value={editClient.company}
                  onChange={(e) => setEditClient({ ...editClient, company: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_contact_person">Contact Person *</Label>
                <Input
                  id="edit_contact_person"
                  value={editClient.contact_person}
                  onChange={(e) => setEditClient({ ...editClient, contact_person: e.target.value })}
                  placeholder="Enter contact person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editClient.email}
                  onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={editClient.phone}
                  onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_country">Country</Label>
                <Input
                  id="edit_country"
                  value={editClient.country}
                  onChange={(e) => setEditClient({ ...editClient, country: e.target.value })}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Address</Label>
              <Input
                id="edit_address"
                value={editClient.address}
                onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_contract_start">Contract Start</Label>
                <Input
                  id="edit_contract_start"
                  type="date"
                  value={editClient.contract_start}
                  onChange={(e) => setEditClient({ ...editClient, contract_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_contract_end">Contract End</Label>
                <Input
                  id="edit_contract_end"
                  type="date"
                  value={editClient.contract_end}
                  onChange={(e) => setEditClient({ ...editClient, contract_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={editClient.status} onValueChange={(value: 'active' | 'inactive') => setEditClient({ ...editClient, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={editClient.notes}
                onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90" 
              onClick={handleUpdateClient}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
