import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockApi, STORAGE_KEYS } from '@/lib/api';
import {
    Layout,
    Type,
    Table as TableIcon,
    Save,
    FileText,
    Settings,
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function CertificateBuilder() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [templateName, setTemplateName] = useState('Neues Zeugnis-Layout');
    const [blocks, setBlocks] = useState([
        { id: '1', type: 'header', content: 'NotenMeister Schule' },
        { id: '2', type: 'title', content: 'Semesterzeugnis' },
        { id: '3', type: 'student_info', content: 'Stammdaten Schüler' },
        { id: '4', type: 'grade_table', content: 'Notenübersicht' },
        { id: '5', type: 'signatures', content: 'Unterschriften' }
    ]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const saveMutation = useMutation({
        mutationFn: (data) => MockApi.create(STORAGE_KEYS.TEMPLATES, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES]);
            toast({ title: 'Erfolg', description: 'Layout wurde gespeichert.' });
        }
    });

    const addBlock = (type) => {
        setBlocks([...blocks, { id: Math.random().toString(36).substr(2, 9), type, content: `Neuer ${type} Block` }]);
    };

    const removeBlock = (id) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index, direction) => {
        const newBlocks = [...blocks];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        setBlocks(newBlocks);
    };

    const handleSave = () => {
        const html_template = `
            <div style="font-family: sans-serif; padding: 40px;">
                ${blocks.map(b => {
            if (b.type === 'header') return `<h3 style="text-align: center; color: #3b82f6;">${b.content}</h3>`;
            if (b.type === 'title') return `<h1 style="text-align: center; font-size: 24px;">${b.content}</h1>`;
            if (b.type === 'grade_table') return `<div style="margin: 20px 0;">[GRADE_TABLE_PLACEHOLDER]</div>`;
            return `<p>${b.content}</p>`;
        }).join('')}
            </div>
        `;

        saveMutation.mutate({
            name: templateName,
            html_template,
            file_type: 'html',
            is_active: true,
            is_default: false
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Certificate Builder</h1>
                    <p className="text-muted-foreground">Erstellen Sie HTML-basierte Zeugnisvorlagen per Drag & Drop (Block-System).</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                        <Eye className="h-4 w-4 mr-2" /> Vorschau
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" /> Template Speichern
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Blöcke hinzufügen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="ghost" className="w-full justify-start" onClick={() => addBlock('header')}>
                            <Type className="h-4 w-4 mr-2" /> Schul-Header
                        </Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => addBlock('title')}>
                            <Type className="h-4 w-4 mr-2" /> Zeugnis-Titel
                        </Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => addBlock('text')}>
                            <Type className="h-4 w-4 mr-2" /> Freitext
                        </Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => addBlock('grade_table')}>
                            <TableIcon className="h-4 w-4 mr-2" /> Noten-Tabelle
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader className="border-b bg-muted/30">
                        <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="text-lg font-bold border-none bg-transparent focus-visible:ring-0 p-0"
                        />
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 min-h-[400px]">
                        {blocks.map((block, index) => (
                            <div key={block.id} className="group relative border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="capitalize text-[10px]">{block.type}</Badge>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(index, -1)}>
                                            <MoveUp className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(index, 1)}>
                                            <MoveDown className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeBlock(block.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    value={block.content}
                                    onChange={(e) => {
                                        const nb = [...blocks];
                                        nb[index].content = e.target.value;
                                        setBlocks(nb);
                                    }}
                                    className="border-none bg-transparent focus-visible:ring-0 p-0 text-sm"
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Live Vorschau</DialogTitle>
                        <DialogDescription>So sieht das Zeugnis mit Demodaten aus.</DialogDescription>
                    </DialogHeader>
                    <div className="border bg-white text-black p-10 mt-4 rounded shadow-sm">
                        {blocks.map(b => (
                            <div key={b.id}>
                                {b.type === 'header' && <h3 className="text-center text-blue-600 font-bold">{b.content}</h3>}
                                {b.type === 'title' && <h1 className="text-center text-2xl font-serif mt-4 border-b pb-2">{b.content}</h1>}
                                {b.type === 'grade_table' && (
                                    <div className="my-8 border-t border-l">
                                        <div className="grid grid-cols-3 font-bold bg-gray-100 border-r border-b">
                                            <div className="p-2">Fach</div>
                                            <div className="p-2">Lernfeld</div>
                                            <div className="p-2">Note</div>
                                        </div>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="grid grid-cols-3 border-r border-b">
                                                <div className="p-2">Modul {i}</div>
                                                <div className="p-2">Inhalt {i}</div>
                                                <div className="p-2 font-bold">5.{i}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {b.type !== 'header' && b.type !== 'title' && b.type !== 'grade_table' && <p className="mt-2">{b.content}</p>}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
