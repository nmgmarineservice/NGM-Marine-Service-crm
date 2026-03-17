import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BookOpen, Download, Upload, Search, ArrowUpDown, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { documentService } from '@/services/documents';
import { Manual, ManualType } from '@/types/documents';
import { toast } from 'sonner';
import { ManualUploadDialog } from '@/components/documents/ManualUploadDialog';
import { API_BASE_URL } from '../../firebase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function Manuals() {
    const { user } = useAuth();
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'updated_at' | 'title', direction: 'asc' | 'desc' }>({ key: 'updated_at', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);

    const isStaffOrMaster = ['staff', 'master'].includes(user?.role || '');

    useEffect(() => {
        loadManuals();
    }, []);

    const loadManuals = async () => {
        try {
            const response = await documentService.getManuals();
            if (response.data) {
                setManuals(response.data);
            }
        } catch (error) {
            console.error('Failed to load manuals:', error);
            toast.error('Failed to load manuals');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            setDeleting(id);
            const response = await documentService.deleteManual(id);
            if (response.error) {
                toast.error(response.error);
                return;
            }
            
            toast.success(`Manual "${title}" deleted permanently`);
            setManuals(prev => prev.filter(m => m.id !== id));
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(i => i !== id));
            }
        } catch (error) {
            console.error('Failed to delete manual:', error);
            toast.error('Failed to delete manual');
        } finally {
            setDeleting(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} manuals?`)) return;

        try {
            setLoading(true);
            const response = await documentService.bulkDeleteManuals(selectedIds);
            if (response.error) {
                toast.error(response.error);
                return;
            }
            
            toast.success(`Deleted ${selectedIds.length} manuals permanently`);
            const idsToRemove = [...selectedIds];
            setManuals(prev => prev.filter(m => !idsToRemove.includes(m.id)));
            setSelectedIds([]);
        } catch (error) {
            console.error('Bulk delete failed:', error);
            toast.error('Failed to delete manuals');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredManuals = manuals.filter(m => {
        const matchesTab = activeTab === 'all' || m.manual_type === activeTab;
        const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesTab && matchesSearch;
    });

    const sortedManuals = [...filteredManuals].sort((a, b) => {
        if (sortConfig.key === 'title') {
            return sortConfig.direction === 'asc' 
                ? a.title.localeCompare(b.title)
                : b.title.localeCompare(a.title);
        } else {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
    });

    const toggleSelectAll = () => {
        if (sortedManuals.length === 0) return;
        const allFilteredSelected = sortedManuals.every(m => selectedIds.includes(m.id));

        if (allFilteredSelected) {
            const filteredIds = sortedManuals.map(m => m.id);
            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            const filteredIds = sortedManuals.map(m => m.id);
            const unique = new Set([...selectedIds, ...filteredIds]);
            setSelectedIds(Array.from(unique));
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading manuals...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manuals & Procedures</h1>
                    <p className="text-muted-foreground mt-2">
                        Access fleet procedures, safety manuals, and company guides.
                    </p>
                </div>
                <div className="flex gap-2">
                    {isStaffOrMaster && selectedIds.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedIds.length})
                        </Button>
                    )}
                    {isStaffOrMaster && (
                        <Button variant="default" onClick={() => setUploadDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload New Manual
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">All Manuals</TabsTrigger>
                        <TabsTrigger value={ManualType.FPM}>FPM</TabsTrigger>
                        <TabsTrigger value={ManualType.SMM}>SMM</TabsTrigger>
                        <TabsTrigger value={ManualType.CPM}>CPM</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {isStaffOrMaster && (
                        <Button variant="outline" onClick={toggleSelectAll} className="whitespace-nowrap">
                            {sortedManuals.length > 0 && sortedManuals.every(m => selectedIds.includes(m.id)) ? (
                                <><CheckSquare className="mr-2 h-4 w-4" /> Deselect All</>
                            ) : (
                                <><Square className="mr-2 h-4 w-4" /> Select All</>
                            )}
                        </Button>
                    )}

                    <Select 
                        value={`${sortConfig.key}-${sortConfig.direction}`} 
                        onValueChange={(val: string) => {
                            const [key, direction] = val.split('-');
                            setSortConfig({ key: key as 'updated_at' | 'title', direction: direction as 'asc' | 'desc' });
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated_at-desc">Newest First</SelectItem>
                            <SelectItem value="updated_at-asc">Oldest First</SelectItem>
                            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search manuals..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <ManualUploadDialog 
                open={uploadDialogOpen} 
                onOpenChange={setUploadDialogOpen}
                onSuccess={loadManuals}
            />

            <div className="mt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sortedManuals.map((manual) => (
                        <Card key={manual.id} className={`hover:shadow-lg transition-shadow relative group ${selectedIds.includes(manual.id) ? 'ring-2 ring-primary' : ''}`}>
                             {isStaffOrMaster && (
                                <div className={`absolute top-3 left-3 z-10 transition-opacity ${selectedIds.includes(manual.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <Checkbox 
                                        checked={selectedIds.includes(manual.id)} 
                                        onCheckedChange={() => toggleSelect(manual.id)}
                                        className="bg-background shadow-sm"
                                    />
                                </div>
                            )}

                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pl-10"> {/* Added left padding for checkbox */}
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-semibold">{manual.title}</CardTitle>
                                        <Badge variant="secondary" className="mt-1">
                                            v{manual.version}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {manual.description || `Official ${manual.manual_type} document for vessel operations.`}
                                </p>

                                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                    <span>Type: {manual.manual_type}</span>
                                    <span>{new Date(manual.updated_at).toLocaleDateString()}</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button className="flex-1" variant="outline" asChild>
                                        <a 
                                            href={(manual.file_url.startsWith('http')) ? manual.file_url : `${API_BASE_URL}${manual.file_url}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </a>
                                    </Button>
                                    {isStaffOrMaster && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(manual.id, manual.title)}
                                            disabled={deleting === manual.id}
                                        >
                                            {deleting === manual.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {sortedManuals.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No manuals found{searchQuery ? ' using current search' : ' in this category'}.</p>
                            {searchQuery && (
                                <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2 text-primary">
                                    Clear Search
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
