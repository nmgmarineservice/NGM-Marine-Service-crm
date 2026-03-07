import React, { useState, useEffect } from 'react';
import { Plus, Filter, User, Pencil, Trash2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { recruitmentApi, shipsApi, onboardingApi, CandidateResponse, CandidateCreate, CandidateUpdate, ShipResponse, RecruitmentStage, CandidateSource } from '../services/api';
import { toast } from 'sonner';

const columns: { id: RecruitmentStage; title: string; color: string }[] = [
  { id: 'applied', title: 'Applied', color: 'bg-muted' },
  { id: 'shortlisted1', title: 'Shortlisted Round 1', color: 'bg-blue-50' },
  { id: 'shortlisted2', title: 'Shortlisted Round 2', color: 'bg-blue-100' },
  { id: 'final', title: 'Final Selection', color: 'bg-yellow-50' },
  { id: 'prejoining', title: 'Pre-Joining Issued', color: 'bg-green-50' },
  { id: 'accepted', title: 'Accepted', color: 'bg-green-100' },
];

const sourceColors: Record<string, string> = {
  'Website': 'bg-primary text-primary-foreground',
  'Agent': 'bg-accent text-accent-foreground',
  'Referral': 'bg-warning text-warning-foreground',
  'Direct': 'bg-secondary text-secondary-foreground',
};

export function Recruitment() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [ships, setShips] = useState<ShipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [vesselFilter, setVesselFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResponse | null>(null);
  const [isTriggerDialogOpen, setIsTriggerDialogOpen] = useState(false);
  const [triggerCrewId, setTriggerCrewId] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rank: '',
    experience: '',
    vessel_id: 'none',
    source: 'Website' as CandidateSource,
    stage: 'applied' as RecruitmentStage,
    notes: '',
  });

  const isMaster = user?.role === 'master';
  const isStaffOrMaster = user?.role === 'master' || user?.role === 'staff';

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [candidatesResponse, shipsResponse] = await Promise.all([
          recruitmentApi.getAllCandidates(),
          shipsApi.getAllShips()
        ]);

        if (candidatesResponse.error) {
          throw new Error(candidatesResponse.error);
        }
        if (shipsResponse.error) {
          throw new Error(shipsResponse.error);
        }

        setCandidates(candidatesResponse.data || []);
        setShips(shipsResponse.data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const loadCandidates = async () => {
    try {
      const response = await recruitmentApi.getAllCandidates();
      if (response.error) {
        throw new Error(response.error);
      }
      setCandidates(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load candidates';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      rank: '',
      experience: '',
      vessel_id: 'none',
      source: 'Website',
      stage: 'applied',
      notes: '',
    });
  };

  const openEditDialog = (candidate: CandidateResponse) => {
    setSelectedCandidate(candidate);
    setFormData({
      name: candidate.name,
      email: candidate.email || '',
      phone: candidate.phone || '',
      rank: candidate.rank,
      experience: candidate.experience,
      vessel_id: candidate.vessel_id || 'none',
      source: candidate.source,
      stage: candidate.stage,
      notes: candidate.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (candidate: CandidateResponse) => {
    setSelectedCandidate(candidate);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateCandidate = async () => {
    if (!formData.name || !formData.rank || !formData.experience) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const candidateData: CandidateCreate = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        rank: formData.rank,
        experience: formData.experience,
        vessel_id: formData.vessel_id === 'none' ? undefined : formData.vessel_id,
        source: formData.source,
        stage: formData.stage,
        notes: formData.notes || undefined,
      };

      const response = await recruitmentApi.createCandidate(candidateData);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadCandidates();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Candidate added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create candidate';
      toast.error(errorMessage);
    }
  };

  const handleUpdateCandidate = async () => {
    if (!selectedCandidate) return;

    try {
      const updateData: CandidateUpdate = {
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        rank: formData.rank || undefined,
        experience: formData.experience || undefined,
        vessel_id: formData.vessel_id === 'none' ? null : formData.vessel_id,
        source: formData.source,
        stage: formData.stage,
        notes: formData.notes || undefined,
      };

      const response = await recruitmentApi.updateCandidate(selectedCandidate.id, updateData);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadCandidates();
      setIsEditDialogOpen(false);
      setSelectedCandidate(null);
      resetForm();
      toast.success('Candidate updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update candidate';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedCandidate) return;

    try {
      const response = await recruitmentApi.deleteCandidate(selectedCandidate.id);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadCandidates();
      setIsDeleteDialogOpen(false);
      setSelectedCandidate(null);
      toast.success('Candidate deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete candidate';
      toast.error(errorMessage);
    }
  };

  const handleMoveStage = async (candidate: CandidateResponse, direction: 'next' | 'prev') => {
    const currentIndex = columns.findIndex(c => c.id === candidate.stage);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    const newStage = columns[newIndex].id;

    try {
      const response = await recruitmentApi.moveCandidateStage(candidate.id, newStage);
      if (response.error) {
        throw new Error(response.error);
      }

      await loadCandidates();
      toast.success(`Candidate moved to ${columns[newIndex].title}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move candidate';
      toast.error(errorMessage);
    }
  };

  const handleTriggerOnboarding = (candidate: CandidateResponse) => {
    setSelectedCandidate(candidate);
    setIsTriggerDialogOpen(true);
    setTriggerCrewId(''); 
  };

  const confirmTriggerOnboarding = async () => {
    if (!selectedCandidate || !triggerCrewId) {
        toast.error("Please enter a Crew ID");
        return;
    }
    try {
        const res = await onboardingApi.trigger(selectedCandidate.id, triggerCrewId);
        if (res.error) throw new Error(res.error);
        
        toast.success("Onboarding triggered successfully");
        setIsTriggerDialogOpen(false);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to trigger onboarding';
        toast.error(errorMessage);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesVessel = vesselFilter === 'all' || candidate.vessel_id === vesselFilter;
    const matchesRank = rankFilter === 'all' || candidate.rank.toLowerCase().includes(rankFilter.toLowerCase());
    return matchesVessel && matchesRank;
  });

  // Group candidates by stage
  const getCandidatesByStage = (stage: RecruitmentStage) => {
    return filteredCandidates.filter(c => c.stage === stage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading candidates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-foreground">Recruitment Pipeline</h2>
          <p className="text-sm text-muted-foreground">Track candidate applications and hiring progress</p>
        </div>
        {isStaffOrMaster && (
          <>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={(e: React.MouseEvent) => { e.preventDefault(); resetForm(); setIsCreateDialogOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
            <Button 
              className="ml-2 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => window.location.href = '/recruitment/onboarding-management'}
            >
              Manage Onboarding
            </Button>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={vesselFilter} onValueChange={setVesselFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Vessel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vessels</SelectItem>
              {ships.map(ship => (
                <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Rank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ranks</SelectItem>
              <SelectItem value="Officer">Officers</SelectItem>
              <SelectItem value="Engineer">Engineers</SelectItem>
              <SelectItem value="Ratings">Ratings</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((column, columnIndex) => {
            const stageCandidates = getCandidatesByStage(column.id);
            
            return (
              <div key={column.id} className="w-80 flex-shrink-0">
                <div className="bg-card rounded-lg border border-border">
                  {/* Column Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-foreground">{column.title}</h3>
                      <Badge variant="outline" className="bg-muted">
                        {stageCandidates.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
                    {stageCandidates.map((candidate) => (
                      <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {candidate.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground mb-1">
                                {candidate.name}
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                {candidate.rank}
                              </div>
                              {candidate.vessel_name && (
                                <div className="text-xs text-muted-foreground mb-2">
                                  For: {candidate.vessel_name}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mb-2">
                                Experience: {candidate.experience}
                              </div>
                              <Badge className={`${sourceColors[candidate.source]} text-xs`}>
                                {candidate.source}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          {isStaffOrMaster && (
                            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  {columnIndex > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleMoveStage(candidate, 'prev')}
                                      title="Move to previous stage"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {columnIndex < columns.length - 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleMoveStage(candidate, 'next')}
                                      title="Move to next stage"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openEditDialog(candidate)}
                                    title="Edit candidate"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {isMaster && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                      onClick={() => openDeleteDialog(candidate)}
                                      title="Delete candidate"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Trigger Onboarding Button for Accepted Candidates */}
                              {column.id === 'accepted' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs border-green-200 hover:bg-green-50 text-green-700"
                                  onClick={() => handleTriggerOnboarding(candidate)}
                                >
                                  Trigger Onboarding
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {stageCandidates.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <User className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">No candidates</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Candidate Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Rank *</Label>
              <Input value={formData.rank} onChange={(e) => setFormData({...formData, rank: e.target.value})} placeholder="Chief Officer, AB Seaman, etc." />
            </div>
            <div className="space-y-2">
              <Label>Experience *</Label>
              <Input value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} placeholder="5 years" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(value: CandidateSource) => setFormData({...formData, source: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>For Vessel</Label>
              <Select value={formData.vessel_id} onValueChange={(value: string) => setFormData({...formData, vessel_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vessel assigned</SelectItem>
                  {ships.map(ship => (
                    <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCandidate}>Add Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Rank</Label>
              <Input value={formData.rank} onChange={(e) => setFormData({...formData, rank: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Input value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(value: CandidateSource) => setFormData({...formData, source: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={formData.stage} onValueChange={(value: RecruitmentStage) => setFormData({...formData, stage: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>For Vessel</Label>
              <Select value={formData.vessel_id} onValueChange={(value: string) => setFormData({...formData, vessel_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vessel (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vessel assigned</SelectItem>
                  {ships.map(ship => (
                    <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateCandidate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Candidate</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete <strong>{selectedCandidate?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCandidate}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
