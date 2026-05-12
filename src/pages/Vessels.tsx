import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, Ship, Users, Loader2, AlertCircle, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { shipsApi, ShipResponse, ShipCreate, ShipUpdate } from '../services/api';
import { auth, API_BASE_URL } from '../firebase';
import { Upload, FileCheck, ExternalLink, Paperclip } from 'lucide-react';

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
    official_number: '',
    kilo_watt: '',
    sea_refers_cba: false,
    pi_policy_number: '',
    pi_policy_validity: '',
    mlc_certificate_no: '',
    mlc_issue_date: '',
    mlc_expiry_date: '',
    financial_security_doc_number: '',
    financial_security_validity: '',
    sea_agreement_url: '',
    cba_agreement_url: '',
    pi_policy_url: '',
    mlc_certificate_url: '',
    financial_security_url: '',
    dmlc_part1_url: '',
    dmlc_part2_url: '',
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
      official_number: '',
      kilo_watt: '',
      sea_refers_cba: false,
      pi_policy_number: '',
      pi_policy_validity: '',
      mlc_certificate_no: '',
      mlc_issue_date: '',
      mlc_expiry_date: '',
      financial_security_doc_number: '',
      financial_security_validity: '',
      sea_agreement_url: '',
      cba_agreement_url: '',
      pi_policy_url: '',
      mlc_certificate_url: '',
      financial_security_url: '',
      dmlc_part1_url: '',
      dmlc_part2_url: '',
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
      official_number: ship.official_number || '',
      kilo_watt: ship.kilo_watt?.toString() || '',
      sea_refers_cba: ship.sea_refers_cba || false,
      pi_policy_number: ship.pi_policy_number || '',
      pi_policy_validity: ship.pi_policy_validity ? ship.pi_policy_validity.split('T')[0] : '',
      mlc_certificate_no: ship.mlc_certificate_no || '',
      mlc_issue_date: ship.mlc_issue_date ? ship.mlc_issue_date.split('T')[0] : '',
      mlc_expiry_date: ship.mlc_expiry_date ? ship.mlc_expiry_date.split('T')[0] : '',
      financial_security_doc_number: ship.financial_security_doc_number || '',
      financial_security_validity: ship.financial_security_validity ? ship.financial_security_validity.split('T')[0] : '',
      sea_agreement_url: ship.sea_agreement_url || '',
      cba_agreement_url: ship.cba_agreement_url || '',
      pi_policy_url: ship.pi_policy_url || '',
      mlc_certificate_url: ship.mlc_certificate_url || '',
      financial_security_url: ship.financial_security_url || '',
      dmlc_part1_url: ship.dmlc_part1_url || '',
      dmlc_part2_url: ship.dmlc_part2_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (ship: ShipResponse) => {
    setSelectedShip(ship);
    setIsDeleteDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [fieldName]: true }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('category', 'VESSEL_DOCUMENTS');
      formDataObj.append('subcategory', formData.name || 'unnamed_vessel');

      const response = await fetch(`${API_BASE_URL}/api/v1/uploads/?category=VESSEL_DOCUMENTS&subcategory=${formData.name || 'unnamed_vessel'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload file');
      }

      const { url } = await response.json();
      setFormData(prev => ({ ...prev, [fieldName]: url }));
      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
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
        official_number: formData.official_number || undefined,
        kilo_watt: formData.kilo_watt ? parseFloat(formData.kilo_watt) : undefined,
        sea_refers_cba: formData.sea_refers_cba,
        pi_policy_number: formData.pi_policy_number || undefined,
        pi_policy_validity: formData.pi_policy_validity || undefined,
        mlc_certificate_no: formData.mlc_certificate_no || undefined,
        mlc_issue_date: formData.mlc_issue_date || undefined,
        mlc_expiry_date: formData.mlc_expiry_date || undefined,
        financial_security_doc_number: formData.financial_security_doc_number || undefined,
        financial_security_validity: formData.financial_security_validity || undefined,
        sea_agreement_url: formData.sea_agreement_url || undefined,
        cba_agreement_url: formData.cba_agreement_url || undefined,
        pi_policy_url: formData.pi_policy_url || undefined,
        mlc_certificate_url: formData.mlc_certificate_url || undefined,
        financial_security_url: formData.financial_security_url || undefined,
        dmlc_part1_url: formData.dmlc_part1_url || undefined,
        dmlc_part2_url: formData.dmlc_part2_url || undefined,
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
        official_number: formData.official_number || undefined,
        kilo_watt: formData.kilo_watt ? parseFloat(formData.kilo_watt) : undefined,
        sea_refers_cba: formData.sea_refers_cba,
        pi_policy_number: formData.pi_policy_number || undefined,
        pi_policy_validity: formData.pi_policy_validity || undefined,
        mlc_certificate_no: formData.mlc_certificate_no || undefined,
        mlc_issue_date: formData.mlc_issue_date || undefined,
        mlc_expiry_date: formData.mlc_expiry_date || undefined,
        financial_security_doc_number: formData.financial_security_doc_number || undefined,
        financial_security_validity: formData.financial_security_validity || undefined,
        sea_agreement_url: formData.sea_agreement_url || undefined,
        cba_agreement_url: formData.cba_agreement_url || undefined,
        pi_policy_url: formData.pi_policy_url || undefined,
        mlc_certificate_url: formData.mlc_certificate_url || undefined,
        financial_security_url: formData.financial_security_url || undefined,
        dmlc_part1_url: formData.dmlc_part1_url || undefined,
        dmlc_part2_url: formData.dmlc_part2_url || undefined,
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vessel</DialogTitle>
            <DialogDescription>Enter the technical specifications and registration details for the new vessel.</DialogDescription>
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

            {/* DG Shipping / e-Samudra Fields */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">DG Shipping Details</h4>
            </div>
            <div className="space-y-2">
              <Label>Official Number</Label>
              <Input value={formData.official_number} onChange={(e) => setFormData({...formData, official_number: e.target.value})} placeholder="Official number" />
            </div>
            <div className="space-y-2">
              <Label>Kilo Watt</Label>
              <Input type="number" value={formData.kilo_watt} onChange={(e) => setFormData({...formData, kilo_watt: e.target.value})} placeholder="Engine power in KW" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>SEA refers to CBA?</Label>
              <Select value={formData.sea_refers_cba ? 'yes' : 'no'} onValueChange={(v) => setFormData({...formData, sea_refers_cba: v === 'yes'})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seafarer Employment Agreement (SEA)</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'sea_agreement_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['sea_agreement_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.sea_agreement_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collective Bargaining Agreement (CBA)</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'cba_agreement_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['cba_agreement_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.cba_agreement_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            {/* P&I Details */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">P & I Details</h4>
            </div>
            <div className="space-y-2">
              <Label>P & I Policy Number</Label>
              <Input value={formData.pi_policy_number} onChange={(e) => setFormData({...formData, pi_policy_number: e.target.value})} placeholder="Policy number" />
            </div>
            <div className="space-y-2">
              <Label>Policy Date of Validity</Label>
              <Input type="date" value={formData.pi_policy_validity} onChange={(e) => setFormData({...formData, pi_policy_validity: e.target.value})} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>P & I Policy document</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'pi_policy_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['pi_policy_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.pi_policy_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            {/* MLC Details */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">MLC Details</h4>
            </div>
            <div className="space-y-2">
              <Label>MLC Certificate No.</Label>
              <Input value={formData.mlc_certificate_no} onChange={(e) => setFormData({...formData, mlc_certificate_no: e.target.value})} placeholder="Certificate number" />
            </div>
            <div className="space-y-2">
              <Label>Date of Issue</Label>
              <Input type="date" value={formData.mlc_issue_date} onChange={(e) => setFormData({...formData, mlc_issue_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Date of Expiry</Label>
              <Input type="date" value={formData.mlc_expiry_date} onChange={(e) => setFormData({...formData, mlc_expiry_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Financial Security Doc No.</Label>
              <Input value={formData.financial_security_doc_number} onChange={(e) => setFormData({...formData, financial_security_doc_number: e.target.value})} placeholder="Document number" />
            </div>
            <div className="space-y-2">
              <Label>Financial Security Validity</Label>
              <Input type="date" value={formData.financial_security_validity} onChange={(e) => setFormData({...formData, financial_security_validity: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>MLC Certificate</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'mlc_certificate_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['mlc_certificate_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.mlc_certificate_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Financial Security Document</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'financial_security_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['financial_security_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.financial_security_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>DMLC Part 1</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'dmlc_part1_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['dmlc_part1_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.dmlc_part1_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>DMLC Part 2</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'dmlc_part2_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['dmlc_part2_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.dmlc_part2_url && <FileCheck className="w-4 h-4 text-green-500 self-center" />}
              </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vessel</DialogTitle>
            <DialogDescription>Update the registration, technical, and compliance details for this vessel.</DialogDescription>
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

            {/* DG Shipping / e-Samudra Fields */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">DG Shipping Details</h4>
            </div>
            <div className="space-y-2">
              <Label>Official Number</Label>
              <Input value={formData.official_number} onChange={(e) => setFormData({...formData, official_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Kilo Watt</Label>
              <Input type="number" value={formData.kilo_watt} onChange={(e) => setFormData({...formData, kilo_watt: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>SEA refers to CBA?</Label>
              <Select value={formData.sea_refers_cba ? 'yes' : 'no'} onValueChange={(v) => setFormData({...formData, sea_refers_cba: v === 'yes'})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seafarer Employment Agreement (SEA)</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'sea_agreement_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['sea_agreement_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.sea_agreement_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.sea_agreement_url.startsWith('http') ? formData.sea_agreement_url : `${API_BASE_URL}${formData.sea_agreement_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collective Bargaining Agreement (CBA)</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'cba_agreement_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['cba_agreement_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.cba_agreement_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.cba_agreement_url.startsWith('http') ? formData.cba_agreement_url : `${API_BASE_URL}${formData.cba_agreement_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* P&I Details */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">P & I Details</h4>
            </div>
            <div className="space-y-2">
              <Label>P & I Policy Number</Label>
              <Input value={formData.pi_policy_number} onChange={(e) => setFormData({...formData, pi_policy_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Policy Date of Validity</Label>
              <Input type="date" value={formData.pi_policy_validity} onChange={(e) => setFormData({...formData, pi_policy_validity: e.target.value})} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>P & I Policy document</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'pi_policy_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['pi_policy_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.pi_policy_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.pi_policy_url.startsWith('http') ? formData.pi_policy_url : `${API_BASE_URL}${formData.pi_policy_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* MLC Details */}
            <div className="col-span-2 border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">MLC Details</h4>
            </div>
            <div className="space-y-2">
              <Label>MLC Certificate No.</Label>
              <Input value={formData.mlc_certificate_no} onChange={(e) => setFormData({...formData, mlc_certificate_no: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Date of Issue</Label>
              <Input type="date" value={formData.mlc_issue_date} onChange={(e) => setFormData({...formData, mlc_issue_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Date of Expiry</Label>
              <Input type="date" value={formData.mlc_expiry_date} onChange={(e) => setFormData({...formData, mlc_expiry_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Financial Security Doc No.</Label>
              <Input value={formData.financial_security_doc_number} onChange={(e) => setFormData({...formData, financial_security_doc_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Financial Security Validity</Label>
              <Input type="date" value={formData.financial_security_validity} onChange={(e) => setFormData({...formData, financial_security_validity: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>MLC Certificate</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'mlc_certificate_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['mlc_certificate_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.mlc_certificate_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.mlc_certificate_url.startsWith('http') ? formData.mlc_certificate_url : `${API_BASE_URL}${formData.mlc_certificate_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Financial Security Document</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'financial_security_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['financial_security_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.financial_security_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.financial_security_url.startsWith('http') ? formData.financial_security_url : `${API_BASE_URL}${formData.financial_security_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>DMLC Part 1</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'dmlc_part1_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['dmlc_part1_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.dmlc_part1_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.dmlc_part1_url.startsWith('http') ? formData.dmlc_part1_url : `${API_BASE_URL}${formData.dmlc_part1_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>DMLC Part 2</Label>
              <div className="flex gap-2">
                <Input type="file" onChange={(e) => handleFileUpload(e, 'dmlc_part2_url')} className="cursor-pointer" accept=".pdf" />
                {uploading['dmlc_part2_url'] && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                {formData.dmlc_part2_url && (
                  <div className="flex gap-1 self-center">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    <a href={formData.dmlc_part2_url.startsWith('http') ? formData.dmlc_part2_url : `${API_BASE_URL}${formData.dmlc_part2_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                    </a>
                  </div>
                )}
              </div>
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
            <DialogDescription>This action cannot be undone. This will permanently delete the vessel and all associated records.</DialogDescription>
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
