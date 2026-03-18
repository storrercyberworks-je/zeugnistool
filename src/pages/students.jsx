import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, STORAGE_KEYS } from '../lib/api'
import { Plus, Search, Edit2, Trash2, GraduationCap, Mail, MoreHorizontal, User } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

export default function StudentsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingStudent, setEditingStudent] = useState(null)

    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: [STORAGE_KEYS.STUDENTS],
        queryFn: () => api.list(STORAGE_KEYS.STUDENTS),
    })

    const { data: classes = [], isLoading: loadingClasses } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => api.list(STORAGE_KEYS.CLASSES),
    })

    const createMutation = useMutation({
        mutationFn: (data) => api.create(STORAGE_KEYS.STUDENTS, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.STUDENTS])
            queryClient.invalidateQueries([STORAGE_KEYS.CLASSES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Schüler wurde erstellt.' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.update(STORAGE_KEYS.STUDENTS, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.STUDENTS])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Schüler wurde aktualisiert.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(STORAGE_KEYS.STUDENTS, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.STUDENTS])
            toast({ title: 'Erfolg', description: 'Schüler wurde gelöscht.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        // Find class name
        const selectedClass = classes.find(c => c.id === data.class_id)
        const payload = { ...data, class_name: selectedClass?.name || '' }

        if (editingStudent) {
            updateMutation.mutate({ id: editingStudent.id, data: payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const filteredStudents = (students || []).filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openEdit = (student) => {
        setEditingStudent(student)
        setIsDialogOpen(true)
    }

    const openCreate = () => {
        setEditingStudent(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Schüler</h1>
                    <p className="text-muted-foreground">
                        Verwalten Sie alle Schüler und deren Klassenzuordnung.
                    </p>
                </div>
                <Button onClick={openCreate} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Schüler hinzufügen
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen nach Name, Email oder Klasse..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {(loadingStudents || loadingClasses) ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Klasse</TableHead>
                                        <TableHead>Kontakt</TableHead>
                                        <TableHead>Geburtsdatum</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Keine Schüler gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-semibold">
                                                    <div className="flex items-center">
                                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        {student.last_name}, {student.first_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                        <GraduationCap className="h-3 w-3" /> {student.class_name || 'Keine Klasse'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                        <Mail className="mr-1 h-3 w-3" /> {student.email || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('de-DE') : '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEdit(student)}>
                                                                <Edit2 className="mr-2 h-4 w-4" /> Bearbeiten
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => deleteMutation.mutate(student.id)}
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
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingStudent ? 'Schüler bearbeiten' : 'Neuen Schüler hinzufügen'}</DialogTitle>
                            <DialogDescription>
                                Stammdaten und Klassenzuordnung des Schülers.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Vorname</label>
                                    <Input name="first_name" defaultValue={editingStudent?.first_name} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nachname</label>
                                    <Input name="last_name" defaultValue={editingStudent?.last_name} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email (Identifikator)</label>
                                <Input name="email" type="email" defaultValue={editingStudent?.email} placeholder="student@beispiel.de" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Klasse</label>
                                    <select
                                        name="class_id"
                                        defaultValue={editingStudent?.class_id}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    >
                                        <option value="">Wählen...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Geburtsdatum</label>
                                    <Input name="date_of_birth" type="date" defaultValue={editingStudent?.date_of_birth} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Adresse</label>
                                <Input name="address" defaultValue={editingStudent?.address} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bemerkungen</label>
                                <Input name="remarks" defaultValue={editingStudent?.remarks} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit">{editingStudent ? 'Speichern' : 'Hinzufügen'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
