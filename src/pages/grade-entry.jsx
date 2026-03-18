import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, STORAGE_KEYS } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Save, History, Search, BookOpen, Users } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function GradeEntryPage() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        school_year: '2024/2025',
        semester: '1. Halbjahr',
        subject_id: '',
        class_id: ''
    });

    const { data: subjects = [] } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => api.list(STORAGE_KEYS.SUBJECTS)
    });

    const { data: classes = [] } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => api.list(STORAGE_KEYS.CLASSES)
    });

    const { data: students = [] } = useQuery({
        queryKey: [STORAGE_KEYS.STUDENTS, filters.class_id],
        queryFn: () => api.list(STORAGE_KEYS.STUDENTS, { class_id: filters.class_id }),
        enabled: !!filters.class_id
    });

    const { data: existingGrades = [] } = useQuery({
        queryKey: ['grades', filters],
        queryFn: () => api.list('grades', {
            class_id: filters.class_id,
            subject_id: filters.subject_id,
            semester: filters.semester,
            school_year: filters.school_year
        }),
        enabled: !!filters.class_id && !!filters.subject_id
    });

    const addGradeMutation = useMutation({
        mutationFn: (data) => api.create('grades', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['grades']);
            toast({ title: 'Erfolgreich', description: 'Note gespeichert' });
        }
    });

    const [activeEntry, setActiveEntry] = useState(null); // { student_id, grade_value, weight, comment }

    const handleAddGrade = (student) => {
        if (!activeEntry || activeEntry.student_id !== student.id) {
            setActiveEntry({ student_id: student.id, grade_value: '', weight: 1.0, comment: '' });
            return;
        }

        const subject = subjects.find(s => s.id === filters.subject_id);

        addGradeMutation.mutate({
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            class_id: filters.class_id,
            class_name: student.class_name,
            subject_id: filters.subject_id,
            subject_name: subject?.name || 'Unbekannt',
            grade_value: parseFloat(activeEntry.grade_value),
            weight: activeEntry.weight,
            comment: activeEntry.comment,
            semester: filters.semester,
            school_year: filters.school_year
        });

        setActiveEntry(null);
    };

    const getGradesForStudent = (studentId) => {
        return (existingGrades || []).filter(g => g.student_id === studentId);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Notenvergabe</h1>
                <p className="text-muted-foreground">Direkte Eingabe von Einzelnoten pro Schüler und Modul</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Search className="h-5 w-5" /> Filter & Auswahl
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Schuljahr</Label>
                            <Input value={filters.school_year} onChange={e => setFilters({ ...filters, school_year: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select value={filters.semester} onValueChange={v => setFilters({ ...filters, semester: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1. Halbjahr">1. Halbjahr</SelectItem>
                                    <SelectItem value="2. Halbjahr">2. Halbjahr</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Modul</Label>
                            <Select onValueChange={v => setFilters({ ...filters, subject_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                                <SelectContent>
                                    {(subjects || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Klasse</Label>
                            <Select onValueChange={v => setFilters({ ...filters, class_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                                <SelectContent>
                                    {(classes || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {filters.class_id && filters.subject_id ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> Klassenliste
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Schüler</TableHead>
                                    <TableHead>Bestehende Noten</TableHead>
                                    <TableHead className="w-[300px]">Neue Note erfassen</TableHead>
                                    <TableHead className="text-right">Aktion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(students || []).map((s) => {
                                    const grades = getGradesForStudent(s.id);
                                    const isEntering = activeEntry?.student_id === s.id;

                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">
                                                {s.first_name} {s.last_name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {grades.map(g => (
                                                        <Badge key={g.id} variant="secondary">
                                                            {g.grade_value.toFixed(1)}
                                                        </Badge>
                                                    ))}
                                                    {grades.length === 0 && <span className="text-xs text-muted-foreground italic">Keine Noten</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isEntering && (
                                                    <div className="flex gap-2 items-center">
                                                        <Input
                                                            placeholder="Note"
                                                            className="w-20"
                                                            type="number"
                                                            step="0.1"
                                                            min="1"
                                                            max="6"
                                                            value={activeEntry.grade_value}
                                                            onChange={e => setActiveEntry({ ...activeEntry, grade_value: e.target.value })}
                                                        />
                                                        <Input
                                                            placeholder="Komm."
                                                            className="flex-1"
                                                            value={activeEntry.comment}
                                                            onChange={e => setActiveEntry({ ...activeEntry, comment: e.target.value })}
                                                        />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant={isEntering ? "default" : "outline"}
                                                    onClick={() => handleAddGrade(s)}
                                                    disabled={addGradeMutation.isPending}
                                                >
                                                    {isEntering ? <Save className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                                    {isEntering ? 'Speichern' : 'Hinzufügen'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">Hoppla! Bitte wählen Sie zuerst ein Modul und eine Klasse aus.</p>
                </div>
            )}
        </div>
    );
}
