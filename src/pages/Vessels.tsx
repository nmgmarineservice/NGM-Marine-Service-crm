import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, Ship, Users, Loader2, AlertCircle, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { shipsApi, ShipResponse, ShipCreate, ShipUpdate } from '../services/api';
import { toast } from 'sonner';

export function Vessels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ships, setShips] = useState<ShipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedShip, setSelectedShip] = useState<ShipResponse | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'bulk_carrier' as const,
    imo_number: '',
    flag_state: '',
    call_sign: '',
    gross_tonnage: '',
    built_year: '',
    owner: '',
    operator: '',
    status: 'active' as const,
  });

  const isMaster = user?.role === 'master';

  // Load ships data
  useEffect(() => {
    const loadShips = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await shipsApi.getAllShips();
        if (response.error) {
          throw new Error(response.error);
        }

        setShips(response.data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load ships data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadShips();
    }
  }, [user]);

  const loadShips = async () => {
    try {
      const response = await shipsApi.getAllShips();
      if (response.error) {
        throw new Error(response.error);
      }
      setShips(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ships';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bulk_carrier',
      imo_number: '',
      flag_state: '',
      call_sign: '',
      gross_tonnage: '',
      built_year: '',
      owner: '',
      operator: '',
      status: 'active',
    });
  };

  const openEditDialog = (ship: ShipResponse) => {
    setSelectedShip(ship);
    setFormData({
      name: ship.name,
      type: ship.type as any,
      imo_number: ship.imo_number,
      flag_state: ship.flag_state,
      call_sign: ship.call_sign || '',
      gross_tonnage: ship.gross_tonnage?.toString() || '',
      built_year: ship.built_year?.toString() || '',
      owner: ship.owner || '',
      operator: ship.operator || '',
      status: ship.status as any,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (ship: ShipResponse) => {
    setSelectedShip(ship);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateShip = async () => {
    if (!formData.name || !formData.imo_number || !formData.flag_state) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const shipData: ShipCreate = {
        name: formData.name,
        type: formData.type,
        imo_number: formData.imo_number,
        flag_state: formData.flag_state,
        call_sign: formData.call_sign || undefined,
        gross_tonnage: formData.gross_tonnage ? parseFloat(formData.gross_tonnage) : undefined,
        built_year: formData.built_year ? parseInt(formData.built_year) : undefined,
        owner: formData.owner || undefined,
        operator: formData.operator || undefined,
        status: formData.status,
      };

      const response = await shipsApi.createShip(shipData);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadShips();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Vessel added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vessel';
      toast.error(errorMessage);
    }
  };

  const handleUpdateShip = async () => {
    if (!selectedShip) return;

    try {
      const shipData: ShipUpdate = {
        name: formData.name || undefined,
        type: formData.type || undefined,
        flag_state: formData.flag_state || undefined,
        call_sign: formData.call_sign || undefined,
        gross_tonnage: formData.gross_tonnage ? parseFloat(formData.gross_tonnage) : undefined,
        built_year: formData.built_year ? parseInt(formData.built_year) : undefined,
        owner: formData.owner || undefined,
        operator: formData.operator || undefined,
        status: formData.status || undefined,
      };

      const response = await shipsApi.updateShip(selectedShip.id, shipData);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadShips();
      setIsEditDialogOpen(false);
      setSelectedShip(null);
      resetForm();
      toast.success('Vessel updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vessel';
      toast.error(errorMessage);
    }
  };

  const handleDeleteShip = async () => {
    if (!selectedShip) return;

    try {
      const response = await shipsApi.deleteShip(selectedShip.id);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadShips();
      setIsDeleteDialogOpen(false);
      setSelectedShip(null);
      toast.success('Vessel deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vessel';
      toast.error(errorMessage);
    }
  };

  const filteredVessels = ships.filter((vessel: ShipResponse) => {
    const matchesSearch = vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.imo_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || vessel.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-foreground">Vessels</h2>
          <p className="text-sm text-muted-foreground">Manage your fleet and vessel information</p>
        </div>
        {isMaster && (
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vessel
          </Button>
        )}
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by vessel name or IMO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="Ocean Shipping Ltd">Ocean Shipping Ltd</SelectItem>
              <SelectItem value="Pacific Marine Services">Pacific Marine Services</SelectItem>
              <SelectItem value="Atlantic Trade Corp">Atlantic Trade Corp</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Ship Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="container">Container Ship</SelectItem>
                <SelectItem value="tanker">Oil Tanker</SelectItem>
                <SelectItem value="bulk">Bulk Carrier</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-2"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-2"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVessels.map((vessel) => (
            <Card 
              key={vessel.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/vessels/${vessel.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-foreground">{vessel.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{vessel.imo_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ship className="w-8 h-8 text-primary" />
                    {isMaster && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(vessel); }}
                          title="Edit vessel"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(vessel); }}
                          title="Delete vessel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <p className="text-foreground">{vessel.owner || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flag:</span>
                    <p className="text-foreground">{vessel.flag_state}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="text-foreground">{vessel.type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={vessel.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : vessel.status === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                      {vessel.status.charAt(0).toUpperCase() + vessel.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{vessel.crew_count} crew</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Built: {vessel.built_year || 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Name</TableHead>
                <TableHead>IMO</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Ship Type</TableHead>
                <TableHead className="text-center">Crew</TableHead>
                <TableHead>Next Inspection</TableHead>
                <TableHead>Status</TableHead>
                {isMaster && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVessels.map((vessel) => (
                <TableRow 
                  key={vessel.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/vessels/${vessel.id}`)}
                >
                  <TableCell>{vessel.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vessel.imo_number}</TableCell>
                  <TableCell>{vessel.owner || 'N/A'}</TableCell>
                  <TableCell>{vessel.flag_state}</TableCell>
                  <TableCell>{vessel.type.replace('_', ' ').toUpperCase()}</TableCell>
                  <TableCell className="text-center">
                    {vessel.crew_count} crew
                  </TableCell>
                  <TableCell>{vessel.built_year || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={vessel.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : vessel.status === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                      {vessel.status.charAt(0).toUpperCase() + vessel.status.slice(1)}
                    </Badge>
                  </TableCell>
                  {isMaster && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); openEditDialog(vessel); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(vessel); }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Vessel Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vessel</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Vessel Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="MV Ocean Star" />
            </div>
            <div className="space-y-2">
              <Label>IMO Number *</Label>
              <Input value={formData.imo_number} onChange={(e) => setFormData({...formData, imo_number: e.target.value})} placeholder="IMO 1234567" />
            </div>
            <div className="space-y-2">
              <Label>Ship Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk_carrier">Bulk Carrier</SelectItem>
                  <SelectItem value="container_ship">Container Ship</SelectItem>
                  <SelectItem value="oil_tanker">Oil Tanker</SelectItem>
                  <SelectItem value="chemical_tanker">Chemical Tanker</SelectItem>
                  <SelectItem value="lpg_carrier">LPG Carrier</SelectItem>
                  <SelectItem value="lng_carrier">LNG Carrier</SelectItem>
                  <SelectItem value="general_cargo">General Cargo</SelectItem>
                  <SelectItem value="ro_ro">RO-RO</SelectItem>
                  <SelectItem value="passenger">Passenger</SelectItem>
                  <SelectItem value="offshore">Offshore</SelectItem>
                  <SelectItem value="tug">Tug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Flag State *</Label>
              <Input value={formData.flag_state} onChange={(e) => setFormData({...formData, flag_state: e.target.value})} placeholder="Panama" />
            </div>
            <div className="space-y-2">
              <Label>Call Sign</Label>
              <Input value={formData.call_sign} onChange={(e) => setFormData({...formData, call_sign: e.target.value})} placeholder="ABC123" />
            </div>
            <div className="space-y-2">
              <Label>Gross Tonnage</Label>
              <Input type="number" value={formData.gross_tonnage} onChange={(e) => setFormData({...formData, gross_tonnage: e.target.value})} placeholder="50000" />
            </div>
            <div className="space-y-2">
              <Label>Built Year</Label>
              <Input type="number" value={formData.built_year} onChange={(e) => setFormData({...formData, built_year: e.target.value})} placeholder="2015" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="docked">Docked</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={formData.owner} onChange={(e) => setFormData({...formData, owner: e.target.value})} placeholder="Ocean Shipping Ltd" />
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Input value={formData.operator} onChange={(e) => setFormData({...formData, operator: e.target.value})} placeholder="Pacific Marine Services" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateShip}>Add Vessel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vessel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vessel</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Vessel Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>IMO Number</Label>
              <Input value={formData.imo_number} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Ship Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk_carrier">Bulk Carrier</SelectItem>
                  <SelectItem value="container_ship">Container Ship</SelectItem>
                  <SelectItem value="oil_tanker">Oil Tanker</SelectItem>
                  <SelectItem value="chemical_tanker">Chemical Tanker</SelectItem>
                  <SelectItem value="lpg_carrier">LPG Carrier</SelectItem>
                  <SelectItem value="lng_carrier">LNG Carrier</SelectItem>
                  <SelectItem value="general_cargo">General Cargo</SelectItem>
                  <SelectItem value="ro_ro">RO-RO</SelectItem>
                  <SelectItem value="passenger">Passenger</SelectItem>
                  <SelectItem value="offshore">Offshore</SelectItem>
                  <SelectItem value="tug">Tug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Flag State</Label>
              <Input value={formData.flag_state} onChange={(e) => setFormData({...formData, flag_state: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Call Sign</Label>
              <Input value={formData.call_sign} onChange={(e) => setFormData({...formData, call_sign: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Gross Tonnage</Label>
              <Input type="number" value={formData.gross_tonnage} onChange={(e) => setFormData({...formData, gross_tonnage: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Built Year</Label>
              <Input type="number" value={formData.built_year} onChange={(e) => setFormData({...formData, built_year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="docked">Docked</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={formData.owner} onChange={(e) => setFormData({...formData, owner: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Input value={formData.operator} onChange={(e) => setFormData({...formData, operator: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateShip}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vessel</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete <strong>{selectedShip?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteShip}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
