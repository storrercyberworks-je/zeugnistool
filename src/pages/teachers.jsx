import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, STORAGE_KEYS } from '../lib/api'
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, MoreHorizontal } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

export default function TeachersPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTeacher, setEditingTeacher] = useState(null)

    const { data: teachers = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.TEACHERS],
        queryFn: () => api.list(STORAGE_KEYS.TEACHERS),
    })

    const createMutation = useMutation({
        mutationFn: (data) => api.create(STORAGE_KEYS.TEACHERS, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEACHERS])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Dozent wurde erstellt.' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.update(STORAGE_KEYS.TEACHERS, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEACHERS])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Dozent wurde aktualisiert.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(STORAGE_KEYS.TEACHERS, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEACHERS])
            toast({ title: 'Erfolg', description: 'Dozent wurde gelöscht.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        if (editingTeacher) {
            updateMutation.mutate({ id: editingTeacher.id, data })
        } else {
            createMutation.mutate({ ...data, status: 'aktiv' })
        }
    }

    const filteredTeachers = (teachers || []).filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openEdit = (teacher) => {
        setEditingTeacher(teacher)
        setIsDialogOpen(true)
    }

    const openCreate = () => {
        setEditingTeacher(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dozenten</h1>
                    <p className="text-muted-foreground underline decoration-primary/30 underline-offset-4">
                        Verwalten Sie alle Lehrkräfte und Dozenten im System.
                    </p>
                </div>
                <Button onClick={openCreate} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Dozent hinzufügen
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suchen nach Name, Email oder Abteilung..."
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
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Abteilung</TableHead>
                                        <TableHead>Kontakt</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTeachers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Keine Dozenten gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTeachers.map((teacher) => (
                                            <TableRow key={teacher.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{teacher.last_name}, {teacher.first_name}</span>
                                                        <span className="text-xs text-muted-foreground">{teacher.employee_number}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{teacher.department || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            <Mail className="mr-1 h-3 w-3" /> {teacher.email}
                                                        </div>
                                                        {teacher.phone && (
                                                            <div className="flex items-center text-xs text-muted-foreground">
                                                                <Phone className="mr-1 h-3 w-3" /> {teacher.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={teacher.status === 'aktiv' ? 'success' : 'secondary'} className={teacher.status === 'aktiv' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
                                                        {teacher.status || 'aktiv'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuLabel>Optionen</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => openEdit(teacher)}>
                                                                <Edit2 className="mr-2 h-4 w-4" /> Bearbeiten
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => deleteMutation.mutate(teacher.id)}
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
                <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingTeacher ? 'Dozent bearbeiten' : 'Neuen Dozenten hinzufügen'}</DialogTitle>
                            <DialogDescription>
                                Geben Sie hier die Details der Lehrkraft ein. Klicken Sie auf Speichern, wenn Sie fertig sind.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Vorname</label>
                                    <Input name="first_name" defaultValue={editingTeacher?.first_name} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nachname</label>
                                    <Input name="last_name" defaultValue={editingTeacher?.last_name} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input name="email" type="email" defaultValue={editingTeacher?.email} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Telefon</label>
                                    <Input name="phone" defaultValue={editingTeacher?.phone} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Abteilung</label>
                                    <Input name="department" defaultValue={editingTeacher?.department} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Personal-Nummer</label>
                                    <Input name="employee_number" defaultValue={editingTeacher?.employee_number} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Raum / Sprechzeiten</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input name="office_room" placeholder="Raum" defaultValue={editingTeacher?.office_room} />
                                    <Input name="office_hours" placeholder="Sprechzeiten" defaultValue={editingTeacher?.office_hours} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Qualifikationen / Fächer</label>
                                <Input name="qualifications" placeholder="z.B. M.Sc. Informatik, Mathematik" defaultValue={editingTeacher?.qualifications} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit">{editingTeacher ? 'Speichern' : 'Hinzufügen'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
