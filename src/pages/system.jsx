import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import {
    AlertTriangle,
    Trash2,
    Archive,
    RefreshCcw,
    ShieldAlert,
    CheckCircle2,
    Loader2,
    Calendar,
    BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

export default function SystemPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleteTermsAccepted, setDeleteTermsAccepted] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
    const [schoolYearFrom, setSchoolYearFrom] = useState('2024/2025')
    const [schoolYearTo, setSchoolYearTo] = useState('2025/2026')
    const [archiveNote, setArchiveNote] = useState('')
    const [prepNewYear, setPrepNewYear] = useState(true)
    const [isArchiving, setIsArchiving] = useState(false)
    const [archiveProgress, setArchiveProgress] = useState(0)

    const { data: lastArchive } = useQuery({
        queryKey: [STORAGE_KEYS.ARCHIVE_RUNS],
        queryFn: async () => {
            const runs = await MockApi.list(STORAGE_KEYS.ARCHIVE_RUNS);
            if (!runs || runs.length === 0) return null;
            const latest = [...runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            if (latest) {
                if (typeof latest.counts === 'string') {
                    try { latest.counts = JSON.parse(latest.counts); } catch (e) { latest.counts = {}; }
                }
                if (!latest.counts) latest.counts = {};
            }
            return latest;
        }
    })

    const handleDeleteAll = async () => {
        if (deleteConfirmText !== 'DELETE ALL' || !deleteTermsAccepted) return

        setIsDeleting(true)
        try {
            await MockApi.clearAllData()
            queryClient.invalidateQueries()
            toast({ title: 'System-Reset abgeschlossen', description: 'Alle Geschäftsdaten wurden unwiderruflich gelöscht.' })
            setDeleteDialogOpen(false)
            navigate('/dashboard')
        } catch (error) {
            toast({ variant: 'destructive', title: 'Fehler', description: error.message })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleArchive = async () => {
        setIsArchiving(true)
        setArchiveProgress(0)

        const runId = Math.random().toString(36).substring(2, 9)
        const run = {
            id: runId,
            created_at: new Date().toISOString(),
            created_by: 'local',
            school_year_from: schoolYearFrom,
            school_year_to: schoolYearTo,
            note: archiveNote,
            status: 'running',
            counts: { teachers: 0, subjects: 0, classes: 0, students: 0, grades: 0, grade_requests: 0, certificates: 0, templates: 0 }
        }

        try {
            // Start the run
            await MockApi.create(STORAGE_KEYS.ARCHIVE_RUNS, run)

            const entities = [
                { key: STORAGE_KEYS.TEACHERS, type: 'Teacher' },
                { key: STORAGE_KEYS.SUBJECTS, type: 'Subject' },
                { key: STORAGE_KEYS.CLASSES, type: 'Class' },
                { key: STORAGE_KEYS.STUDENTS, type: 'Student' },
                { key: STORAGE_KEYS.GRADES, type: 'Grade' },
                { key: STORAGE_KEYS.GRADE_REQUESTS, type: 'GradeRequest' },
                { key: STORAGE_KEYS.CERTIFICATES, type: 'Certificate' },
                { key: STORAGE_KEYS.TEMPLATES, type: 'CertificateTemplate' }
            ]

            let totalSnapshots = 0
            for (let i = 0; i < entities.length; i++) {
                const ent = entities[i]
                const items = await MockApi.list(ent.key)

                // Track counts
                run.counts[ent.key.replace('nm_', '')] = items.length
                totalSnapshots += items.length

                // Write snapshots (In batches for performance simulation)
                const snapshots = items.map(item => ({
                    archive_run_id: runId,
                    entity_type: ent.type,
                    original_id: item.id,
                    data: item,
                    created_at: new Date().toISOString()
                }))

                if (snapshots.length > 0) {
                    await MockApi.bulkCreate(STORAGE_KEYS.ARCHIVE_SNAPSHOTS, snapshots)
                }

                setArchiveProgress(Math.round(((i + 1) / entities.length) * 100))
                await new Promise(r => setTimeout(r, 200)) // Visual feedback
            }

            // Finish the run
            await MockApi.update(STORAGE_KEYS.ARCHIVE_RUNS, runId, { status: 'done', counts: run.counts })

            // Optional "Preset New Year"
            if (prepNewYear) {
                // Delete temporal data
                const temporal = [STORAGE_KEYS.GRADES, STORAGE_KEYS.GRADE_REQUESTS, STORAGE_KEYS.CERTIFICATES]
                for (const key of temporal) {
                    const items = await MockApi.list(key)
                    for (const item of items) {
                        await MockApi.delete(key, item.id)
                    }
                }

                // Update Classes and reset student counts
                const classes = await MockApi.list(STORAGE_KEYS.CLASSES)
                for (const cls of classes) {
                    await MockApi.update(STORAGE_KEYS.CLASSES, cls.id, {
                        year: schoolYearTo,
                        student_count: 0 // Will be recalculated by student updates or re-linking
                    })
                }

                // Students remain, but counts need refresh
                const students = await MockApi.list(STORAGE_KEYS.STUDENTS)
                for (const s of students) {
                    const cls = classes.find(c => c.id === s.class_id)
                    if (cls) {
                        const updatedCount = (await MockApi.get(STORAGE_KEYS.CLASSES, cls.id)).student_count + 1
                        await MockApi.update(STORAGE_KEYS.CLASSES, cls.id, { student_count: updatedCount })
                    }
                }
            }

            toast({ title: 'Archivierung abgeschlossen', description: `Sicherung erstellt und System für ${schoolYearTo} vorbereitet.` })
            setArchiveDialogOpen(false)
            queryClient.invalidateQueries()
        } catch (error) {
            console.error(error)
            await MockApi.update(STORAGE_KEYS.ARCHIVE_RUNS, runId, { status: 'failed', error: error.message })
            toast({ variant: 'destructive', title: 'Archiv Error', description: error.message })
        } finally {
            setIsArchiving(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System-Verwaltung</h1>
                    <p className="text-muted-foreground">Wartung, Datensicherung und Vorbereitung auf das neue Schuljahr.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Statistics / Last Run */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Archive className="h-5 w-5" /> Letzter Archiv-Lauf
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lastArchive ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Zeitraum:</span>
                                    <Badge variant="outline">{lastArchive.school_year_from} → {lastArchive.school_year_to}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Datum:</span>
                                    <span className="text-sm font-medium">{new Date(lastArchive.created_at).toLocaleString('de-DE')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    <Badge variant={lastArchive.status === 'done' ? 'success' : 'destructive'}>
                                        {lastArchive.status === 'done' ? 'Erfolgreich' : 'Fehlerhaft'}
                                    </Badge>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Snapshots:</p>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        {Object.entries(lastArchive?.counts || {}).map(([k, v]) => (
                                            <div key={k} className="flex justify-between bg-muted/30 p-1.5 rounded">
                                                <span className="capitalize">{k}:</span>
                                                <span className="font-bold">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-lg">
                                <RefreshCcw className="h-8 w-8 mb-2 opacity-20" />
                                <p>Noch kein Archivlauf durchgeführt.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/archive')}>Zum Archiv-Browser</Button>
                    </CardFooter>
                </Card>

                {/* Actions */}
                <Card className="border-orange-500/20 bg-orange-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <ShieldAlert className="h-5 w-5" /> Kritische Aktionen
                        </CardTitle>
                        <CardDescription>Diese Aktionen verändern oder löschen Massendaten und können nicht rückgängig gemacht werden.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background border rounded-lg flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-bold">Archivieren & Neues Jahr</p>
                                <p className="text-xs text-muted-foreground">Sichert alle aktuellen Daten im Archiv-Snapshot und setzt das System (Noten/Zeugnisse) für das nächste Jahr zurück.</p>
                            </div>
                            <Button variant="warning" size="sm" onClick={() => setArchiveDialogOpen(true)}>
                                Archivieren
                            </Button>
                        </div>

                        <div className="p-4 bg-background border border-red-200 dark:border-red-900 rounded-lg flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-red-600">Werkseinstellung (Reset)</p>
                                <p className="text-xs text-muted-foreground">Löscht absolut alle Daten (ausser Archivläufe) unwiderruflich aus der Datenbank.</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                                Alles löschen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DELETE ALL DIALOG */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" /> Bist Du absolut sicher?
                        </DialogTitle>
                        <DialogDescription>
                            Dieser Vorgang löscht alle Lehrer, Schüler, Klassen, Fächer, Noten, Anforderungen und Zeugnisse.
                            Das System wird vollständig geleert.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Bestätigungstext</label>
                            <p className="text-[10px] italic mb-1">Bitte tippe "DELETE ALL" um fortzufahren:</p>
                            <Input
                                placeholder="Eingabe..."
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="border-red-500/50 focus-visible:ring-red-500"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" checked={deleteTermsAccepted} onCheckedChange={setDeleteTermsAccepted} />
                            <label
                                htmlFor="terms"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Ich habe verstanden, dass dieser Schritt nicht rückgängig gemacht werden kann.
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Abbrechen</Button>
                        <Button
                            variant="destructive"
                            disabled={deleteConfirmText !== 'DELETE ALL' || !deleteTermsAccepted || isDeleting}
                            onClick={handleDeleteAll}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Jetzt löschen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ARCHIVE DIALOG */}
            <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Archive className="h-5 w-5 text-primary" /> Archivierung starten
                        </DialogTitle>
                        <DialogDescription>
                            Sichert den aktuellen Stand der Datenbank für spätere Einsicht.
                        </DialogDescription>
                    </DialogHeader>

                    {isArchiving ? (
                        <div className="py-10 space-y-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold">Archiv wird erstellt ({archiveProgress}%)</p>
                                <p className="text-xs text-muted-foreground italic">Bitte das Fenster nicht schliessen...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Von Schuljahr</label>
                                    <Input value={schoolYearFrom} onChange={e => setSchoolYearFrom(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Nach Schuljahr</label>
                                    <Input value={schoolYearTo} onChange={e => setSchoolYearTo(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Notiz (Optional)</label>
                                <textarea
                                    className="w-full min-h-[80px] rounded-md border p-2 text-sm bg-background"
                                    placeholder="Z.b. Abschluss 2024..."
                                    value={archiveNote}
                                    onChange={e => setArchiveNote(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-lg">
                                <Checkbox id="prep-year" checked={prepNewYear} onCheckedChange={setPrepNewYear} />
                                <div className="space-y-1">
                                    <label htmlFor="prep-year" className="text-sm font-bold leading-none">
                                        System für neues Schuljahr vorbereiten
                                    </label>
                                    <p className="text-[10px] text-muted-foreground">
                                        Löscht Noten, Zeugnisse und Anforderungen, passt das Jahr in den Klassen an.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {!isArchiving && <Button variant="ghost" onClick={() => setArchiveDialogOpen(false)}>Abbrechen</Button>}
                        {!isArchiving && (
                            <Button onClick={handleArchive}>
                                Archivlauf starten
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
