import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, Upload, FileSpreadsheet, Loader2, Info } from 'lucide-react'
import { parseFile, HEADER_MAPPINGS, findHeader, getGradeColumns, getLearningFieldName, getWeight } from '@/lib/importer'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { getAuthUser, ROLES } from '@/lib/auth'

const BATCH_SIZE = 10

export default function UploadGradesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const requestId = searchParams.get('requestId')

    const [file, setFile] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('')
    const [results, setResults] = useState(null)
    const [previewData, setPreviewData] = useState(null)

    const { data: request } = useQuery({
        queryKey: [STORAGE_KEYS.GRADE_REQUESTS, requestId],
        queryFn: () => MockApi.get(STORAGE_KEYS.GRADE_REQUESTS, requestId),
        enabled: !!requestId
    })

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0]
        if (!selectedFile) return
        setFile(selectedFile)

        try {
            const data = await parseFile(selectedFile)
            setPreviewData(data.slice(0, 5)) // Show first 5 rows as preview
        } catch (err) {
            toast({ variant: 'destructive', title: 'Fehler beim Parsen', description: err.message })
        }
    }

    const processImport = async () => {
        if (!file) return
        setIsProcessing(true)
        setProgress(0)
        setStatus('Lade bestehende Daten...')

        try {
            const rawData = await parseFile(file)

            // PHASE 0: load existing
            const existingClasses = await MockApi.list(STORAGE_KEYS.CLASSES)
            const existingTeachers = await MockApi.list(STORAGE_KEYS.TEACHERS)
            const existingSubjects = await MockApi.list(STORAGE_KEYS.SUBJECTS)
            const existingStudents = await MockApi.list(STORAGE_KEYS.STUDENTS)
            const existingGrades = await MockApi.list(STORAGE_KEYS.GRADES)

            const stats = { students: 0, teachers: 0, classes: 0, subjects: 0, grades: 0, errors: [] }

            // Cache for quick lookups
            const teacherMap = new Map(existingTeachers.map(t => [t.email?.toLowerCase(), t]))
            const classMap = new Map(existingClasses.map(c => [c.name?.toLowerCase(), c]))
            const studentMap = new Map(existingStudents.map(s => [s.email?.toLowerCase(), s]))
            const subjectMap = new Map(existingSubjects.map(s => [s.name?.toLowerCase(), s]))

            // PHASE 1-3: Entity Lookup & Auto-Creation
            setStatus('Synchronisiere Stammdaten (Dozenten, Klassen, Schüler)...')

            for (const row of rawData) {
                const teacherEmail = row[findHeader(row, HEADER_MAPPINGS.teacher_email)]?.trim()
                const teacherName = row[findHeader(row, HEADER_MAPPINGS.teacher_name)]?.trim()
                const className = row[findHeader(row, HEADER_MAPPINGS.class_name)]?.trim()
                const moduleName = row[findHeader(row, HEADER_MAPPINGS.module_name)]?.trim()
                const studentEmail = row[findHeader(row, HEADER_MAPPINGS.student_email)]?.trim()
                const studentFirstName = row[findHeader(row, HEADER_MAPPINGS.student_first_name)]?.trim()
                const studentLastName = row[findHeader(row, HEADER_MAPPINGS.student_last_name)]?.trim()

                // Teacher
                if (teacherEmail && !teacherMap.has(teacherEmail.toLowerCase())) {
                    const newT = await MockApi.create(STORAGE_KEYS.TEACHERS, {
                        email: teacherEmail,
                        first_name: teacherName?.split(' ')[0] || 'Dozent',
                        last_name: teacherName?.split(' ').slice(1).join(' ') || 'Unbekannt',
                        short_name: teacherEmail.split('@')[0].toUpperCase()
                    })
                    teacherMap.set(teacherEmail.toLowerCase(), newT)
                    stats.teachers++
                }

                // Class
                if (className && !classMap.has(className.toLowerCase())) {
                    // Try to guess grade level from name (e.g. IET-2A -> 2)
                    const gradeLevelMatch = className.match(/\d/);
                    const gradeLevel = gradeLevelMatch ? parseInt(gradeLevelMatch[0]) : 1;

                    const newC = await MockApi.create(STORAGE_KEYS.CLASSES, {
                        name: className,
                        school_year: '2024/2025',
                        grade_level: gradeLevel,
                        class_teacher_name: teacherName || ''
                    })
                    classMap.set(className.toLowerCase(), newC)
                    stats.classes++
                }

                // Subject
                if (moduleName && !subjectMap.has(moduleName.toLowerCase())) {
                    const newS = await MockApi.create(STORAGE_KEYS.SUBJECTS, {
                        name: moduleName,
                        short_name: moduleName.substring(0, 5).toUpperCase(),
                        category: 'fachmodul' // default to fachmodul as most imports are notes
                    })
                    subjectMap.set(moduleName.toLowerCase(), newS)
                    stats.subjects++
                }

                // Student
                if (studentEmail && !studentMap.has(studentEmail.toLowerCase())) {
                    const cls = classMap.get(className?.toLowerCase())
                    const newSt = await MockApi.create(STORAGE_KEYS.STUDENTS, {
                        email: studentEmail,
                        first_name: studentFirstName || 'Schüler',
                        last_name: studentLastName || 'Unbekannt',
                        class_id: cls?.id || '',
                        class_name: cls?.name || className || ''
                    })
                    studentMap.set(studentEmail.toLowerCase(), newSt)
                    stats.students++
                }
            }

            // PHASE 4: Grades splitting + upsert in batches
            const totalRows = rawData.length
            const stats_grades = { created: 0, updated: 0 }

            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                const batch = rawData.slice(i, i + BATCH_SIZE)
                const stepProgress = Math.round(((i + batch.length) / totalRows) * 100)
                setProgress(stepProgress)
                setStatus(`Verarbeite Noten: Zeile ${i + 1} bis ${Math.min(i + BATCH_SIZE, totalRows)}...`)

                for (const row of batch) {
                    const sEmail = row[findHeader(row, HEADER_MAPPINGS.student_email)]?.trim().toLowerCase()
                    const mName = row[findHeader(row, HEADER_MAPPINGS.module_name)]?.trim()
                    const tEmail = row[findHeader(row, HEADER_MAPPINGS.teacher_email)]?.trim().toLowerCase()
                    const cName = row[findHeader(row, HEADER_MAPPINGS.class_name)]?.trim()

                    const student = studentMap.get(sEmail)
                    const subject = subjectMap.get(mName?.toLowerCase())
                    const teacher = teacherMap.get(tEmail)
                    const cls = classMap.get(cName?.toLowerCase())

                    const gradeCols = getGradeColumns(row)
                    for (const col of gradeCols) {
                        const val = parseFloat(row[col])
                        if (isNaN(val)) continue

                        const colNum = col.replace(/\D/g, '') || '1'
                        const lfName = getLearningFieldName(col, row, colNum)
                        const weight = getWeight(row, colNum)

                        const semester = '1. Halbjahr'
                        const school_year = '2024/2025'

                        // Unique Identifier check: student_id + subject_id + semester + school_year + learning_field_name
                        const existing = existingGrades.find(g =>
                            g.student_id === student?.id &&
                            g.subject_id === subject?.id &&
                            g.semester === semester &&
                            g.school_year === school_year &&
                            g.learning_field_name === lfName
                        )

                        const gradeData = {
                            student_id: student?.id || '',
                            student_name: student ? `${student.first_name} ${student.last_name}` : 'Unbekannt',
                            class_id: cls?.id || '',
                            class_name: cls?.name || '',
                            subject_id: subject?.id || '',
                            subject_name: subject?.name || mName || '',
                            grade_value: val,
                            weight: weight,
                            learning_field_name: lfName,
                            semester: semester,
                            school_year: school_year,
                            teacher_id: teacher?.id || '',
                            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
                            comment: lfName
                        }

                        if (existing) {
                            await MockApi.update(STORAGE_KEYS.GRADES, existing.id, gradeData)
                            stats_grades.updated++
                        } else {
                            await MockApi.create(STORAGE_KEYS.GRADES, gradeData)
                            stats_grades.created++
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 50))
            }

            if (requestId) {
                await MockApi.update(STORAGE_KEYS.GRADE_REQUESTS, requestId, {
                    status: 'verarbeitet',
                    uploaded_at: new Date().toISOString()
                })
                queryClient.invalidateQueries([STORAGE_KEYS.GRADE_REQUESTS])
            }

            const finalStats = { ...stats, grades_created: stats_grades.created, grades_updated: stats_grades.updated }
            setResults(finalStats)
            queryClient.invalidateQueries()
            toast({ title: 'Import abgeschlossen', description: `${stats_grades.created} neu, ${stats_grades.updated} aktualisiert.` })
        } catch (err) {
            console.error(err)
            toast({ variant: 'destructive', title: 'Import Fehler', description: err.message })
        } finally {
            setIsProcessing(false)
            setStatus('')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {request ? `Noten-Upload: ${request.title}` : 'Excel Bulk-Upload'}
                    </h1>
                    <p className="text-muted-foreground">
                        {request
                            ? `Leistungsdaten für Klasse ${request.class_name} und Fach ${request.subject_name} hochladen.`
                            : 'Importieren Sie Noten, Schüler und Lehrer direkt aus einer Excel- oder CSV-Datei.'}
                    </p>
                </div>
            </div>

            {request && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center gap-4">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Anforderungs-Kontext aktiv</p>
                        <p className="text-xs text-muted-foreground">Der Import wird automatisch der Anforderung vom {new Date(request.created_at).toLocaleDateString()} zugeordnet.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/grade-requests')}>Abbrechen</Button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Datei auswählen
                        </CardTitle>
                        <CardDescription>Unterstützte Formate: .xlsx, .xls, .csv</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 transition-colors">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <div>
                                <Button variant="outline" onClick={() => document.getElementById('file-upload').click()}>
                                    Datei vom Computer wählen
                                </Button>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {file && <p className="text-sm font-medium text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {file.name}</p>}
                        </div>

                        {previewData && !isProcessing && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Vorschau (erste 5 Zeilen):</h3>
                                <div className="max-h-60 overflow-auto border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                {Object.keys(previewData[0]).map(k => <TableHead key={k} className="text-[10px] whitespace-nowrap">{k}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.map((row, i) => (
                                                <TableRow key={i}>
                                                    {Object.values(row).map((v, j) => <TableCell key={j} className="text-[10px] truncate max-w-[100px]">{String(v)}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button onClick={processImport} disabled={isProcessing}>
                                        Import jetzt starten
                                    </Button>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="space-y-4 py-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {status}</span>
                                    <span className="font-bold">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        {results && (
                            <div className="bg-primary/5 p-4 rounded-lg space-y-3 animate-in zoom-in-95">
                                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Import Ergebnis</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <div className="bg-background p-2 rounded border text-center">
                                        <p className="text-xs text-muted-foreground">Schüler (+{results.students})</p>
                                        <p className="text-xl font-bold">{results.students}</p>
                                    </div>
                                    <div className="bg-background p-2 rounded border text-center">
                                        <p className="text-xs text-muted-foreground">Lehrer (+{results.teachers})</p>
                                        <p className="text-xl font-bold">{results.teachers}</p>
                                    </div>
                                    <div className="bg-background p-2 rounded border text-center">
                                        <p className="text-xs text-muted-foreground">Klassen (+{results.classes})</p>
                                        <p className="text-xl font-bold">{results.classes}</p>
                                    </div>
                                    <div className="bg-background p-2 rounded border text-center">
                                        <p className="text-xs text-muted-foreground">Fächer (+{results.subjects})</p>
                                        <p className="text-xl font-bold">{results.subjects}</p>
                                    </div>
                                    <div className="bg-background p-2 rounded border text-center bg-primary/10 border-primary/20">
                                        <p className="text-[10px] text-primary font-bold uppercase">Neue Noten</p>
                                        <p className="text-xl font-bold text-primary">{results.grades_created}</p>
                                    </div>
                                    <div className="bg-background p-2 rounded border text-center bg-orange-500/10 border-orange-200">
                                        <p className="text-[10px] text-orange-600 font-bold uppercase">Aktualisiert</p>
                                        <p className="text-xl font-bold text-orange-600">{results.grades_updated}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Anleitung & Formate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="space-y-2">
                            <p className="font-bold text-primary">Erforderliche Spalten:</p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                <li>Name Student, Vorname Student</li>
                                <li>Email Student</li>
                                <li>Klasse (z.B. BFS-24)</li>
                                <li>Dozent Email</li>
                                <li>Modul/Lernfeld</li>
                                <li>Note1, Note2...</li>
                            </ul>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <p className="font-bold flex items-center gap-1"><Info className="h-3 w-3" /> Smart Import:</p>
                            <p className="text-muted-foreground leading-relaxed">
                                Fehlende Schüler, Lehrer oder Klassen werden automatisch erstellt. Die Spaltenerkennung ist flexibel (z.B. "Name" statt "Name Student").
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
