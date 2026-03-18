import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { Plus, Search, FileText, Send, Trash2, User, Clock, CheckCircle, AlertCircle, Calendar, GraduationCap, BookOpen, MoreVertical, ExternalLink } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getAuthUser, ROLES } from '@/lib/auth'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function GradeRequestsPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newRequest, setNewRequest] = useState({
        teacher_id: '',
        class_id: '',
        subject_id: '',
        deadline: '',
        semester: 'Semester 1',
        school_year: '2024/2025',
        notes: '',
        reminder_days: '7,3,1'
    })
    const userRole = getAuthUser().role
    const isAdmin = userRole === ROLES.ADMIN

    const { data: requests = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.GRADE_REQUESTS],
        queryFn: () => MockApi.list(STORAGE_KEYS.GRADE_REQUESTS),
    })

    const { data: teachers = [] } = useQuery({
        queryKey: [STORAGE_KEYS.TEACHERS],
        queryFn: () => MockApi.list(STORAGE_KEYS.TEACHERS),
    })

    const { data: classes = [] } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => MockApi.list(STORAGE_KEYS.CLASSES),
    })

    const { data: subjects = [] } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => MockApi.list(STORAGE_KEYS.SUBJECTS),
    })

    const createMutation = useMutation({
        mutationFn: (data) => {
            const teacher = teachers.find(t => t.id === data.teacher_id)
            const cls = classes.find(c => c.id === data.class_id)
            const sub = subjects.find(s => s.id === data.subject_id)

            return MockApi.create(STORAGE_KEYS.GRADE_REQUESTS, {
                ...data,
                teacher_name: `${teacher?.first_name} ${teacher?.last_name}`,
                class_name: cls?.name,
                subject_name: sub?.name,
                title: `${sub?.name} - ${cls?.name}`,
                status: 'offen',
                created_at: new Date().toISOString()
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.GRADE_REQUESTS])
            setIsDialogOpen(false)
            setNewRequest({
                teacher_id: '',
                class_id: '',
                subject_id: '',
                deadline: '',
                semester: 'Semester 1',
                school_year: '2024/2025',
                notes: '',
                reminder_days: '7,3,1'
            })
            toast({ title: 'Erfolg', description: 'Anforderung wurde erstellt.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => MockApi.delete(STORAGE_KEYS.GRADE_REQUESTS, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.GRADE_REQUESTS])
            toast({ title: 'Gelöscht', description: 'Anforderung wurde entfernt.' })
        }
    })

    const getStatusBadge = (status) => {
        switch (status) {
            case 'offen': return <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Offen</Badge>
            case 'hochgeladen': return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" /> Hochgeladen</Badge>
            case 'verarbeitet': return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Verarbeitet</Badge>
            case 'überfällig': return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> Überfällig</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    const filteredRequests = isAdmin
        ? requests
        : requests.filter(r => r.teacher_id === 'teacher-id-placeholder' || r.teacher_name.includes('Lokal')) // Simulating teacher filter

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notenanforderungen</h1>
                    <p className="text-muted-foreground">
                        {isAdmin
                            ? "Überwachen Sie den Status der Notenabgabe durch Dozenten."
                            : "Offene Notenanforderungen für Ihre Fächer."}
                    </p>
                </div>
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Send className="mr-2 h-4 w-4" /> Neue Anforderung senden
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Neue Notenanforderung</DialogTitle>
                                <DialogDescription>
                                    Erstellen Sie eine Anforderung für eine Lehrkraft zur Notengabe.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Lehrkraft</label>
                                        <Select onValueChange={(val) => setNewRequest({ ...newRequest, teacher_id: val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wählen..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachers.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Klasse</label>
                                        <Select onValueChange={(val) => setNewRequest({ ...newRequest, class_id: val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wählen..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fach</label>
                                        <Select onValueChange={(val) => setNewRequest({ ...newRequest, subject_id: val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wählen..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Deadline</label>
                                        <Input
                                            type="date"
                                            value={newRequest.deadline}
                                            onChange={(e) => setNewRequest({ ...newRequest, deadline: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Notizen (optional)</label>
                                    <Textarea
                                        placeholder="Zusätzliche Hinweise..."
                                        value={newRequest.notes}
                                        onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                                <Button
                                    onClick={() => createMutation.mutate(newRequest)}
                                    disabled={!newRequest.teacher_id || !newRequest.class_id || !newRequest.subject_id}
                                >
                                    Anforderung erstellen
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground">Gesamt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground">Ausstehend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">{requests.filter(r => r.status === 'ausstehend').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground">Erledigt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{requests.filter(r => r.status === 'erledigt').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground">Überfällig</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">0</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Anforderung</TableHead>
                                <TableHead>Lehrkraft</TableHead>
                                <TableHead>Klasse</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Deadline</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Laden...</TableCell>
                                </TableRow>
                            ) : filteredRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                        Keine aktiven Anforderungen gefunden.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRequests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold flex items-center">
                                                    <BookOpen className="h-3 w-3 mr-1 text-primary" /> {req.subject_name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{req.semester} | {req.school_year}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm">
                                                <User className="h-3 w-3 mr-1 text-muted-foreground" /> {req.teacher_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px]">{req.class_name}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(req.status)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                                                {req.deadline ? new Date(req.deadline).toLocaleDateString('de-DE') : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isAdmin ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => deleteMutation.mutate(req.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/upload-grades?requestId=${req.id}`)}
                                                >
                                                    Noten hochladen
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
