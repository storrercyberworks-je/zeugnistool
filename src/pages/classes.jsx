import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, STORAGE_KEYS } from '../lib/api'
import { Plus, Search, Edit2, Trash2, Calendar, Users, MoreHorizontal, Download, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

export default function ClassesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingClass, setEditingClass] = useState(null)

    const [viewingClass, setViewingClass] = useState(null)

    const { data: students = [] } = useQuery({
        queryKey: [STORAGE_KEYS.STUDENTS],
        queryFn: () => api.list(STORAGE_KEYS.STUDENTS),
    })

    const { data: classes = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => api.list(STORAGE_KEYS.CLASSES),
    })

    const createMutation = useMutation({
        mutationFn: (data) => api.create(STORAGE_KEYS.CLASSES, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.CLASSES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Klasse wurde erstellt.' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.update(STORAGE_KEYS.CLASSES, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.CLASSES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Klasse wurde aktualisiert.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(STORAGE_KEYS.CLASSES, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.CLASSES])
            toast({ title: 'Erfolg', description: 'Klasse wurde gelöscht.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        if (editingClass) {
            updateMutation.mutate({ id: editingClass.id, data: { ...data, grade_level: Number(data.grade_level) } })
        } else {
            createMutation.mutate({ ...data, student_count: 0, grade_level: Number(data.grade_level || 2) })
        }
    }

    const filteredClasses = (classes || []).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.school_year.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openEdit = (cls) => {
        setEditingClass(cls)
        setIsDialogOpen(true)
    }

    const exportCsv = (cls) => {
        const clsStudents = students.filter(s => s.class_id === cls.id);
        if (clsStudents.length === 0) {
            toast({ title: 'Hinweis', description: 'Diese Klasse hat noch keine Schüler.' });
            return;
        }

        const headers = ['Nachname,Vorname,Email,Geburtsdatum,Dispenzen'];
        const rows = clsStudents.map(s => {
            const safeDisp = s.dispensations ? `"${s.dispensations.replace(/"/g, '""')}"` : '';
            return `${s.last_name || ''},${s.first_name || ''},${s.email_school || ''},${s.birth_date ? new Date(s.birth_date).toLocaleDateString('de-CH') : ''},${safeDisp}`;
        });
        
        // Use proper CSV encoding
        const BOM = "\uFEFF"; 
        const csvContent = BOM + headers.concat(rows).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Klassenliste_${cls.name}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const openCreate = () => {
        setEditingClass(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Klassen</h1>
                    <p className="text-muted-foreground">
                        Verwalten Sie alle Klassen und Jahrgänge.
                    </p>
                </div>
                <Button onClick={openCreate} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Klasse hinzufügen
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen nach Name oder Schuljahr..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Klassenname</TableHead>
                                        <TableHead>Schuljahr</TableHead>
                                        <TableHead>Stufe</TableHead>
                                        <TableHead>Schülerzahl</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClasses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Keine Klassen gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClasses.map((cls) => (
                                            <TableRow key={cls.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewingClass(cls)}>
                                                <TableCell className="font-semibold">{cls.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-muted-foreground">
                                                        <Calendar className="mr-2 h-4 w-4" /> {cls.school_year}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{cls.grade_level}. Stufe</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center font-medium">
                                                        <Users className="mr-2 h-4 w-4 text-primary" /> {students.filter(s => s.class_id === cls.id).length}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEdit(cls)}>
                                                                <Edit2 className="mr-2 h-4 w-4" /> Bearbeiten
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => deleteMutation.mutate(cls.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) || (
                        <div className="p-8 text-center text-muted-foreground">Keine Daten verfügbar.</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingClass ? 'Klasse bearbeiten' : 'Neue Klasse hinzufügen'}</DialogTitle>
                            <DialogDescription>
                                Details für die Klasse/Kurs-Gruppe.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bezeichnung (e.g. "BFS-24A")</label>
                                <Input name="name" defaultValue={editingClass?.name} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Schuljahr</label>
                                    <Input name="school_year" defaultValue={editingClass?.school_year || '2024/2025'} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Klassenstufe</label>
                                    <Input name="grade_level" type="number" defaultValue={editingClass?.grade_level || 2} required />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit">{editingClass ? 'Speichern' : 'Hinzufügen'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingClass} onOpenChange={(open) => !open && setViewingClass(null)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <div className="flex items-center justify-between mt-2">
                            <div>
                                <DialogTitle className="text-xl">Klasse {viewingClass?.name}</DialogTitle>
                                <DialogDescription>
                                    Schülerliste der Klasse ({students.filter(s => s.class_id === viewingClass?.id).length} Schüler)
                                </DialogDescription>
                            </div>
                            <Button onClick={() => exportCsv(viewingClass)} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> CSV Export
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="max-h-[500px] overflow-auto border rounded-md mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vorname</TableHead>
                                    <TableHead>Nachname</TableHead>
                                    <TableHead>Dispenzen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.filter(s => s.class_id === viewingClass?.id).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            Noch keine Schüler zugewiesen.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.filter(s => s.class_id === viewingClass?.id)
                                        .sort((a, b) => a.last_name.localeCompare(b.last_name))
                                        .map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell>{s.first_name}</TableCell>
                                                <TableCell className="font-semibold">{s.last_name}</TableCell>
                                                <TableCell>
                                                    {s.dispensations ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                            {s.dispensations}
                                                        </span>
                                                    ) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" onClick={() => setViewingClass(null)}>Schliessen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
