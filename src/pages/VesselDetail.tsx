import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ship, Users, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { shipsApi, ShipResponse, ShipUpdate, userApi, UserResponse } from '../services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';


export function VesselDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ship, setShip] = useState<ShipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignCrewOpen, setIsAssignCrewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<ShipUpdate>>({});
  
  // State for assigned crew
  const [assignedCrew, setAssignedCrew] = useState<UserResponse[]>([]);
  // Crew assignment state
  const [availableCrew, setAvailableCrew] = useState<UserResponse[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [assignRole, setAssignRole] = useState<string>('');

  useEffect(() => {
    if (id) {
        loadShip();
        loadAvailableCrew();
        loadAssignedCrew();
    }
  }, [id, navigate]);

  const loadShip = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await shipsApi.getShipById(id);
      if (response.error) throw new Error(response.error);
      if (response.data) {
          setShip(response.data);
          setEditFormData({
              name: response.data.name,
              type: response.data.type,
              status: response.data.status,
              imo_number: response.data.imo_number,
              flag_state: response.data.flag_state,
              gross_tonnage: response.data.gross_tonnage,
              built_year: response.data.built_year,
              owner: response.data.owner,
              operator: response.data.operator,
              call_sign: response.data.call_sign,
          });
      }
    } catch (error) {
      console.error('Failed to load ship:', error);
      toast.error('Failed to load vessel details');
      navigate('/vessels');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedCrew = async () => {
      if (!id) return;
      try {
          const response = await userApi.getUsersByShip(id);
          if (response.data) {
              setAssignedCrew(response.data);
          }
      } catch (error) {
          console.error("Failed to load assigned crew", error);
      }
  };

  const loadAvailableCrew = async () => {
      try {
          const response = await userApi.getAllUsers();
          if (response.data) {
              // Filter users who are crew members and not currently assigned to a ship
              const crewMembers = response.data.filter(user => user.role === 'crew' && !user.ship_id);
              setAvailableCrew(crewMembers);
          }
      } catch (error) {
          console.error("Failed to load crew", error);
      }
  };

   const handleRemoveCrew = async (userId: string) => {
        try {
             // Update user to remove ship_id. Note: backend/types might need update to allow nullable
            // Casting to unknown then any to bypass strict type check for null against string | undefined if backend types are strict
            const updateData: any = { ship_id: null, position: null };
            const response = await userApi.updateUser(userId, updateData); 
             if (response.error) throw new Error(response.error);
             
             toast.success('Crew member removed from vessel');
             loadAssignedCrew();
             loadAvailableCrew(); 
        } catch (error) {
            console.error("Failed to remove crew", error);
            toast.error("Failed to remove crew member");
        }
    };

  const handleAssignCrew = async () => {
      if (!ship?.id || !selectedCrewId) return;
      try {
          // 1. Update user to assign ship_id
          const userUpdateResponse = await userApi.updateUser(selectedCrewId, {
              ship_id: ship.id,
              position: assignRole
          });

          if (userUpdateResponse.error) throw new Error(userUpdateResponse.error);

          toast.success('Crew assigned successfully');
          setIsAssignCrewOpen(false);
          setSelectedCrewId('');
          setAssignRole('');
          
          loadShip();
          loadAvailableCrew();
          loadAssignedCrew(); 
      } catch (error) {
          console.error("Failed to assign crew", error);
          toast.error("Failed to assign crew member");
      }
  };

  const handleEditSubmit = async () => {
    if (!ship?.id) return;
    try {
        const response = await shipsApi.updateShip(ship.id, editFormData);
        if (response.error) throw new Error(response.error);
        toast.success('Vessel details updated');
        setShip(response.data || null);
        setIsEditOpen(false);
    } catch (error) {
        toast.error('Failed to update vessel');
    }
  };

  if (loading) {
    return (
      <div className="flex bg-background h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ship) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Vessels', href: '/vessels' },
          { label: ship.name },
        ]}
      />

      {/* Back Button */}
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/vessels')}>
        <ArrowLeft className="w-4 h-4" />
        Back to Vessels
      </Button>

      {/* Vessel Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Icon */}
            <div className="flex items-center justify-center md:justify-start">
              <div className="w-24 h-24 bg-primary/10 rounded-lg flex items-center justify-center">
                <Ship className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Right: Details */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-foreground mb-1">{ship.name}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{ship.imo_number}</span>
                    <span>•</span>
                    <span>{ship.type.replace('_', ' ').toUpperCase()}</span>
                    <span>•</span>
                    <span>Flag: {ship.flag_state}</span>
                  </div>
                </div>
                <Badge className={ship.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                  {ship.status.toUpperCase()}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="text-foreground">{ship.owner || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gross Tonnage</div>
                  <div className="text-foreground">{ship.gross_tonnage?.toLocaleString() || 'N/A'} GT</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Built</div>
                  <div className="text-foreground">{ship.built_year || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Crew</div>
                  <div className="text-foreground">{assignedCrew.length} / {25}</div> {/* Capacity hardcoded for now */}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button 
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setIsAssignCrewOpen(true)}
                >
                  Assign Crew
                </Button>
                <Button variant="outline" onClick={() => setIsEditOpen(true)}>Edit Details</Button>
                {/* Generate Report Removed */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="crew-onboard">Crew Onboard</TabsTrigger>
            {/* Removed Crew Planner, Documents, Reports tabs */}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-foreground mb-4">Vessel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Vessel Name</Label>
                  <Input value={ship.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>IMO Number</Label>
                  <Input value={ship.imo_number} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Ship Type</Label>
                  <Input value={ship.type.replace('_', ' ').toUpperCase()} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Flag</Label>
                  <Input value={ship.flag_state} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Gross Tonnage</Label>
                  <Input value={`${ship.gross_tonnage?.toLocaleString() || 'N/A'} GT`} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Built Year</Label>
                  <Input value={ship.built_year?.toString() || 'N/A'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input value={ship.owner || 'N/A'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Input value={ship.operator || 'N/A'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Call Sign</Label>
                  <Input value={ship.call_sign || 'N/A'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input value={ship.status.toUpperCase()} readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crew Onboard Tab */}
        <TabsContent value="crew-onboard">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-foreground">Crew Onboard ({assignedCrew.length})</h3>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsAssignCrewOpen(true)}>
                    <Users className="w-4 h-4" />
                    Assign New Crew
                  </Button>
                </div>
                {assignedCrew.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rank/Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedCrew.map((crew) => (
                      <TableRow key={crew.id}>
                        <TableCell>{crew.name}</TableCell>
                        <TableCell>{crew.position || 'N/A'}</TableCell>
                        <TableCell>{crew.email}</TableCell>
                        <TableCell>{crew.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={crew.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {crew.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveCrew(crew.id)}
                          >
                                Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No crew currently assigned to this vessel.
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Removed other TabsContent */}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Vessel Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="imo">IMO Number</Label>
                    <Input id="imo" value={editFormData.imo_number || ''} onChange={(e) => setEditFormData({...editFormData, imo_number: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={editFormData.type} onValueChange={(val) => setEditFormData({...editFormData, type: val})}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bulk_carrier">Bulk Carrier</SelectItem>
                            <SelectItem value="oil_tanker">Oil Tanker</SelectItem>
                            <SelectItem value="container_ship">Container Ship</SelectItem>
                            <SelectItem value="chemical_tanker">Chemical Tanker</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={editFormData.status} onValueChange={(val: any) => setEditFormData({...editFormData, status: val})}>
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
                <div className="grid gap-2">
                    <Label htmlFor="flag">Flag State</Label>
                    <Input id="flag" value={editFormData.flag_state || ''} onChange={(e) => setEditFormData({...editFormData, flag_state: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="gross_tonnage">Gross Tonnage</Label>
                    <Input id="gross_tonnage" type="number" value={editFormData.gross_tonnage || ''} onChange={(e) => setEditFormData({...editFormData, gross_tonnage: Number(e.target.value)})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="built_year">Built Year</Label>
                    <Input id="built_year" type="number" value={editFormData.built_year || ''} onChange={(e) => setEditFormData({...editFormData, built_year: Number(e.target.value)})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input id="owner" value={editFormData.owner || ''} onChange={(e) => setEditFormData({...editFormData, owner: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="operator">Operator</Label>
                    <Input id="operator" value={editFormData.operator || ''} onChange={(e) => setEditFormData({...editFormData, operator: e.target.value})} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="call_sign">Call Sign</Label>
                    <Input id="call_sign" value={editFormData.call_sign || ''} onChange={(e) => setEditFormData({...editFormData, call_sign: e.target.value})} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Crew Dialog */}
      <Dialog open={isAssignCrewOpen} onOpenChange={setIsAssignCrewOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Crew to {ship.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="crew-member">Crew Member</Label>
                    <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select crew member" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCrew.map((crew) => (
                                <SelectItem key={crew.id} value={crew.id}>
                                    {crew.name} ({crew.position || 'No Rank'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="role">Role on Vessel</Label>
                    <Input 
                        id="role" 
                        placeholder="e.g. Captain, Chief Engineer" 
                        value={assignRole} 
                        onChange={(e) => setAssignRole(e.target.value)} 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignCrewOpen(false)}>Cancel</Button>
                <Button onClick={handleAssignCrew} disabled={!selectedCrewId}>Assign Crew</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
