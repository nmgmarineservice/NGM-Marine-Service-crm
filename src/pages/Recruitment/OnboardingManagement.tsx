
import React, { useState, useEffect } from 'react';
import { onboardingApi, OnboardingResponse, OnboardingStatus, MasterReviewAction, AgreementPrepare } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Check, X, FileText, Eye, Upload, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export function OnboardingManagement() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<OnboardingResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<OnboardingStatus | 'all'>('all');

    // Review Dialog State
    const [selectedApp, setSelectedApp] = useState<OnboardingResponse | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [reviewing, setReviewing] = useState(false);

    // Agreement Dialog State
    const [isAgreementOpen, setIsAgreementOpen] = useState(false);
    const [agreementForm, setAgreementForm] = useState<AgreementPrepare>({
        agreement_url: '',
        vessel_name: '',
        crew_name: '',
        rank: '',
        joining_date: '',
        contract_duration: ''
    });
    const [preparing, setPreparing] = useState(false);

    const isMaster = user?.role === 'master';
    const isStaff = user?.role === 'staff';

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await onboardingApi.getAllApplications();
            if (res.error) throw new Error(res.error);
            setApplications(res.data || []);
        } catch (e: any) {
            toast.error(e.message || "Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleOpenReview = (app: OnboardingResponse) => {
        setSelectedApp(app);
        setRejectionReason('');
        setIsReviewOpen(true);
    };

    const submitReview = async (approved: boolean) => {
        if (!selectedApp) return;
        if (!approved && !rejectionReason) {
            toast.error("Rejection reason is required");
            return;
        }

        setReviewing(true);
        try {
            const action: MasterReviewAction = { approved, rejection_reason: approved ? undefined : rejectionReason };
            const res = await onboardingApi.masterReview(selectedApp.id, action);
            if (res.error) throw new Error(res.error);
            
            toast.success(approved ? "Application Approved" : "Application Rejected");
            setIsReviewOpen(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Review failed");
        } finally {
            setReviewing(false);
        }
    };

    const handleOpenAgreement = (app: OnboardingResponse) => {
        setSelectedApp(app);
        setAgreementForm({
            agreement_url: '',
            vessel_name: app.agreement_details?.vessel_name || '', // prefill if exists or logic to get from potential vessel assignment
            crew_name: app.application_data?.full_name || '',
            rank: app.agreement_details?.rank || '', 
            joining_date: new Date().toISOString().split('T')[0],
            contract_duration: '6 Months'
        });
        setIsAgreementOpen(true);
    };

    const submitAgreement = async () => {
        if (!selectedApp) return;
        setPreparing(true);
        try {
            const res = await onboardingApi.prepareAgreement(selectedApp.id, agreementForm);
            if (res.error) throw new Error(res.error);
            
            toast.success("Agreement Sent to Crew");
            setIsAgreementOpen(false);
            loadData();
        } catch (e: any) {
             toast.error(e.message || "Failed to send agreement");
        } finally {
            setPreparing(false);
        }
    };

    const filteredApps = applications.filter(app => statusFilter === 'all' || app.status === statusFilter);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Onboarding Management</h2>
                    <p className="text-muted-foreground">Manage crew applications and agreements</p>
                </div>
                <div className="flex items-center gap-2">
                     <Filter className="w-4 h-4 text-muted-foreground" />
                     <select 
                        className="p-2 border rounded-md text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                     >
                         <option value="all">All Statuses</option>
                         <option value="crew_onboarding_submitted">Submitted (Pending Review)</option>
                         <option value="crew_onboarding_approved_by_master">Master Approved</option>
                         <option value="agreement_uploaded">Agreement Uploaded</option>
                     </select>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Applications</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Candidate</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No applications found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredApps.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{app.application_data?.full_name || 'N/A'}</div>
                                                <div className="text-xs text-muted-foreground">ID: {app.candidate_id}</div>
                                            </TableCell>
                                            <TableCell>{app.application_data?.rank || 'N/A'}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={app.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isMaster && app.status === 'crew_onboarding_submitted' && (
                                                    <Button size="sm" onClick={() => handleOpenReview(app)}>
                                                        <Eye className="w-4 h-4 mr-1" /> Review
                                                    </Button>
                                                )}
                                                {(isStaff || isMaster) && app.status === 'crew_onboarding_approved_by_master' && (
                                                    <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleOpenAgreement(app)}>
                                                        <Upload className="w-4 h-4 mr-1" /> Upload Agreement
                                                    </Button>
                                                )}
                                                {/* View Only for other statuses */}
                                                {!((isMaster && app.status === 'crew_onboarding_submitted') || ((isStaff || isMaster) && app.status === 'crew_onboarding_approved_by_master')) && (
                                                     <Button size="sm" variant="ghost" onClick={() => {
                                                         setSelectedApp(app);
                                                         setIsReviewOpen(true); // Re-use review dialog for view-only
                                                     }}>
                                                        View Details
                                                     </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Review Dialog */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Review: {selectedApp?.application_data?.full_name}</DialogTitle>
                    </DialogHeader>
                    
                    {selectedApp && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><Label>Nationality</Label><div className="font-medium">{selectedApp.application_data?.nationality}</div></div>
                                <div><Label>Passport</Label><div className="font-medium">{selectedApp.application_data?.passport_number}</div></div>
                                <div><Label>Address</Label><div className="font-medium">{selectedApp.application_data?.address}</div></div>
                                {/* Add more fields */}
                            </div>
                            
                            {selectedApp.status === 'crew_onboarding_submitted' && isMaster ? (
                                <div className="space-y-4 pt-4 border-t">
                                    <Label>Review Decision</Label>
                                    <Textarea 
                                        placeholder="Reason for rejection (if rejecting)..." 
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="destructive" onClick={() => submitReview(false)} disabled={reviewing}>
                                            {reviewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reject
                                        </Button>
                                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => submitReview(true)} disabled={reviewing}>
                                            {reviewing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Approve
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-4 border-t text-sm text-muted-foreground">
                                    <p>Current Status: {selectedApp.status}</p>
                                    {selectedApp.rejection_reason && <p className="text-red-500">Rejection Reason: {selectedApp.rejection_reason}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Agreement Dialog */}
            <Dialog open={isAgreementOpen} onOpenChange={setIsAgreementOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Upload Agreement for Crew</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Agreement PDF URL</Label>
                        <div className="flex gap-2 mt-2">
                             <Input 
                                 value={agreementForm.agreement_url} 
                                 onChange={(e) => setAgreementForm({...agreementForm, agreement_url: e.target.value})} 
                                 placeholder="Paste PDF link here"
                             />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                             Manual upload process: Upload file to storage separately, then paste URL here.
                             This action will make the agreement available for the crew member to download.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAgreementOpen(false)}>Cancel</Button>
                        <Button onClick={submitAgreement} disabled={preparing}>
                            {preparing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Upload Agreement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
    const styles: Record<string, string> = {
        'pending_submission': 'bg-gray-100 text-gray-800',
        'crew_onboarding_submitted': 'bg-yellow-100 text-yellow-800',
        'crew_onboarding_approved_by_master': 'bg-blue-100 text-blue-800',
        'rejected_by_master': 'bg-red-100 text-red-800',
        'agreement_uploaded': 'bg-green-100 text-green-800',
        'agreement_downloaded_by_crew': 'bg-green-100 text-green-800',
    };
    
    return (
        <Badge variant="outline" className={`${styles[status] || styles['pending_submission']} border-0`}>
            {status.replace(/_/g, ' ')}
        </Badge>
    );
}

