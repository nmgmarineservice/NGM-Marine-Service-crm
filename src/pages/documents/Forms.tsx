import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, FilePlus, Settings, Lock, Plus, Trash2, X, Save, Table as TableIcon, Search, Loader2, Trash, CheckSquare, Square, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { documentService } from '@/services/documents';
import { FormTemplate, FormCategory, FormField, ScheduleFrequency, AssignedRole } from '@/types/documents';
import { toast } from 'sonner';
// import { SpreadsheetGrid } from '@/components/documents/SpreadsheetGrid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// --- Template Editor Component ---

interface TemplateEditorProps {
    template?: FormTemplate | null;
    open: boolean;
    onClose: () => void;
    onSave: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, open, onClose, onSave }) => {
    const isEditing = !!template;
    const [name, setName] = useState('');
    const [category, setCategory] = useState<FormCategory>(FormCategory.CHECKLIST);
    const [description, setDescription] = useState('');
    const [approvalRequired, setApprovalRequired] = useState(true);
    const [scheduled, setScheduled] = useState<ScheduleFrequency>(ScheduleFrequency.WEEKLY);
    const [role, setRole] = useState<AssignedRole>(AssignedRole.CREW);
    const [fields, setFields] = useState<FormField[]>([]);
    const [saving, setSaving] = useState(false);
    const [editorTab, setEditorTab] = useState('builder');
    const [spreadsheetData, setSpreadsheetData] = useState<any>(null);
    const [documentData, setDocumentData] = useState<any>(null);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setCategory(template.category);
            setDescription(template.description || '');
            setApprovalRequired(template.approval_required);
            setFields(template.fields || []);
            setSpreadsheetData(template.spreadsheet_data || null);
            setDocumentData(template.document_data || null);
            
            if (template.spreadsheet_data) setEditorTab('spreadsheet');
            else if (template.document_data) setEditorTab('document');
            else setEditorTab('builder');
        } else {
            // Reset for new
            setName('');
            setCategory(FormCategory.CHECKLIST);
            setDescription('');
            setApprovalRequired(true);
            setFields([
                { id: 'f1', label: 'Comments', type: 'text', required: false }
            ]);
            setSpreadsheetData(null);
            setDocumentData(null);
            setEditorTab('builder');
        }
    }, [template, open]);

    const handleAddField = () => {
        const newField: FormField = {
            id: `f${Date.now()}`,
            label: 'New Question',
            type: 'text',
            required: false
        };
        setFields([...fields, newField]);
    };

    const handleRemoveField = (index: number) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleClearFields = () => {
        if (confirm("Are you sure you want to remove all fields?")) {
            setFields([]);
        }
    };

    const handleAddColumn = (fieldIndex: number) => {
        const newFields = [...fields];
        const field = newFields[fieldIndex];
        const columns = field.columns || [];

        columns.push({
            id: `c${Date.now()}`,
            label: 'New Column',
            type: 'text',
            required: false // Columns usually not strictly required individually unless row is
        });

        newFields[fieldIndex] = { ...field, columns };
        setFields(newFields);
    };

    const handleRemoveColumn = (fieldIndex: number, colIndex: number) => {
        const newFields = [...fields];
        const field = newFields[fieldIndex];
        if (field.columns) {
            field.columns.splice(colIndex, 1);
            setFields(newFields);
        }
    };

    const updateColumn = (fieldIndex: number, colIndex: number, updates: Partial<FormField>) => {
        const newFields = [...fields];
        const field = newFields[fieldIndex];
        if (field.columns) {
            field.columns[colIndex] = { ...field.columns[colIndex], ...updates };
            setFields(newFields);
        }
    };

    const handleSave = async () => {
        if (!name) {
            toast.error("Template name is required");
            return;
        }

        try {
            setSaving(true);
            const data = {
                name,
                category,
                description,
                approval_required: approvalRequired,
                scheduled,
                role,
                fields,
                spreadsheet_data: spreadsheetData,
                document_data: documentData
            };

            if (isEditing && template) {
                await documentService.updateTemplate(template.id, data);
                toast.success("Template Updated");
            } else {
                await documentService.createTemplate(data);
                toast.success("Template Created");
            }
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Configure Template" : "Create New Template"}</DialogTitle>
                    <DialogDescription>
                        Define the structure and fields for this form. 
                        {!isEditing && (
                            <span className="block mt-2">
                                <Label htmlFor="smart-import" className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-md cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20">
                                    <FilePlus className="w-4 h-4" />
                                    Smart Import (Word, PDF, Excel)
                                    <input 
                                        id="smart-import" 
                                        type="file" 
                                        accept=".docx,.doc,.pdf,.xlsx,.xls,.csv,.pptx,.txt,.log" 
                                        className="hidden" 
                                        onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            const loadingToast = toast.loading("Analyzing document structure...");
                                            try {
                                                const res = await documentService.smartImportDocument(file);
                                                if (res.data) {
                                                    setName(res.data.title);
                                                    setFields(res.data.fields);
                                                    
                                                    // Auto-link the uploaded document as a template file
                                                    if (res.data.file_url) {
                                                        setDocumentData({
                                                            file_name: res.data.file_name || file.name,
                                                            file_url: res.data.file_url,
                                                            is_file_tunnel: true
                                                        });
                                                        // toast.info("Document linked as template source");
                                                    }
                                                    
                                                    toast.success("Document analyzed and imported!", { id: loadingToast });
                                                } else {
                                                    // This will catch the ValueError from the backend now
                                                    toast.error(res.error || "Please use .docx, .doc, or PDF format", { id: loadingToast, duration: 5000 });
                                                }
                                            } catch (err) {
                                                toast.error("Format mismatch. Please use supported formats.", { id: loadingToast });
                                            }
                                        }}
                                    />
                                </Label>
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Template Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Safety Check" />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(v: FormCategory) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(FormCategory).map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Schedule Frequency</Label>
                            <Select value={scheduled} onValueChange={(v: ScheduleFrequency) => setScheduled(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(ScheduleFrequency).map((freq: ScheduleFrequency) => (
                                        <SelectItem key={freq} value={freq}>
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Assigned To</Label>
                            <Select value={role} onValueChange={(v: AssignedRole) => setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(AssignedRole).map((r: AssignedRole) => (
                                        <SelectItem key={r} value={r}>
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="approval" checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                        <Label htmlFor="approval">Requires Master's Approval</Label>
                    </div>

                    <Tabs value={editorTab} onValueChange={setEditorTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="builder" className="gap-2">
                                <CheckSquare className="w-4 h-4" /> Form Builder
                            </TabsTrigger>
                            <TabsTrigger value="spreadsheet" className="gap-2">
                                <FileSpreadsheet className="w-4 h-4" /> Excel Direct
                            </TabsTrigger>
                            <TabsTrigger value="document" className="gap-2">
                                <FileText className="w-4 h-4" /> Document
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="builder" className="space-y-4 pt-4 border-t mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold px-1">Form Fields ({fields.length})</h3>
                            <div className="flex gap-2">
                                {fields.length > 0 && (
                                    <Button size="sm" onClick={handleClearFields} variant="ghost" className="text-destructive text-xs h-8">
                                        Clear All
                                    </Button>
                                )}
                                <Button size="sm" onClick={handleAddField} variant="default" className="h-8">
                                    <Plus className="w-4 h-4 mr-1" /> Add Field
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-3 bg-muted/50 rounded-lg border">
                                    <div className="flex gap-3 items-start">
                                        <div className="grid gap-2 flex-1">
                                            <div className="flex gap-2">
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(index, { label: e.target.value })}
                                                        placeholder="Question / Label"
                                                        className="flex-1"
                                                    />
                                                <Select value={field.type} onValueChange={(v: any) => updateField(index, { type: v })}>
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="text">Text Input</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                        <SelectItem value="date">Date</SelectItem>
                                                        <SelectItem value="boolean">Yes/No</SelectItem>
                                                        <SelectItem value="select">Dropdown</SelectItem>
                                                        <SelectItem value="signature">Signature</SelectItem>
                                                        <SelectItem value="photo">Photo</SelectItem>
                                                        <SelectItem value="table">Table / Grid</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={e => updateField(index, { required: e.target.checked })}
                                                        className="rounded border-gray-300"
                                                    />
                                                    Required
                                                </label>
                                                {field.type === 'select' && (
                                                    <Input
                                                        placeholder="Options (comma separated)"
                                                        className="h-7 text-xs"
                                                        value={field.options?.join(',') || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(index, { options: e.target.value.split(',') })}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleRemoveField(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {field.type === 'table' && (
                                        <div className="mt-3 pl-4 border-l-2 border-primary/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <TableIcon className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Table Columns</span>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleAddColumn(index)} className="h-7 text-xs">
                                                    <Plus className="w-3 h-3 mr-1" /> Add Column
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {field.columns?.map((col, cIndex) => (
                                                    <div key={col.id} className="flex gap-2 items-center">
                                                        <Input
                                                            value={col.label}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColumn(index, cIndex, { label: e.target.value })}
                                                            placeholder="Column Name"
                                                            className="flex-1 h-8 text-sm"
                                                        />
                                                        <Select value={col.type} onValueChange={(v: any) => updateColumn(index, cIndex, { type: v })}>
                                                            <SelectTrigger className="w-[120px] h-8 text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text">Text</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="date">Date</SelectItem>
                                                                <SelectItem value="boolean">Yes/No</SelectItem>
                                                                <SelectItem value="select">Select</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {col.type === 'select' && (
                                                            <Input
                                                                placeholder="Opts (a,b)"
                                                                className="flex-1 h-8 text-xs"
                                                                value={col.options?.join(',') || ''}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColumn(index, cIndex, { options: e.target.value.split(',') })}
                                                            />
                                                        )}
                                                        <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => handleRemoveColumn(index, cIndex)}>
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {(!field.columns || field.columns.length === 0) && (
                                                    <div className="text-xs text-muted-foreground italic">No columns defined. Add one to start.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="spreadsheet" className="border rounded-md p-8 md:p-12 space-y-6 text-center bg-slate-50">
                             <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                             </div>
                             <h3 className="text-lg font-semibold text-slate-800">Upload Master Excel Template</h3>
                             <p className="text-slate-500 max-w-md mx-auto">
                                Instead of building a form, upload your official .xlsx file. Crew members will download this file, fill it out, and upload it back.
                             </p>
                             
                             <div className="max-w-xs mx-auto">
                                <Label htmlFor="excel-upload" className="cursor-pointer block">
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-white hover:border-green-500 transition-all group">
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-slate-600 group-hover:text-green-600">
                                                {spreadsheetData?.file_name ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <FileText className="w-4 h-4" /> {spreadsheetData.file_name}
                                                    </span>
                                                ) : "Click to Browse .xlsx"}
                                            </div>
                                        </div>
                                    </div>
                                    <input 
                                        id="excel-upload" 
                                        type="file" 
                                        className="hidden" 
                                        accept=".xlsx,.xls" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const loadingToast = toast.loading("Uploading template file...");
                                                try {
                                                    // Upload to backend
                                                    const res = await documentService.uploadFile(file, 'LAYER_2_FORM_TEMPLATES');
                                                    
                                                    if (res.data) {
                                                        setSpreadsheetData({
                                                            file_name: file.name,
                                                            file_url: res.data.url, 
                                                            is_file_tunnel: true
                                                        });
                                                        toast.success("File uploaded successfully", { id: loadingToast });
                                                    } else {
                                                        toast.error(res.error || "Upload failed", { id: loadingToast });
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error("Upload error", { id: loadingToast });
                                                }
                                            }
                                        }}
                                    />
                                </Label>
                             </div>
                             
                             {spreadsheetData?.is_file_tunnel && (
                                <div className="text-xs text-green-600 bg-green-50 py-2 px-4 rounded-full inline-block">
                                    ✅ File Ready to Link
                                </div>
                             )}
                        </TabsContent>

                        <TabsContent value="document" className="border rounded-md p-8 md:p-12 space-y-6 text-center bg-slate-50">
                             <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-blue-600" />
                             </div>
                             <h3 className="text-lg font-semibold text-slate-800">Upload Document Template</h3>
                             <p className="text-slate-500 max-w-md mx-auto">
                                Upload a Word or PDF file. Crew members will download this file, fill it out (or print/sign), and upload it back.
                             </p>
                             
                             <div className="max-w-xs mx-auto">
                                <Label htmlFor="doc-upload" className="cursor-pointer block">
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-white hover:border-blue-500 transition-all group">
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-slate-600 group-hover:text-blue-600">
                                                {documentData?.file_name ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <FileText className="w-4 h-4" /> {documentData.file_name}
                                                    </span>
                                                ) : "Click to Browse .docx / .pdf"}
                                            </div>
                                        </div>
                                    </div>
                                    <input 
                                        id="doc-upload" 
                                        type="file" 
                                        className="hidden" 
                                        accept=".docx,.doc,.pdf" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const loadingToast = toast.loading("Uploading document file...");
                                                try {
                                                    // Upload to backend
                                                    const res = await documentService.uploadFile(file, 'LAYER_2_FORM_TEMPLATES');
                                                    
                                                    if (res.data) {
                                                        setDocumentData({
                                                            file_name: file.name,
                                                            file_url: res.data.url, 
                                                            is_file_tunnel: true
                                                        });
                                                        toast.success("File uploaded successfully", { id: loadingToast });
                                                    } else {
                                                        toast.error(res.error || "Upload failed", { id: loadingToast });
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error("Upload error", { id: loadingToast });
                                                }
                                            }
                                        }}
                                    />
                                </Label>
                             </div>
                             
                             {documentData?.is_file_tunnel && (
                                <div className="text-xs text-green-600 bg-green-50 py-2 px-4 rounded-full inline-block">
                                    ✅ Document Ready to Link
                                </div>
                             )}
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Template"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---

export default function Forms() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const canManage = ['staff', 'master'].includes(user?.role || '');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        if (!canManage) return;
        try {
            const response = await documentService.getTemplates();
            console.log("Templates Response:", response);
            if (response.data) {
                console.log("Templates Data Length:", response.data.length);
                setTemplates(response.data);
            } else {
                console.warn("No data in response");
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            // Log details if available
            if ((error as any).response) {
                console.error('Error Response:', (error as any).response);
            }
            toast.error('Failed to load form templates');
        } finally {
            setLoading(false);
        }
    };


    const handleCreate = () => {
        setSelectedTemplate(null);
        setEditorOpen(true);
    };

    const handleConfigure = (template: FormTemplate) => {
        setSelectedTemplate(template);
        setEditorOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the template "${name}"?`)) return;

        const template = templates.find(t => t.id === id);
        if (!template) return;
        
        // Optimistic update
        setTemplates(prev => prev.filter(t => t.id !== id));
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }

        const timeoutId = setTimeout(async () => {
            try {
                await documentService.deleteTemplate(id);
            } catch (err) {
                console.error(err);
                toast.error(`Failed to delete ${name}`);
                // Revert
                setTemplates(prev => [...prev, template]);
            }
        }, 5000);

        toast(`Template "${name}" deleted`, {
            action: {
                label: "Undo",
                onClick: () => {
                    clearTimeout(timeoutId);
                    setTemplates(prev => [...prev, template]);
                    if (selectedIds.includes(id)) {
                        setSelectedIds(prev => [...prev, id]); 
                    }
                }
            },
            duration: 4000,
        });
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} templates?`)) return;
        
        const templatesToDelete = templates.filter(t => selectedIds.includes(t.id));
        const idsToDelete = [...selectedIds];

        // Optimistic update
        setTemplates(prev => prev.filter(t => !idsToDelete.includes(t.id)));
        setSelectedIds([]); 

        const timeoutId = setTimeout(async () => {
            try {
                await documentService.bulkDeleteTemplates(idsToDelete);
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete templates");
                // Revert
                setTemplates(prev => [...prev, ...templatesToDelete]);
            }
        }, 5000);

        toast(`Deleted ${idsToDelete.length} templates`, {
            action: {
                label: "Undo",
                onClick: () => {
                    clearTimeout(timeoutId);
                    setTemplates(prev => [...prev, ...templatesToDelete]);
                    setSelectedIds(idsToDelete);
                }
            },
            duration: 4000,
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };



    if (!canManage) {
        return <div className="p-8 text-center text-red-500">Access Denied. Templates are managed by Office Staff.</div>;
    }

    const [sortConfig, setSortConfig] = useState<{ key: 'updated_at' | 'name', direction: 'asc' | 'desc' }>({ key: 'updated_at', direction: 'desc' });

    const filtered = templates.filter(t => {
        const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sortConfig.key === 'name') {
            return sortConfig.direction === 'asc' 
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        } else {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
    });

    const toggleSelectAll = () => {
        if (sorted.length === 0) return;
        const allFilteredSelected = sorted.every(t => selectedIds.includes(t.id));

        if (allFilteredSelected) {
            const filteredIds = sorted.map(t => t.id);
            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            const filteredIds = sorted.map(t => t.id);
            const unique = new Set([...selectedIds, ...filteredIds]);
            setSelectedIds(Array.from(unique));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Form Templates</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage standardized form blueprints for the fleet.
                    </p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                            {bulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                    <Button variant="default" onClick={handleCreate}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        Create New Template
                    </Button>
                    <Label htmlFor="bulk-import" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors border">
                        <Plus className="w-4 h-4" />
                        Bulk Import Templates
                        <input 
                            id="bulk-import" 
                            type="file" 
                            multiple 
                            accept=".docx,.doc,.pdf,.xlsx,.xls,.csv"
                            className="hidden" 
                            onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                
                                const loadingToast = toast.loading(`Importing ${files.length} documents...`);
                                try {
                                    const res = await documentService.bulkImportDocuments(files);
                                    if (res.data && res.data.results) {
                                        const success = res.data.results.filter((r: any) => r.status === 'success').length;
                                        const failed = res.data.results.filter((r: any) => r.status === 'error').length;
                                        
                                        if (failed > 0) {
                                            const errors = res.data.results
                                                .filter((r: any) => r.status === 'error')
                                                .map((r: any) => `${r.filename}: ${r.error}`)
                                                .join('\n');
                                            toast.error(`Failed to import ${failed} files:\n${errors}`, { duration: 6000 });
                                        }

                                        if (success > 0) {
                                            toast.success(`Successfully imported ${success} templates${failed > 0 ? `, ${failed} failed` : ''}`, { id: loadingToast });
                                            loadTemplates();
                                        } else if (failed === 0) {
                                            toast.success("No files were processed?", { id: loadingToast });
                                        }
                                    } else {
                                        toast.error(res.error || "Failed to bulk import", { id: loadingToast });
                                    }
                                } catch (err) {
                                    toast.error("An error occurred during bulk import", { id: loadingToast });
                                }
                            }}
                        />
                    </Label>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Tabs defaultValue="all" onValueChange={setActiveCategory} className="w-full md:w-auto">
                    <TabsList className='flex-wrap h-auto gap-2'>
                        <TabsTrigger value="all">All</TabsTrigger>
                        {Object.values(FormCategory).map(cat => (
                            <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={toggleSelectAll} className="whitespace-nowrap">
                        {sorted.length > 0 && sorted.every(t => selectedIds.includes(t.id)) ? (
                            <><CheckSquare className="mr-2 h-4 w-4" /> Deselect All</>
                        ) : (
                            <><Square className="mr-2 h-4 w-4" /> Select All</>
                        )}
                    </Button>
                    
                     <Select 
                        value={`${sortConfig.key}-${sortConfig.direction}`} 
                        onValueChange={(val: string) => {
                            const [key, direction] = val.split('-');
                            setSortConfig({ key: key as 'updated_at' | 'name', direction: direction as 'asc' | 'desc' });
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated_at-desc">Newest First</SelectItem>
                            <SelectItem value="updated_at-asc">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

                <div className="space-y-8 mt-6">
                    {Object.entries(
                        sorted.reduce((groups, template) => {
                            if (sortConfig.key === 'name') {
                                // When sorting by name, we group everything together or by first letter if we wanted
                                // For now, just a single 'Templates' group
                                const key = 'All Templates';
                                if (!groups[key]) groups[key] = [];
                                groups[key].push(template);
                                return groups;
                            }

                            // Date based grouping
                            const date = new Date(template.updated_at);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            
                            let key = 'Earlier';
                            if (date.toDateString() === today.toDateString()) {
                                key = 'Today';
                            } else if (date.toDateString() === yesterday.toDateString()) {
                                key = 'Yesterday';
                            } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
                                key = 'Last 7 Days';
                            }

                            if (!groups[key]) groups[key] = [];
                            groups[key].push(template);
                            return groups;
                        }, {} as Record<string, FormTemplate[]>)
                    ).map((entry) => {
                        const [dateGroup, groupTemplates] = entry as [string, FormTemplate[]];
                        return (
                        <div key={dateGroup} className="space-y-4">
                            <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">{dateGroup}</h3>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {groupTemplates.map((template) => (
                                    <div key={template.id} className={`bg-card rounded-lg border shadow-sm hover:shadow-md transition-all relative group ${selectedIds.includes(template.id) ? 'border-primary ring-1 ring-primary' : ''}`}>
                                        {/* Selection Checkbox */}
                                        <div className={`absolute top-3 left-3 z-10 transition-opacity ${selectedIds.includes(template.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <Checkbox 
                                                checked={selectedIds.includes(template.id)} 
                                                onCheckedChange={() => toggleSelect(template.id)}
                                                className="bg-background shadow-sm"
                                            />
                                        </div>
                                        
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                                        {template.spreadsheet_data ? <FileSpreadsheet className="h-5 w-5" /> : 
                                                         template.document_data ? <FileText className="h-5 w-5" /> :
                                                         <CheckSquare className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-base leading-none">{template.name}</h4>
                                                        <span className="text-xs text-muted-foreground mt-1.5 inline-block">
                                                            {template.category} • {template.fields?.length || 0} Fields
                                                        </span>
                                                    </div>
                                                </div>
                                                {template.approval_required && (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-2 py-0.5 h-6">
                                                        Approval Req.
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                                {template.description || `Standard ${template.category} form used for compliance and reporting.`}
                                            </p>

                                            <div className="flex items-center justify-between pt-2 border-t mt-4">
                                                <div className="text-xs text-muted-foreground">
                                                    Updated {new Date(template.updated_at).toLocaleDateString()}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleConfigure(template)}>
                                                        <Settings className="mr-1.5 h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(template.id, template.name)}
                                                        disabled={deleting === template.id}
                                                    >
                                                        {deleting === template.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-16 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium mb-1">No templates found</h3>
                            <p className="max-w-sm mx-auto mb-6">Type a new search query or try clearing your filters.</p>
                            <Button variant="outline" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </div>

            <TemplateEditor
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                template={selectedTemplate}
                onSave={loadTemplates}
            />
        </div>
    );
}
