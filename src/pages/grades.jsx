import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, STORAGE_KEYS } from '../lib/api'
import { Search, Filter, Trash2, Download, FileText, User, GraduationCap, BookOpen, LayoutList, LayoutGrid, TrendingUp, MoveUpRight, MoreVertical } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { calculateAverages, getGradeColorClass } from '@/lib/grading-utils'
import { evaluateReexamination } from '@/lib/reexamination'
import { AlertTriangle, Flag, Info, Edit2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GradeEditDialog } from '@/components/grade-edit-dialog'

export default function GradesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterClass, setFilterClass] = useState('all')
    const [filterSubject, setFilterSubject] = useState('all')
    const [viewMode, setViewMode] = useState('student') // 'table' | 'student'
    const [filterReexam, setFilterReexam] = useState('all') // 'all', 'overall', 'module', 'manual', 'any'
    const [filterCompleteness, setFilterCompleteness] = useState('all') // 'all', 'incomplete', 'complete'
    const [editingGrade, setEditingGrade] = useState(null)

    const { data: grades = [], isLoading: loadingGrades } = useQuery({
        queryKey: ['grades'],
        queryFn: () => api.list('grades'),
    })

    const { data: classes = [] } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => api.list(STORAGE_KEYS.CLASSES),
    })

    const { data: subjects = [] } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => api.list(STORAGE_KEYS.SUBJECTS),
    })

    const { data: students = [] } = useQuery({
        queryKey: [STORAGE_KEYS.STUDENTS, filterClass],
        queryFn: () => api.list(STORAGE_KEYS.STUDENTS, filterClass !== 'all' ? { class_id: filterClass } : {}),
    })

    const { data: completenessData } = useQuery({
        queryKey: ['completeness', filterClass],
        queryFn: () => api.get('completeness', { classId: filterClass }),
        enabled: filterClass !== 'all'
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.update('grades', id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['grades'])
            setEditingGrade(null)
            toast({ title: 'Erfolg', description: 'Note wurde aktualisiert.' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete('grades', id),
        onSuccess: () => {
            queryClient.invalidateQueries(['grades'])
            toast({ title: 'Erfolg', description: 'Note wurde gelöscht.' })
        }
    })

    const filteredGrades = grades.filter(g => {
        const matchesSearch =
            g.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.class_name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesClass = filterClass === 'all' || g.class_id === filterClass
        const matchesSubject = filterSubject === 'all' || g.subject_id === filterSubject

        return matchesSearch && matchesClass && matchesSubject
    })

    // Grouping logic for "Student View"
    const studentsWithGrades = useMemo(() => {
        // If a class is filtered, start with ALL students from that class
        const initialGrouped = {}
        if (filterClass !== 'all') {
            students.forEach(s => {
                initialGrouped[s.id] = {
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    class_name: s.class_name,
                    class_id: s.class_id,
                    subjects: {},
                    totalGrades: 0
                }
            })
        }

        const grouped = filteredGrades.reduce((acc, g) => {
            if (!acc[g.student_id]) {
                acc[g.student_id] = {
                    id: g.student_id,
                    name: g.student_name,
                    class_name: g.class_name,
                    class_id: g.class_id,
                    subjects: {},
                    totalGrades: 0
                }
            }
            if (!acc[g.student_id].subjects[g.subject_id]) {
                acc[g.student_id].subjects[g.subject_id] = {
                    id: g.subject_id,
                    name: g.subject_name,
                    grades: []
                }
            }
            acc[g.student_id].subjects[g.subject_id].grades.push(g)
            acc[g.student_id].totalGrades++
            return acc
        }, initialGrouped)

        const studentList = Object.values(grouped).map(s => {
            const allGrades = Object.values(s.subjects).flatMap(sub => sub.grades)

            // Re-examination Evaluation
            const reexamResult = evaluateReexamination(allGrades)

            // Per subject averages + completeness mapping
            const completeness = completenessData?.perStudent?.[s.id] || { missingModules: [], totalMissingCount: 0 }

            const subjectsWithAvg = Object.values(s.subjects).map(sub => {
                const missing = completeness.missingModules.find(m => m.subject_id === sub.id)
                return {
                    ...sub,
                    avg: calculateAverages(sub.grades).final,
                    completeness: missing || null
                }
            })

            return {
                ...s,
                average: reexamResult.overallAverage,
                reexamResult,
                subjects: subjectsWithAvg,
                completeness
            }
        }).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '') || (a.first_name || '').localeCompare(b.first_name || ''))

        // Applying Filters
        let result = studentList;

        if (filterReexam !== 'all') {
            result = result.filter(s => {
                if (filterReexam === 'overall') return s.reexamResult.hasOverallFailure;
                if (filterReexam === 'module') return s.reexamResult.hasModuleFailure;
                if (filterReexam === 'manual') return s.reexamResult.hasManualFlag;
                if (filterReexam === 'any') return s.reexamResult.finalReexaminationRequired;
                return true;
            });
        }

        if (filterCompleteness !== 'all') {
            result = result.filter(s => {
                if (filterCompleteness === 'incomplete') return s.completeness.totalMissingCount > 0;
                if (filterCompleteness === 'complete') return s.completeness.totalMissingCount === 0;
                return true;
            });
        }

        return result;
    }, [filteredGrades, filterReexam, filterCompleteness, completenessData, students, filterClass])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notenverwaltung</h1>
                    <p className="text-muted-foreground">
                        Suchen und filtern Sie alle im System hinterlegten Noten.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="flex border rounded-md overflow-hidden mr-2">
                        <Button
                            variant={viewMode === 'student' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-none h-9 px-3"
                            onClick={() => setViewMode('student')}
                        >
                            <LayoutGrid className="h-4 w-4 mr-1" /> Noten pro Schüler
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-none h-9 px-3"
                            onClick={() => setViewMode('table')}
                        >
                            <LayoutList className="h-4 w-4 mr-1" /> Liste view
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-9">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Name, Fach oder Klasse..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="all">Alle Klassen</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="all">Alle Fächer</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            value={filterReexam}
                            onChange={(e) => setFilterReexam(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-bold text-primary"
                        >
                            <option value="all">Alle Status</option>
                            <option value="any">⚠ Nachprüfung erforderlich</option>
                            <option value="overall">Schnitt unter 4.0</option>
                            <option value="module">Modul unter 4.0</option>
                            <option value="manual">Manuell markiert</option>
                        </select>
                        <select
                            value={filterCompleteness}
                            onChange={(e) => setFilterCompleteness(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <option value="all">Füllstand (Alle)</option>
                            <option value="incomplete">⚠ Unvollständig</option>
                            <option value="complete">Vollständig</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingGrades ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : viewMode === 'table' ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Student</TableHead>
                                        <TableHead>Klasse</TableHead>
                                        <TableHead>Fach / Lernfeld</TableHead>
                                        <TableHead className="text-center">Note</TableHead>
                                        <TableHead>Semester / Jahr</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredGrades.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Keine Noten gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredGrades.map((grade) => (
                                            <TableRow key={grade.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        {grade.student_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-xs">
                                                        <GraduationCap className="mr-1 h-3 w-3 text-muted-foreground" />
                                                        {grade.class_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="flex items-center text-sm font-semibold">
                                                            <BookOpen className="mr-1 h-3 w-3 text-primary" /> {grade.subject_name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground italic px-4">
                                                            {grade.learning_field_name || grade.comment}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div
                                                        className="relative group cursor-pointer inline-block"
                                                        onClick={() => setEditingGrade(grade)}
                                                    >
                                                        <Badge variant="outline" className={cn("text-sm font-bold w-10 h-8 flex items-center justify-center mx-auto transition-transform group-hover:scale-110", getGradeColorClass(grade.grade_value))}>
                                                            {grade.grade_value ? grade.grade_value.toFixed(1) : '-'}
                                                        </Badge>
                                                        <div className="absolute -right-1 -top-1 bg-primary text-primary-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Edit2 className="h-2 w-2" />
                                                        </div>
                                                    </div>
                                                    {grade.weight && (
                                                        <span className="text-[9px] text-muted-foreground block mt-1">Gewicht: {grade.weight}%</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-[10px]">
                                                        <span>{grade.semester}</span>
                                                        <span className="text-muted-foreground">{grade.school_year}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={cn("h-8 w-8", grade.reexamination_required ? "text-red-500" : "text-muted-foreground/30 hover:text-red-400")}
                                                                    onClick={() => updateMutation.mutate({ id: grade.id, data: { reexamination_required: !grade.reexamination_required } })}
                                                                >
                                                                    <Flag className={cn("h-4 w-4", grade.reexamination_required && "fill-current")} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {grade.reexamination_required ? 'Manuelle Markierung entfernen' : 'Für Nachprüfung markieren'}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => deleteMutation.mutate(grade.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-4 py-2 bg-muted/20 rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-muted">
                                <span className="w-1/4">Schüler</span>
                                <span className="w-1/12 text-center border-l">Klasse</span>
                                <span className="w-1/12 text-center border-l">Noten</span>
                                <span className="w-1/6 text-center border-l">Schnitt</span>
                                <span className="flex-1 pl-10 border-l">Fächer & Einzelergebnisse</span>
                            </div>

                            {studentsWithGrades.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-lg bg-muted/5">
                                    Keine aggregierten Notendaten für die aktuelle Auswahl gefunden.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50 border rounded-lg bg-card shadow-sm">
                                    {studentsWithGrades.map((s) => (
                                        <div key={s.id} className="flex flex-col md:flex-row items-center py-6 px-4 hover:bg-muted/5 transition-all group border-l-4 border-l-transparent data-[reexam=true]:border-l-red-500" data-reexam={s.reexamResult.finalReexaminationRequired}>
                                            <div className="w-full md:w-1/4 mb-4 md:mb-0">
                                                <div className="flex flex-col">
                                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{s.name}</p>
                                                    {s.reexamResult.finalReexaminationRequired && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {s.reexamResult.reexaminationReasons.map((reason, rIdx) => (
                                                                <Badge key={rIdx} variant="destructive" className="text-[9px] h-4 py-0 px-1 font-bold">
                                                                    ⚠ {reason}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {s.completeness.totalMissingCount > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 font-bold border-orange-500 text-orange-600 bg-orange-50 cursor-help">
                                                                            ⚠ {s.completeness.missingModules.length === 1
                                                                                ? `Fehlende Note: ${s.completeness.missingModules[0].subject_name}`
                                                                                : `Fehlende Noten (${s.completeness.missingModules.length} Module)`}
                                                                        </Badge>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="p-2">
                                                                        <p className="font-bold mb-1">Fehlende Einträge:</p>
                                                                        <ul className="text-xs space-y-1">
                                                                            {s.completeness.missingModules.map((m, mIdx) => (
                                                                                <li key={mIdx}>
                                                                                    {m.subject_name}: {m.actualCount}/{m.expectedCount} (fehlen: {m.missingCount})
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="w-full md:w-1/12 flex justify-center mb-4 md:mb-0">
                                                <Badge className="bg-blue-500/10 text-blue-600 rounded-sm border-blue-200/50 px-2 text-[10px] font-black uppercase tracking-tighter ring-1 ring-blue-500/20">{s.class_name}</Badge>
                                            </div>

                                            <div className="w-full md:w-1/12 text-center mb-4 md:mb-0">
                                                <span className="text-base font-semibold text-slate-500">{s.totalGrades}</span>
                                            </div>

                                            <div className="w-full md:w-1/6 flex items-center justify-center gap-2 mb-4 md:mb-0">
                                                <span className="text-3xl font-black text-blue-600 tracking-tighter">{s.average}</span>
                                                <div className="flex flex-col items-center">
                                                    <MoveUpRight className="h-4 w-4 text-green-500 mb-[-4px]" />
                                                    <div className="h-0.5 w-4 bg-green-500/20 rounded-full" />
                                                </div>
                                            </div>

                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 md:pl-10">
                                                {s.subjects.map((sub, idx) => (
                                                    <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.15)] hover:border-primary/20 transition-all">
                                                        <div className="flex justify-between items-start mb-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-[11px] uppercase text-slate-600 dark:text-slate-400 tracking-wider font-mono">{sub.name}</span>
                                                                {sub.completeness && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-[9px] font-bold text-orange-600 flex items-center gap-1 cursor-help mt-0.5">
                                                                                    <AlertTriangle className="h-2.5 w-2.5" /> {sub.completeness.actualCount}/{sub.completeness.expectedCount} Noten
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="bottom">
                                                                                <p className="text-xs">{sub.completeness.missingCount} Note(n) fehlen in diesem Modul</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                            <span className={cn("text-xs font-black px-2 py-0.5 rounded-full ring-1 border",
                                                                sub.avg >= 5.5 ? "text-green-700 bg-green-50 border-green-200 ring-green-200/50" :
                                                                    sub.avg >= 4.0 ? "text-blue-700 bg-blue-50 border-blue-200 ring-blue-200/50" :
                                                                        "text-red-700 bg-red-50 border-red-200 ring-red-200/50"
                                                            )}>
                                                                Ø {sub.avg}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                                                            {sub.grades.map((g, gIdx) => (
                                                                <div
                                                                    key={gIdx}
                                                                    className="flex flex-col items-center min-w-[20px] cursor-pointer hover:bg-muted/50 rounded p-0.5 transition-colors group/note relative"
                                                                    onClick={() => setEditingGrade(g)}
                                                                >
                                                                    <span className={cn("text-[13px] font-black leading-none",
                                                                        g.grade_value >= 5.5 ? "text-green-600" : g.grade_value >= 4.0 ? "text-blue-600" : "text-red-600"
                                                                    )}>{g.grade_value}</span>
                                                                    {g.weight && <span className="text-[8px] font-medium text-slate-400 mt-1">
                                                                        <span className="opacity-50 text-[6px] mr-0.5">●</span>
                                                                        {g.weight}%
                                                                    </span>}
                                                                    {g.reexamination_required && (
                                                                        <div className="absolute -top-1 -right-1">
                                                                            <Flag className="h-2 w-2 text-red-500 fill-current" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <GradeEditDialog
                grade={editingGrade}
                isOpen={!!editingGrade}
                onClose={() => setEditingGrade(null)}
                onSave={(data) => updateMutation.mutate({ id: editingGrade.id, data })}
                isLoading={updateMutation.isPending}
            />
        </div>
    )
}
