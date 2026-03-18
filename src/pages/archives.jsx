import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import {
    Database,
    Download,
    Clock,
    Calendar,
    ChevronRight,
    ChevronDown,
    Search,
    Filter,
    FileJson,
    Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function ArchivesPage() {
    const { toast } = useToast()
    const [isExporting, setIsExporting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const { data: archiveRuns = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.ARCHIVE_RUNS],
        queryFn: () => MockApi.list(STORAGE_KEYS.ARCHIVE_RUNS)
    })

    const parseJson = (str, fallback = {}) => {
        try {
            if (!str) return fallback;
            return typeof str === 'string' ? JSON.parse(str) : str;
        } catch (e) {
            return fallback;
        }
    }

    const filteredRuns = (archiveRuns || [])
        .filter(r =>
            (r.school_year_from || '').includes(searchTerm) ||
            (r.school_year_to || '').includes(searchTerm) ||
            (r.note && r.note.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const handleExport = async (run) => {
        setIsExporting(true)
        try {
            const allSnapshots = await MockApi.list(STORAGE_KEYS.ARCHIVE_SNAPSHOTS)
            const runSnapshots = allSnapshots.filter(s => s.archive_run_id === run.id)

            const exportData = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    system: 'NotenMeister',
                    version: '1.0'
                },
                archive_run: run,
                snapshots: runSnapshots
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Archive_${run.school_year_from.replace('/', '-')}_to_${run.school_year_to.replace('/', '-')}_${run.id}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({ title: 'Export erfolgreich', description: `Archiv ${run.id} wurde als JSON heruntergeladen.` })
        } catch (error) {
            toast({ variant: 'destructive', title: 'Export Fehler', description: error.message })
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Database className="h-8 w-8 text-primary" /> Archiv-Browser
                    </h1>
                    <p className="text-muted-foreground">Verwalten und exportieren Sie vergangene Datenstände des Systems.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Archivierte Zeiträume</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Suche..."
                                    className="pl-8 w-[250px] h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                            <p className="mt-2 text-sm text-muted-foreground italic">Lade Archive...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[180px]">Schuljahr</TableHead>
                                    <TableHead className="w-[180px]">Status / Datum</TableHead>
                                    <TableHead>Notiz</TableHead>
                                    <TableHead className="text-center">Records</TableHead>
                                    <TableHead className="text-right">Aktion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRuns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                            Keine Archivläufe gefunden.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRuns.map((run) => (
                                        <TableRow key={run.id} className="group hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                                        {run.school_year_from}
                                                    </Badge>
                                                    <span className="text-muted-foreground">→</span>
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {run.school_year_to}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge
                                                        variant={run.status === 'done' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'}
                                                        className="text-[9px] uppercase tracking-tighter"
                                                    >
                                                        {run.status === 'done' ? 'Abgeschlossen' : run.status === 'failed' ? 'Fehlgeschlagen' : 'Laufend'}
                                                    </Badge>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs italic text-muted-foreground line-clamp-2 max-w-[300px]">
                                                    {run.note || 'Keine Notiz vorhanden.'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {(() => {
                                                        const c = parseJson(run.counts);
                                                        const total = Object.values(c).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
                                                        return total > 0 ? (
                                                            <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-bold">
                                                                {total} Records
                                                            </Badge>
                                                        ) : '-';
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    disabled={isExporting || run.status !== 'done'}
                                                    onClick={() => handleExport(run)}
                                                    title="Als JSON exportieren"
                                                >
                                                    <FileJson className="h-4 w-4 text-primary" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="bg-muted/30 border-2 border-dashed rounded-lg p-6 flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-bold">Wie funktioniert das Archiv?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Das Archiv speichert Snapshots aller Objekte zum Zeitpunkt des Archivlaufs.
                        Über den <strong>Export-Button</strong> laden Sie ein JSON-Paket herunter, das alle Rohdaten enthält.
                        Inhaltliche Änderungen im System beeinflussen bereits erstellte Archiv-Snapshots nicht.
                    </p>
                </div>
            </div>
        </div>
    )
}
