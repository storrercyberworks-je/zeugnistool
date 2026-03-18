import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { Plus, Search, FileText, Download, User, Trash2, Loader2, Eye, Printer, Filter, CheckCircle2, FileArchive, X } from 'lucide-react'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { calculateAverages, getPredicate } from '@/lib/grading-utils'
import { evaluateReexamination, evaluatePromotion } from '@/lib/reexamination'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { buildCertificateModel, renderCertificateHTML } from '@/lib/certificate-renderer'

export default function CertificatesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [viewingCert, setViewingCert] = useState(null)
    const [selectedStudent, setSelectedStudent] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [selectedClass, setSelectedClass] = useState('all')
    const [previewHtml, setPreviewHtml] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [batchProgress, setBatchProgress] = useState(null)
    const exportFrameRef = useRef(null)

    const { data: certificates = [], isLoading: loadingCerts } = useQuery({
        queryKey: [STORAGE_KEYS.CERTIFICATES],
        queryFn: () => MockApi.list(STORAGE_KEYS.CERTIFICATES),
    })

    const { data: classes = [] } = useQuery({
        queryKey: [STORAGE_KEYS.CLASSES],
        queryFn: () => MockApi.list(STORAGE_KEYS.CLASSES),
    })

    const { data: students = [] } = useQuery({
        queryKey: [STORAGE_KEYS.STUDENTS],
        queryFn: () => MockApi.list(STORAGE_KEYS.STUDENTS),
    })

    const { data: templates = [] } = useQuery({
        queryKey: [STORAGE_KEYS.TEMPLATES],
        queryFn: async () => {
            const list = await MockApi.list(STORAGE_KEYS.TEMPLATES);
            return list.map(t => ({
                ...t,
                layout_config: typeof t.layout_config === 'string' ? JSON.parse(t.layout_config) : (t.layout_config || {}),
                blocks: typeof t.blocks === 'string' ? JSON.parse(t.blocks) : (t.blocks || [])
            }));
        },
    })

    const { data: grades = [] } = useQuery({
        queryKey: [STORAGE_KEYS.GRADES],
        queryFn: () => MockApi.list(STORAGE_KEYS.GRADES),
    })

    const { data: subjects = [] } = useQuery({
        queryKey: [STORAGE_KEYS.SUBJECTS],
        queryFn: () => MockApi.list(STORAGE_KEYS.SUBJECTS),
    })

    const createMutation = useMutation({
        mutationFn: (data) => MockApi.create(STORAGE_KEYS.CERTIFICATES, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.CERTIFICATES])
            toast({ title: 'Erfolg', description: 'Zeugnis wurde gespeichert.' })
            setIsDialogOpen(false)
            setPreviewHtml('')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => MockApi.delete(STORAGE_KEYS.CERTIFICATES, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.CERTIFICATES])
            toast({ title: 'Erfolg', description: 'Eintrag gelöscht.' })
        },
    })

    const generateHtmlForStudent = (studentId, templateId) => {
        const student = students.find(s => s.id === studentId)
        const template = templates.find(t => t.id === templateId)
        if (!student || !template) return null

        const semester = '1. Halbjahr'
        const school_year = '2024/2025'

        // Central Model generation
        const model = buildCertificateModel(student, grades, subjects, semester, school_year, template)

        // Central HTML generation (no mustache tokens left)
        const html = renderCertificateHTML(template, model)

        return {
            html,
            data: {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                class_id: student.class_id,
                class_name: student.class_name,
                semester,
                school_year,
                issue_date: new Date().toISOString(),
                average_grade: model.summary.average,
                grades_count: model.fachmoduleRows.length + model.allgemeinbildungRows.length,
                status: 'generiert',
                notes: html,
                verification_code: Math.random().toString(36).substring(2, 10).toUpperCase()
            }
        }
    }

    const handlePreview = () => {
        const result = generateHtmlForStudent(selectedStudent, selectedTemplate)
        if (result?.error) {
            toast({ variant: 'destructive', title: 'Fehler', description: result.error })
            return
        }
        setPreviewHtml(result.html)
    }

    const handleSave = () => {
        const result = generateHtmlForStudent(selectedStudent, selectedTemplate)
        if (result?.data) {
            createMutation.mutate(result.data)
        }
    }

    const exportToPdf = async (cert, silent = false) => {
        const iframe = exportFrameRef.current
        if (!iframe) return

        return new Promise((resolve) => {
            iframe.srcdoc = `
                <html>
                    <head>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { margin: 0; padding: 0; width: 210mm; min-height: 297mm; }
                            @page { size: A4; margin: 0; }
                        </style>
                    </head>
                    <body>${cert.notes}</body>
                </html>
            `;

            iframe.onload = async () => {
                // Wait for styles and images
                await new Promise(r => setTimeout(r, 1000));

                const canvas = await html2canvas(iframe.contentDocument.body, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new jsPDF('p', 'mm', 'a4');
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

                if (silent) {
                    resolve(pdf.output('blob'));
                } else {
                    pdf.save(`Zeugnis_${cert.student_name.replace(/\s/g, '_')}.pdf`);
                    resolve();
                }
            };
        });
    }

    const handleBatchExport = async () => {
        if (certificates.length === 0) return;
        setIsGenerating(true);
        const zip = new JSZip();

        for (let i = 0; i < certificates.length; i++) {
            const cert = certificates[i];
            setBatchProgress({ current: i + 1, total: certificates.length, name: cert.student_name });
            const pdfBlob = await exportToPdf(cert, true);
            zip.file(`Zeugnis_${cert.student_name.replace(/\s/g, '_')}.pdf`, pdfBlob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Zeugnisse_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();

        setIsGenerating(false);
        setBatchProgress(null);
        toast({ title: 'Erfolg', description: 'Batch-Export abgeschlossen.' });
    }

    return (
        <div className="space-y-6">
            <iframe ref={exportFrameRef} className="hidden" title="export-frame" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Zeugnisse</h1>
                    <p className="text-muted-foreground">HTML-basierte Generierung & Archivierung.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Einzelzeugnis
                    </Button>
                    <Button onClick={handleBatchExport} disabled={isGenerating || certificates.length === 0}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                        Batch Export (ZIP)
                    </Button>
                </div>
            </div>

            {batchProgress && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">Exportiere {batchProgress.name}...</span>
                        </div>
                        <Badge variant="secondary">{batchProgress.current} / {batchProgress.total}</Badge>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Archiv</CardTitle>
                    <CardDescription>Gespeicherte HTML-Zeugnisse.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingCerts ? (
                        <Skeleton className="h-40 w-full" />
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Schüler</TableHead>
                                        <TableHead>Klasse</TableHead>
                                        <TableHead>Schnitt</TableHead>
                                        <TableHead>Datum</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {certificates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">Keine Einträge.</TableCell>
                                        </TableRow>
                                    ) : (
                                        certificates.map((cert) => (
                                            <TableRow key={cert.id}>
                                                <TableCell className="font-semibold">{cert.student_name}</TableCell>
                                                <TableCell>{cert.class_name}</TableCell>
                                                <TableCell><Badge variant="outline">{cert.average_grade?.toFixed(2)}</Badge></TableCell>
                                                <TableCell className="text-xs">{new Date(cert.issue_date).toLocaleDateString('de-DE')}</TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setViewingCert(cert)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => exportToPdf(cert)}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(cert.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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

            {/* View Dialog */}
            <Dialog open={!!viewingCert} onOpenChange={() => setViewingCert(null)}>
                <DialogContent className="max-w-[900px] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>{viewingCert?.student_name}</DialogTitle>
                                <DialogDescription>{viewingCert?.semester} {viewingCert?.school_year}</DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                    const w = window.open();
                                    w.document.write(viewingCert.notes);
                                    w.print();
                                }}>
                                    <Printer className="h-4 w-4 mr-2" /> Drucken
                                </Button>
                                <Button size="sm" onClick={() => exportToPdf(viewingCert)}>
                                    <Download className="h-4 w-4 mr-2" /> PDF
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-8 bg-gray-100 border-t mt-4">
                        <div
                            className="bg-white p-12 shadow-xl mx-auto w-[210mm] min-h-[297mm] max-w-none shadow-inner"
                            dangerouslySetInnerHTML={{ __html: viewingCert?.notes }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Generate Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Zeugnis generieren</DialogTitle>
                        <DialogDescription>Template-basierte HTML Erstellung.</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex p-6 gap-6">
                        <div className="w-1/3 space-y-4 overflow-auto pr-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Klasse</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="all">Alle</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schüler</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                >
                                    <option value="">Wählen...</option>
                                    {students.filter(s => selectedClass === 'all' || s.class_id === selectedClass).map(s => (
                                        <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vorlage</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                >
                                    <option value="">Wählen...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <Button className="w-full h-10" onClick={handlePreview} disabled={!selectedStudent || !selectedTemplate}>
                                <Eye className="mr-2 h-4 w-4" /> Vorschau laden
                            </Button>

                            {previewHtml && (
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 animate-in slide-in-from-left-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-5 w-5 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                                            <CheckCircle2 className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm font-bold text-primary">Generierung bereit</span>
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={createMutation.isLoading}>
                                        {createMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalisieren & Archivieren'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-gray-100 border rounded-lg overflow-auto p-6 flex flex-col">
                            {previewHtml ? (
                                <div
                                    className="bg-white p-12 shadow-2xl mx-auto w-[210mm] min-h-[297mm] max-w-none"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col opacity-30">
                                    <FileText className="h-16 w-16 mb-4" />
                                    <p>Wählen Sie Daten aus der linken Spalte</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
