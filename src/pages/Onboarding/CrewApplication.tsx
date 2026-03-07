import React, { useState, useEffect } from 'react';
import { onboardingApi, OnboardingResponse, OnboardingStatus } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { Loader2, CheckCircle, FileText, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CrewApplication() {
    const [application, setApplication] = useState<OnboardingResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadApplication = async () => {
        setLoading(true);
        try {
            const res = await onboardingApi.getMyApplications();
            if (res.data && res.data.length > 0) {
                // Determine active application (could be multiple in history, take latest)
                // Sorting by created_at desc
                const sorted = res.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setApplication(sorted[0]);
            } else {
                setApplication(null);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load application");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadApplication(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!application) {
        return (
            <div className="p-8 text-center max-w-2xl mx-auto bg-card rounded-lg border border-border mt-8">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No Active Application</h2>
                <p className="text-muted-foreground">You don't have any pending crew onboarding applications at this time.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Crew Onboarding Application</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Application ID: {application.id}</p>
                        </div>
                        <StatusBadge status={application.status} />
                    </div>
                </CardHeader>
            </Card>

            {(application.status === 'pending_submission' || application.status === 'rejected_by_master') && (
                <ApplicationForm application={application} onRefresh={loadApplication} />
            )}
            
            {(application.status === 'crew_onboarding_submitted') && (
                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-yellow-900">Application Submitted</h3>
                                <p className="text-yellow-700 mt-1">
                                    “Onboarding form submitted. Awaiting master approval.”
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {application.status === 'crew_onboarding_approved_by_master' && (
                 <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-blue-900">Application Approved</h3>
                                <p className="text-blue-700 mt-1">
                                    The Master has approved your application. Please wait for the employment agreement.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {application.status === 'rejected_by_master' && (
                 <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <XCircle className="w-6 h-6 text-red-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-red-900">Application Returned</h3>
                                <p className="text-red-700 mt-1">
                                    The Master has returned your application.
                                    {application.rejection_reason && <span className="block mt-2 font-medium">Reason: {application.rejection_reason}</span>}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {(application.status === 'agreement_uploaded' || application.status === 'agreement_downloaded_by_crew') && (
                <Card className="border-l-4 border-l-green-500 bg-green-50/50">
                    <CardContent className="pt-6">
                         <div className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-green-900">Agreement Available</h3>
                                <p className="text-green-700 mt-1">
                                    The employment agreement has been prepared for you.
                                </p>
                                <div className="mt-4">
                                    <Button 
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => window.open(application.agreement_url || '#', '_blank')}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Download Agreement
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
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
    
    const labels: Record<string, string> = {
        'pending_submission': 'Draft',
        'crew_onboarding_submitted': 'Submitted',
        'crew_onboarding_approved_by_master': 'Master Approved',
        'rejected_by_master': 'Returned',
        'agreement_uploaded': 'Agreement Ready',
        'agreement_downloaded_by_crew': 'Agreement Downloaded',
    };

    return (
        <Badge variant="outline" className={`${styles[status] || styles['pending_submission']} border-0`}>
            {labels[status] || status}
        </Badge>
    );
}

function ApplicationForm({ application, onRefresh }: { application: OnboardingResponse, onRefresh: () => void }) {
    const [formData, setFormData] = useState({
        full_name: '',
        nationality: '',
        passport_number: '',
        seaman_book_number: '',
        address: '',
        emergency_contact: ''
    });
    
    // Load existing data if available
    useEffect(() => {
        if (application.application_data && Object.keys(application.application_data).length > 0) {
            setFormData(prev => ({ ...prev, ...application.application_data }));
        }
    }, [application]);

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!formData.full_name || !formData.passport_number) {
            toast.error("Please fill in mandatory fields (Name, Passport)");
            return;
        }

        setSubmitting(true);
        try {
            const res = await onboardingApi.submitApplication(application.id, {
                application_data: formData,
                documents: [] 
            });
            if (res.error) throw new Error(res.error);
            toast.success("Application submitted successfully!");
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Nationality</Label>
                        <Input value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Passport Number *</Label>
                        <Input value={formData.passport_number} onChange={e => setFormData({...formData, passport_number: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Seaman Book Number</Label>
                        <Input value={formData.seaman_book_number} onChange={e => setFormData({...formData, seaman_book_number: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Permanent Address</Label>
                        <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label>Emergency Contact</Label>
                        <Input value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
                    </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                    <Label className="text-lg font-semibold">Documents</Label>
                    <div className="border border-dashed p-8 text-center rounded-lg bg-gray-50">
                        <p className="text-muted-foreground">Document upload is not implemented in this prototype.</p>
                        <p className="text-xs text-muted-foreground mt-1">Files required: Passport, CDC, STCW Certificates</p>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} disabled={submitting} className="w-full md:w-auto">
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Application
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


