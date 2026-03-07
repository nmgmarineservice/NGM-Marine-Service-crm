import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, LayoutGrid, FileSpreadsheet, Trash2, Plus, Copy, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface SpreadsheetGridProps {
    data?: any;
    onChange: (data: any) => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({ data, onChange }) => {
    // A grid is essentially an array of rows, where each row is an array of cells
    const [rows, setRows] = useState<string[][]>(data?.rows || [['', '', '', ''], ['', '', '', ''], ['', '', '', '']]);
    const [columnNames, setColumnNames] = useState<string[]>(data?.columnNames || ['A', 'B', 'C', 'D']);
    
    // Sync local state when external data changes (e.g. from template load)
    useEffect(() => {
        if (data?.rows) setRows(data.rows);
        if (data?.columnNames) setColumnNames(data.columnNames);
    }, [data]);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...rows];
        newRows[rowIndex][colIndex] = value;
        setRows(newRows);
        onChange({ rows: newRows, columnNames });
    };

    const addRow = () => {
        const newRow = Array(columnNames.length).fill('');
        const newRows = [...rows, newRow];
        setRows(newRows);
        onChange({ rows: newRows, columnNames });
    };

    const addColumn = () => {
        const nextChar = String.fromCharCode(65 + columnNames.length); // A, B, C...
        const newColumnNames = [...columnNames, nextChar];
        const newRows = rows.map(row => [...row, '']);
        setColumnNames(newColumnNames);
        setRows(newRows);
        onChange({ rows: newRows, columnNames: newColumnNames });
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');
        
        // Excel/Google Sheets use Tab characters for columns and Newlines for rows
        const pastedRows = clipboardData.split(/\r?\n/).filter(r => r.length > 0).map(row => row.split('\t'));
        
        if (pastedRows.length === 0) return;

        // Overlay the pasted data starting from the first cell (or target cell)
        // For simplicity, we'll replace the entire grid or extend it
        const maxCols = Math.max(columnNames.length, ...pastedRows.map(r => r.length));
        const finalColumnNames = [...columnNames];
        while (finalColumnNames.length < maxCols) {
            finalColumnNames.push(String.fromCharCode(65 + finalColumnNames.length));
        }

        const newRows = [...pastedRows];
        // Ensure all rows have the same number of columns
        newRows.forEach(row => {
            while (row.length < maxCols) row.push('');
        });

        setColumnNames(finalColumnNames);
        setRows(newRows);
        onChange({ rows: newRows, columnNames: finalColumnNames });
        toast.success(`Pasted ${pastedRows.length} rows from Excel`);
    }, [columnNames, onChange]);

    const clearGrid = () => {
        if (confirm("Clear all grid data?")) {
            const initialRows = [['', '', '', ''], ['', '', '', ''], ['', '', '', '']];
            const initialCols = ['A', 'B', 'C', 'D'];
            setRows(initialRows);
            setColumnNames(initialCols);
            onChange({ rows: initialRows, columnNames: initialCols });
        }
    };

    return (
        <Card className="p-0 border-none shadow-none bg-background overflow-hidden flex flex-col h-[500px]">
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/10 text-green-600 rounded">
                        <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Direct Excel Link (365 Mode)</h4>
                        <p className="text-[10px] text-muted-foreground italic">Paste (Ctrl+V) directly from any Excel/Log sheet</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={addColumn} className="h-8 gap-2">
                        <Plus className="w-3 h-3" /> Add Col
                    </Button>
                    <Button variant="outline" size="sm" onClick={addRow} className="h-8 gap-2">
                        <Plus className="w-3 h-3" /> Add Row
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearGrid} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 border" onPaste={handlePaste}>
                <div className="min-w-full inline-block">
                    <table className="border-collapse text-[12px] w-full">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                                <th className="w-10 border bg-muted/80 p-1 text-center font-normal text-muted-foreground border-slate-200">#</th>
                                {columnNames.map((col, idx) => (
                                    <th key={idx} className="border border-slate-200 p-1 bg-muted/80 font-medium text-center min-w-[120px]">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-primary/5 transition-colors">
                                    <td className="border border-slate-200 bg-muted/30 p-1 text-center text-muted-foreground w-10">
                                        {rIdx + 1}
                                    </td>
                                    {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="border border-slate-200 p-0 focus-within:ring-2 focus-within:ring-primary/20 z-0">
                                            <input
                                                className="w-full h-8 px-2 bg-transparent outline-none border-none selection:bg-primary/20"
                                                value={cell}
                                                onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div 
                        className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 border-dashed border-2 m-4 rounded-lg cursor-pointer hover:bg-muted/20 transition-all"
                        onClick={addRow}
                    >
                        <Copy className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Click to add more rows or</p>
                        <p className="text-xs">Paste your Excel selection here</p>
                    </div>
                </div>
            </ScrollArea>
            
            <div className="p-2 border-t bg-muted/20 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    365 Direct Link Active
                </div>
                <div className="border-l h-4"></div>
                <div className="text-[11px] text-muted-foreground">
                    Columns: {columnNames.length} | Rows: {rows.length} | Cells: {columnNames.length * rows.length}
                </div>
            </div>
        </Card>
    );
};
