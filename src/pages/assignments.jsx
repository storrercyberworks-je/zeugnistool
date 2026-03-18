import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, STORAGE_KEYS } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, UserPlus, BookOpen } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function AssignmentsPage() {
    const queryClient = useQueryClient();
    const [newAssignment, setNewAssignment] = useState({
        teacher_id: '',
        subject_id: '',
        class_id: '',
        school_year: '2024/2025',
        semester: '1. Halbjahr'
    });

    const { data: teachers = [] } = useQuery({
        queryKey: [STORAGE_KEYS.TEACHERS],
        queryFn: () => api.list(STORAGE_KEYS.TEACHERS)
    });

    const { data: subjects = [] } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => api.list(STORAGE_KEYS.SUBJECTS)
    });

    const { data: classes = [] } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => api.list(STORAGE_KEYS.CLASSES)
    });

    const { data: assignments = [] } = useQuery({
        queryKey: ['teacher-subject-assignments'],
        queryFn: () => api.list('teacher-subject-assignments')
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.create('teacher-subject-assignments', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['teacher-subject-assignments']);
            toast({ title: 'Erfolgreich', description: 'Zuweisung erstellt' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete('teacher-subject-assignments', id),
        onSuccess: () => {
            queryClient.invalidateQueries(['teacher-subject-assignments']);
            toast({ title: 'Erfolgreich', description: 'Zuweisung entfernt' });
        }
    });

    const handleCreate = () => {
        const teacher = teachers.find(t => t.id === newAssignment.teacher_id);
        const subject = subjects.find(s => s.id === newAssignment.subject_id);
        const targetClass = classes.find(c => c.id === newAssignment.class_id);

        if (!teacher || !subject) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Lehrer und Modul sind Pflicht' });
            return;
        }

        createMutation.mutate({
            ...newAssignment,
            teacher_name: `${teacher.first_name} ${teacher.last_name}`,
            subject_name: subject.name,
            class_name: targetClass?.name || 'Alle'
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Zuweisungen</h1>
                    <p className="text-muted-foreground">Dozenten Modulen und Klassen zuweisen</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Neue Zuweisung erstellen</CardTitle>
                    <CardDescription>Definieren Sie, wer welches Modul in welchem Semester unterrichtet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Dozent</Label>
                            <Select onValueChange={(v) => setNewAssignment({ ...newAssignment, teacher_id: v })}>
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
                            <Label>Modul</Label>
                            <Select onValueChange={(v) => setNewAssignment({ ...newAssignment, subject_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.short_name})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Klasse (Optional)</Label>
                            <Select onValueChange={(v) => setNewAssignment({ ...newAssignment, class_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Alle Klassen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Klassen</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Schuljahr</Label>
                            <Input value={newAssignment.school_year} onChange={e => setNewAssignment({ ...newAssignment, school_year: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select value={newAssignment.semester} onValueChange={(v) => setNewAssignment({ ...newAssignment, semester: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1. Halbjahr">1. Halbjahr</SelectItem>
                                    <SelectItem value="2. Halbjahr">2. Halbjahr</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                                <Plus className="mr-2 h-4 w-4" /> Zuweisen
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Aktive Zuweisungen</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dozent</TableHead>
                                <TableHead>Modul</TableHead>
                                <TableHead>Klasse</TableHead>
                                <TableHead>Zeitraum</TableHead>
                                <TableHead className="text-right">Aktion</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Keine Zuweisungen gefunden.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assignments.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">{a.teacher_name}</TableCell>
                                        <TableCell>{a.subject_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{a.class_name || 'Alle'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-muted-foreground">
                                                {a.school_year} • {a.semester}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
