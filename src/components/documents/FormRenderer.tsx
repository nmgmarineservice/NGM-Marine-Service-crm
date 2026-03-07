import React, { useState, useEffect } from 'react';
import { FormField, FormTemplate } from '@/types/documents';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calendar as CalendarIcon, FileText, FileSpreadsheet, Download, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { documentService } from '@/services/documents';
import { toast } from 'sonner';

interface FormRendererProps {
    template: FormTemplate;
    initialData?: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    readOnly?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ template, initialData = {}, onChange, readOnly = false }) => {
    const [data, setData] = useState<Record<string, any>>(initialData);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleFieldChange = (fieldId: string, value: any) => {
        if (readOnly) return;
        const newData = { ...data, [fieldId]: value };
        setData(newData);
        onChange(newData);
    };

    // Table specific handlers
    const handleAddRow = (fieldId: string) => {
        if (readOnly) return;
        const currentRows = data[fieldId] || [];
        const newRows = [...currentRows, {}]; // Add empty object for new row
        handleFieldChange(fieldId, newRows);
    };

    const handleRemoveRow = (fieldId: string, rowIndex: number) => {
        if (readOnly) return;
        const currentRows = data[fieldId] || [];
        const newRows = [...currentRows];
        newRows.splice(rowIndex, 1);
        handleFieldChange(fieldId, newRows);
    };

    const handleRowChange = (fieldId: string, rowIndex: number, columnId: string, value: any) => {
        if (readOnly) return;
        const currentRows = data[fieldId] || [];
        const newRows = [...currentRows];
        if (!newRows[rowIndex]) newRows[rowIndex] = {};
        newRows[rowIndex] = { ...newRows[rowIndex], [columnId]: value };
        handleFieldChange(fieldId, newRows);
    };

    const handleFileUpload = async (file: File, fieldPrefix: string) => {
        const loadingToast = toast.loading("Uploading file...");
        try {
            const res = await documentService.uploadFile(file, 'LAYER_3_FORM_SUBMISSIONS');
            if (res.data) {
                handleFieldChange(`${fieldPrefix}_url`, res.data.url);
                handleFieldChange(`${fieldPrefix}_name`, file.name);
                toast.success("File uploaded", { id: loadingToast });
            } else {
                toast.error("Upload failed", { id: loadingToast });
            }
        } catch (error) {
            console.error(error);
            toast.error("Upload error", { id: loadingToast });
        }
    };

    const renderInput = (field: FormField, value: any, onValueChange: (v: any) => void) => {
        if (readOnly) {
            return <div className="p-2 bg-muted rounded-md text-sm">{value?.toString() || '-'}</div>;
        }

        switch (field.type) {
            case 'text':
            case 'number':
                return (
                    <Input
                        type={field.type}
                        value={value || ''}
                        onChange={(e) => onValueChange(e.target.value)}
                        placeholder={`Enter ${field.label}`}
                    />
                );
            case 'boolean':
                return (
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={!!value}
                            onCheckedChange={onValueChange}
                        />
                        <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
                    </div>
                );
            case 'select':
                return (
                    <Select value={value} onValueChange={onValueChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'date':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !value && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value) : undefined}
                                onSelect={(date) => onValueChange(date ? date.toISOString() : null)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                );
            default:
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => onValueChange(e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="space-y-6">
            {template.spreadsheet_data && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded text-green-700">
                           <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900">Direct Excel Link (File Tunnel)</h3>
                            <p className="text-sm text-blue-700">Download the official Excel template, fill it offline, and upload it here.</p>
                        </div>
                    </div>
                    
                     <div className="grid grid-cols-2 gap-4">
                          <div className="border p-4 rounded bg-white text-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.open(template.spreadsheet_data.file_url, '_blank')}>
                             <span className="block text-sm font-medium mb-1 text-gray-900">Step 1: Get Template</span>
                              <span className="text-xs text-blue-600 underline flex items-center justify-center gap-1">
                                 <Download className="w-3 h-3" /> Download {template.name}.xlsx
                              </span>
                          </div>
                          
                          <div className="border border-dashed border-blue-300 p-4 rounded bg-blue-50/30 text-center relative hover:bg-blue-50 transition-colors">
                              {!readOnly && (
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if(file) handleFileUpload(file, '__spreadsheet');
                                }} accept=".xlsx,.xls" />
                              )}
                              <span className="block text-sm font-medium mb-1 text-gray-900">Step 2: Upload Filled File</span>
                              {data['__spreadsheet_name'] ? (
                                <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                                    <FileSpreadsheet className="w-3 h-3" /> {data['__spreadsheet_name']}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Click to select file...</span>
                              )}
                          </div>
                     </div>
                 </div>
             )}

            {template.document_data && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded text-blue-700">
                           <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900">Document Template</h3>
                            <p className="text-sm text-blue-700">Download the document, fill it out, and upload the signed copy.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="border p-4 rounded bg-white text-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.open(template.document_data.file_url, '_blank')}>
                            <span className="block text-sm font-medium mb-1 text-gray-900">Step 1: Get Document</span>
                             <span className="text-xs text-blue-600 underline flex items-center justify-center gap-1">
                                <Download className="w-3 h-3" /> Download Document
                             </span>
                         </div>
                         
                         <div className="border border-dashed border-blue-300 p-4 rounded bg-blue-50/30 text-center relative group hover:bg-blue-50 transition-colors">
                             {!readOnly && (
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if(file) handleFileUpload(file, '__document');
                                 }} accept=".doc,.docx,.pdf" />
                             )}
                             <span className="block text-sm font-medium mb-1 text-gray-900">Step 2: Upload Filled Document</span>
                             {data['__document_name'] ? (
                                <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                                    <FileText className="w-3 h-3" /> {data['__document_name']}
                                </span>
                             ) : (
                                <span className="text-xs text-gray-500 group-hover:text-blue-600 flex items-center justify-center gap-1">
                                    <Upload className="w-3 h-3" /> Click to select file...
                                </span>
                             )}
                         </div>
                    </div>
                </div>
            )}

            {template.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                    <Label className={cn(field.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                        {field.label}
                    </Label>

                    {field.type === 'table' ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {field.columns?.map((col) => (
                                            <TableHead key={col.id} className="min-w-[150px]">{col.label}</TableHead>
                                        ))}
                                        {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(data[field.id] || []).map((row: any, rIndex: number) => (
                                        <TableRow key={rIndex}>
                                            {field.columns?.map((col) => (
                                                <TableCell key={col.id}>
                                                    {renderInput(col, row[col.id], (v) => handleRowChange(field.id, rIndex, col.id, v))}
                                                </TableCell>
                                            ))}
                                            {!readOnly && (
                                                <TableCell>
                                                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleRemoveRow(field.id, rIndex)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {(data[field.id] || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={(field.columns?.length || 0) + (readOnly ? 0 : 1)} className="text-center text-muted-foreground py-6">
                                                No entries yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {!readOnly && (
                                <div className="p-2 border-t bg-muted/20">
                                    <Button size="sm" variant="outline" onClick={() => handleAddRow(field.id)}>
                                        <Plus className="w-3 h-3 mr-2" /> Add Row
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        renderInput(field, data[field.id], (v) => handleFieldChange(field.id, v))
                    )}
                </div>
            ))}
        </div>
    );
};
