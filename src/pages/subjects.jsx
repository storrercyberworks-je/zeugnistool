import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, STORAGE_KEYS } from '../lib/api'
import { Plus, Search, Edit2, Trash2, Book, User, MoreHorizontal, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function SubjectsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSubject, setEditingSubject] = useState(null)

    const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => api.list(STORAGE_KEYS.SUBJECTS),
    })

    const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
        queryKey: [STORAGE_KEYS.TEACHERS],
        queryFn: () => api.list(STORAGE_KEYS.TEACHERS),
    })

    const createMutation = useMutation({
        mutationFn: (data) => api.create(STORAGE_KEYS.SUBJECTS, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.SUBJECTS])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Fach/Modul wurde erstellt.' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.update(STORAGE_KEYS.SUBJECTS, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.SUBJECTS])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Fach/Modul wurde aktualisiert.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(STORAGE_KEYS.SUBJECTS, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.SUBJECTS])
            toast({ title: 'Erfolg', description: 'Fach/Modul wurde gelöscht.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        // Auto-generate short name if not provided
        if (!data.short_name && data.name) {
            data.short_name = data.name.substring(0, 3).toUpperCase()
        }

        if (editingSubject) {
            updateMutation.mutate({ id: editingSubject.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    const filteredSubjects = (subjects || []).filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const parseLearningFields = (jsonStr) => {
        try {
            if (!jsonStr) return {}
            return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
        } catch (e) {
            return {}
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fächer & Module</h1>
                    <p className="text-muted-foreground">
                        Übersicht aller Unterrichtsfächer, Lernfelder und zugeordneten Dozenten.
                    </p>
                </div>
                <Button onClick={() => { setEditingSubject(null); setIsDialogOpen(true); }} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Fach hinzufügen
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen nach Fachname, Kürzel oder Dozent..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {(loadingSubjects || loadingTeachers) ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Kürzel</TableHead>
                                        <TableHead>Fach / Modul</TableHead>
                                        <TableHead>Kategorie</TableHead>
                                        <TableHead>Dozent</TableHead>
                                        <TableHead>Lernfelder</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubjects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Keine Fächer gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSubjects.map((sub) => {
                                            const lFields = parseLearningFields(sub.learning_fields)
                                            const fieldCount = Object.keys(lFields).length

                                            return (
                                                <TableRow key={sub.id}>
                                                    <TableCell className="font-mono text-xs uppercase text-primary">
                                                        <Badge variant="secondary">{sub.short_name || sub.name.substring(0, 3).toUpperCase()}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{sub.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", sub.category === 'allgemeinbildung' ? "border-purple-200 text-purple-700 bg-purple-50" : "border-blue-200 text-blue-700 bg-blue-50")}>
                                                            {sub.category === 'allgemeinbildung' ? 'Allgemeinbildung' : 'Fachmodul'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-sm">
                                                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            {sub.teacher_name || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {fieldCount > 0 ? (
                                                                <Badge variant="outline" className="text-[10px] bg-blue-500/5">
                                                                    {fieldCount} Lernfelder mappt
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Keine Lernfelder</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => { setEditingSubject(sub); setIsDialogOpen(true); }}>
                                                                    <Edit2 className="mr-2 h-4 w-4" /> Bearbeiten
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => deleteMutation.mutate(sub.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingSubject ? 'Fach bearbeiten' : 'Neues Fach hinzufügen'}</DialogTitle>
                            <DialogDescription>
                                Definition des Fachs/Moduls und Lernfeld-Mapping.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium">Bezeichnung</label>
                                    <Input name="name" defaultValue={editingSubject?.name} placeholder="z.B. Softwareentwicklung" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kürzel</label>
                                    <Input name="short_name" defaultValue={editingSubject?.short_name} placeholder="SWE" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Haupt-Dozent</label>
                                <select
                                    name="teacher_name"
                                    defaultValue={editingSubject?.teacher_name}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Wählen...</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={`${t.first_name} ${t.last_name}`}>{t.last_name}, {t.first_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kategorie</label>
                                <select
                                    name="category"
                                    defaultValue={editingSubject?.category || 'fachmodul'}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-semibold"
                                >
                                    <option value="fachmodul">Fachmodul</option>
                                    <option value="allgemeinbildung">Allgemeinbildung</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Lernfeld-Mapping (JSON)</label>
                                    <Badge variant="outline" className="text-[10px]"><Info className="h-2 w-2 mr-1" /> Optional</Badge>
                                </div>
                                <textarea
                                    name="learning_fields"
                                    defaultValue={editingSubject?.learning_fields ? (typeof editingSubject.learning_fields === 'string' ? editingSubject.learning_fields : JSON.stringify(editingSubject.learning_fields, null, 2)) : ''}
                                    placeholder='{"Note1": "Programmierung I", "Note2": "Datenbanken"}'
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <p className="text-[10px] text-muted-foreground">Mappt Spaltennamen (NoteX) auf Klarnamen für das Zeugnis.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit">{editingSubject ? 'Speichern' : 'Hinzufügen'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
