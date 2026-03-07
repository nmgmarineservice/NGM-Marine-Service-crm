import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ClipboardCheck,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    Ship,
    Plus,
    Users,
    Search,
    Trash2,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { documentService } from '@/services/documents';
import { userApi, shipsApi, UserResponse, ShipResponse } from '@/services/api'; // Use centralized API
import { FormSubmission, FormStatus, FormTemplate, AssignedRole } from '@/types/documents';
import { toast } from 'sonner';
import { FormRenderer } from '@/components/documents/FormRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

const StatusBadge = ({ status }: { status: FormStatus }) => {
    const styles = {
        [FormStatus.PENDING]: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        [FormStatus.SUBMITTED]: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        [FormStatus.APPROVED]: "bg-green-100 text-green-800 hover:bg-green-100",
        [FormStatus.REJECTED]: "bg-red-100 text-red-800 hover:bg-red-100",
        [FormStatus.FLAGGED]: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    };

    return <Badge className={styles[status] || ""} variant="outline">
        {status.toUpperCase()}
    </Badge>;
};

export default function Submissions() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'action'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Trigger Work State
    const [triggerOpen, setTriggerOpen] = useState(false);
    const [step, setStep] = useState(1); // 1 = Vessel/Template, 2 = Crew
    const [ships, setShips] = useState<ShipResponse[]>([]);
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [selectedVessel, setSelectedVessel] = useState<string>('');
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [crewMembers, setCrewMembers] = useState<UserResponse[]>([]);
    const [assignmentType, setAssignmentType] = useState<'all' | 'select'>('all');
    const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
    const [triggering, setTriggering] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');
    const [crewSearchQuery, setCrewSearchQuery] = useState('');

    // Fill Form State
    const [fillOpen, setFillOpen] = useState(false);
    const [activeSubmission, setActiveSubmission] = useState<FormSubmission | null>(null);
    const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const isMaster = user?.role === 'master';
    const isStaff = user?.role === 'staff';
    const isCrew = user?.role === 'crew';

    useEffect(() => {
        loadSubmissions();
        if (isStaff || isMaster) {
            loadTriggerData();
        }
    }, [user]);

    // Cleanup trigger state when dialog closes
    useEffect(() => {
        if (!triggerOpen) {
            setStep(1);
            setSelectedVessel('');
            setSelectedTemplateIds([]);
            setCrewMembers([]);
            setAssignmentType('all');
            setSelectedCrewIds([]);
            setTemplateSearchQuery('');
            setCrewSearchQuery('');
        }
    }, [triggerOpen]);

    // Fetch crew when vessel changes
    useEffect(() => {
        if (selectedVessel) {
            fetchCrew(selectedVessel);
        } else {
            setCrewMembers([]);
        }
    }, [selectedVessel]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            const response = await documentService.getSubmissions();
            if (response.data) {
                setSubmissions(response.data);
            }
        } catch (error) {
            console.error('Failed to load submissions:', error);
            toast.error('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const loadTriggerData = async () => {
        try {
            const [shipsRes, templatesRes] = await Promise.all([
                shipsApi.getAllShips(),
                documentService.getTemplates()
            ]);
            if (shipsRes.data) setShips(shipsRes.data);
            if (templatesRes.data) setTemplates(templatesRes.data);
        } catch (error) {
            console.error("Failed to load trigger options", error);
        }
    };

    const fetchCrew = async (shipId: string) => {
        try {
            const res = await userApi.getUsersByShip(shipId);
            if (res.data) {
                // Filter for CREW role only
                const crew = res.data.filter(u => u.role === AssignedRole.CREW);
                setCrewMembers(crew);
            }
        } catch (error) {
            console.error("Failed to fetch crew", error);
        }
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!selectedVessel) return toast.error("Please select a vessel");
            if (selectedTemplateIds.length === 0) return toast.error("Please select at least one template");
            setStep(2);
        }
    };

    const handleBackStep = () => {
        setStep(1);
    };

    const handleTriggerWork = async () => { // Modified to only validate step 2 requirements
        if (assignmentType === 'select' && selectedCrewIds.length === 0) return toast.error("Please select crew members");

        try {
            setTriggering(true);
            await documentService.triggerWork({
                vessel_id: selectedVessel,
                template_ids: selectedTemplateIds,
                assign_to_all_crew: assignmentType === 'all',
                assigned_crew_ids: assignmentType === 'select' ? selectedCrewIds : undefined
            });
            toast.success("Work Triggered Successfully");
            setTriggerOpen(false);
            loadSubmissions();
        } catch (error) {
            console.error(error);
            toast.error("Failed to trigger work");
        } finally {
            setTriggering(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await documentService.approveSubmission(id);
            toast.success("Submission Approved");
            loadSubmissions();
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleDeleteSubmission = async (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the submission for "${name}"?`)) return;

        try {
            setDeletingId(id);
            await documentService.deleteSubmission(id);
            toast.success("Submission deleted");
            loadSubmissions();
        } catch (error) {
            toast.error("Failed to delete submission");
        } finally {
            setDeletingId(null);
        }
    };

    const handleFill = async (sub: FormSubmission, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { data: template } = await documentService.getTemplate(sub.template_id);
            setActiveTemplate(template);
            setActiveSubmission(sub);
            setFormData(sub.filled_data || {});
            setFillOpen(true);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load form template");
        }
    };

    const handleView = async (sub: FormSubmission, e: React.MouseEvent) => {
        e.stopPropagation();
        handleFill(sub, e);
    };

    const handleSaveForm = async (status: FormStatus = FormStatus.PENDING) => {
        if (!activeSubmission) return;
        try {
            setSaving(true);
            await documentService.updateSubmission(activeSubmission.id, {
                filled_data: formData,
                status: status
            });
            toast.success(status === FormStatus.SUBMITTED ? "Form Submitted" : "Progress Saved");
            setFillOpen(false);
            loadSubmissions();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save form");
        } finally {
            setSaving(false);
        }
    };

    const filteredSubmissions = submissions.filter(sub => {
        // Crew can only see forms assigned to them
        if (isCrew && sub.assigned_to !== user?.id) {
            return false;
        }

        // Apply search filter
        const matchesSearch = sub.template_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             sub.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             sub.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             sub.submitted_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        // Apply tab filters
        if (filter === 'pending') {
            return sub.status === FormStatus.PENDING;
        }
        if (filter === 'action') {
            // Master: Forms that need approval (submitted status)
            if (isMaster) return sub.status === FormStatus.SUBMITTED;
            // Crew: Forms assigned to them that are pending (to do)
            if (isCrew) return sub.status === FormStatus.PENDING && sub.assigned_to === user?.id;
            // Staff: All forms needing action (submitted for approval)
            if (isStaff) return sub.status === FormStatus.SUBMITTED;
            return false;
        }
        return true; // 'all' filter
    });

    const toggleTemplate = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const toggleCrew = (id: string) => {
        setSelectedCrewIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );

    const filteredCrew = crewMembers.filter(c => 
        c.name.toLowerCase().includes(crewSearchQuery.toLowerCase()) ||
        c.position?.toLowerCase().includes(crewSearchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Form Submissions</h1>
                    <p className="text-muted-foreground mt-2">
                        {isCrew ? "Your assigned forms and reports." : "Track and approve fleet form submissions."}
                    </p>
                </div>
                {(isStaff || isMaster) && (
                    <Button variant="default" onClick={() => setTriggerOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" /> Trigger Work
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)} className="w-full md:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">All Forms</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="action">
                            {isMaster ? "Needs Approval" : (isCrew ? "To Do" : "Action Required")}
                            {filteredSubmissions.length > 0 && filter === 'action' && (
                                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2">
                                    {filteredSubmissions.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search submissions..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

                <div className="grid gap-4 mt-6">
                    {filteredSubmissions.map((sub) => (
                        <Card key={sub.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-muted rounded-full">
                                            {sub.status === FormStatus.APPROVED ? <CheckCircle2 className="text-green-600" /> : <ClipboardCheck />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{sub.template_name}</h3>
                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Ship className="w-3 h-3" />
                                                    {sub.vessel_name}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Updated: {new Date(sub.updated_at).toLocaleDateString()}
                                                </div>
                                                {sub.assigned_to_name && (
                                                    <div className="flex items-center gap-1 text-primary">
                                                        <User className="w-3 h-3" />
                                                        Assigned To: {sub.assigned_to_name}
                                                    </div>
                                                )}
                                                {sub.submitted_by_name && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        By: {sub.submitted_by_name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <StatusBadge status={sub.status} />

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={(e) => handleView(sub, e)}>
                                                {isMaster ? "Review" : "View"}
                                            </Button>

                                            {isCrew && sub.status === FormStatus.PENDING && (
                                                <Button size="sm" onClick={(e) => handleFill(sub, e)}>Fill Form</Button>
                                            )}

                                            {isMaster && sub.status === FormStatus.SUBMITTED && (
                                                <Button size="sm" onClick={(e) => handleApprove(sub.id, e)} className="bg-green-600 hover:bg-green-700">
                                                    Approve
                                                </Button>
                                            )}

                                            {(isStaff || isMaster) && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-destructive h-8 w-8"
                                                    onClick={(e) => handleDeleteSubmission(sub.id, sub.template_name, e)}
                                                    disabled={deletingId === sub.id}
                                                >
                                                    {deletingId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredSubmissions.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                            No submissions found.
                        </div>
                    )}
                </div>

            {/* Trigger Work Dialog */}
            <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
                <DialogContent className="max-w-3xl" style={{ height: '85vh', maxHeight: '85vh' }}>
                    <DialogHeader>
                        <DialogTitle>Trigger Work - Step {step} of 2</DialogTitle>
                        <DialogDescription>
                            {step === 1 ? "Select vessel and templates to assign" : "Choose crew members to receive the forms"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step 1: Vessel & Templates */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4" style={{ height: 'calc(85vh - 180px)' }}>
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Select Vessel</Label>
                                <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a ship..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ships.map(ship => (
                                            <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2" style={{ flex: 1, minHeight: 0 }}>
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">
                                        Select Templates ({selectedTemplateIds.length} selected)
                                    </Label>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search templates..."
                                            className="pl-8 h-8 text-xs"
                                            value={templateSearchQuery}
                                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div
                                    className="border rounded-lg overflow-y-auto p-3 space-y-2 bg-muted/30"
                                    style={{ height: '100%' }}
                                >
                                    {filteredTemplates.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                            {templates.length === 0 ? "No templates available" : "No templates match your search"}
                                        </div>
                                    ) : (
                                        filteredTemplates.map(t => (
                                            <div
                                                key={t.id}
                                                className="flex items-start gap-3 p-3 hover:bg-background rounded-md cursor-pointer transition-colors border bg-background"
                                                onClick={() => toggleTemplate(t.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedTemplateIds.includes(t.id)}
                                                    onCheckedChange={() => toggleTemplate(t.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm">{t.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {t.category} • {t.scheduled}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Crew Assignment */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4" style={{ height: 'calc(85vh - 180px)' }}>
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Assignment Type</Label>
                                <RadioGroup
                                    value={assignmentType}
                                    onValueChange={(v: any) => setAssignmentType(v)}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                        <RadioGroupItem value="all" id="r-all" />
                                        <Label htmlFor="r-all" className="cursor-pointer flex-1">
                                            Assign to All Crew on {ships.find(s => s.id === selectedVessel)?.name}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                        <RadioGroupItem value="select" id="r-select" />
                                        <Label htmlFor="r-select" className="cursor-pointer flex-1">
                                            Select Specific Crew Members
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {assignmentType === 'select' && (
                                <div className="flex flex-col gap-2" style={{ flex: 1, minHeight: 0 }}>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">
                                            Crew Members ({selectedCrewIds.length} selected)
                                        </Label>
                                        <div className="relative w-48">
                                            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Search crew..."
                                                className="pl-8 h-8 text-xs"
                                                value={crewSearchQuery}
                                                onChange={(e) => setCrewSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="border rounded-lg overflow-y-auto p-3 space-y-2 bg-muted/30"
                                        style={{ height: '100%' }}
                                    >
                                        {filteredCrew.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-8">
                                                {crewMembers.length === 0 ? "No crew members found on this ship" : "No crew match your search"}
                                            </div>
                                        ) : (
                                            filteredCrew.map(c => (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center gap-3 p-3 hover:bg-background rounded-md cursor-pointer transition-colors border bg-background"
                                                    onClick={() => toggleCrew(c.id)}
                                                >
                                                    <Checkbox
                                                        checked={selectedCrewIds.includes(c.id)}
                                                        onCheckedChange={() => toggleCrew(c.id)}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">{c.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {c.position || "Crew Member"}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex justify-between items-center gap-2">
                        <Button variant="ghost" onClick={() => setTriggerOpen(false)}>
                            Cancel
                        </Button>

                        <div className="flex gap-2">
                            {step === 2 && (
                                <Button variant="outline" onClick={handleBackStep}>
                                    Back
                                </Button>
                            )}

                            {step === 1 ? (
                                <Button onClick={handleNextStep}>
                                    Next →
                                </Button>
                            ) : (
                                <Button onClick={handleTriggerWork} disabled={triggering}>
                                    {triggering ? "Sending..." : "Send to Crew"}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fill/View Dialog */}
            <Dialog open={fillOpen} onOpenChange={setFillOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{activeTemplate?.name}</DialogTitle>
                        <div className="text-sm text-muted-foreground">
                            {activeSubmission?.vessel_name} - {activeSubmission?.status}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 px-1">
                        {activeTemplate && (
                            <FormRenderer
                                template={activeTemplate}
                                initialData={formData}
                                onChange={setFormData}
                                readOnly={!isCrew || activeSubmission?.status !== FormStatus.PENDING}
                            />
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setFillOpen(false)}>Close</Button>
                        {isCrew && activeSubmission?.status === FormStatus.PENDING && (
                            <>
                                <Button variant="outline" onClick={() => handleSaveForm(FormStatus.PENDING)} disabled={saving}>
                                    Save Draft
                                </Button>
                                <Button onClick={() => handleSaveForm(FormStatus.SUBMITTED)} disabled={saving}>
                                    {saving ? "Submitting..." : "Submit to Master"}
                                </Button>
                            </>
                        )}
                        {isMaster && activeSubmission?.status === FormStatus.SUBMITTED && (
                            <Button onClick={(e) => {
                                handleApprove(activeSubmission.id, e as any);
                                setFillOpen(false);
                            }} className="bg-green-600 hover:bg-green-700">
                                Approve Form
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
