import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { Plus, PenTool, Trash2, CheckCircle2, Copy, Eye, Layout, ChevronLeft, FileText, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { MappingWizard } from '@/components/mapping-wizard'

const DEFAULT_CONFIG = {
    show_logo: true,
    header_style: 'classic',
    show_qr: false,
    grading_scheme: '1-6',
    rounding: '0.1',
    show_weights: true,
    show_comments: true,
    sections: ['student_block', 'grades_table', 'summary_block', 'signatures']
}

export default function TemplatesPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [wizardType, setWizardType] = useState(null) // 'docx', 'pdf_form'

    const { data: templates = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.TEMPLATES],
        queryFn: async () => {
            const list = await MockApi.list(STORAGE_KEYS.TEMPLATES);
            return list.map(tpl => ({
                ...tpl,
                layout_config: typeof tpl.layout_config === 'string' ? JSON.parse(tpl.layout_config) : tpl.layout_config
            }));
        },
    })

    const createMutation = useMutation({
        mutationFn: (data) => MockApi.create(STORAGE_KEYS.TEMPLATES, {
            ...data,
            layout_config: JSON.stringify(DEFAULT_CONFIG),
            template_version: 1,
            is_active: true,
            template_type: 'builder'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Vorlage erstellt.' })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => {
            const payload = { ...data };
            if (payload.layout_config && typeof payload.layout_config !== 'string') {
                payload.layout_config = JSON.stringify(payload.layout_config);
            }
            return MockApi.update(STORAGE_KEYS.TEMPLATES, id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Vorlage aktualisiert.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => MockApi.delete(STORAGE_KEYS.TEMPLATES, id),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            toast({ title: 'Erfolg', description: 'Vorlage gelöscht.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    if (wizardType) {
        return (
            <div className="py-6">
                <Button variant="ghost" onClick={() => setWizardType(null)} className="mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Zurück zur Übersicht
                </Button>
                <MappingWizard
                    type={wizardType}
                    onComplete={() => setWizardType(null)}
                    onCancel={() => setWizardType(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Zeugnis-Vorlagen</h1>
                    <p className="text-muted-foreground">Verwalten und konfigurieren Sie verschiedene Zeugnis-Layouts.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" asChild>
                        <a href="http://localhost:3001/api/templates/certificate-docx">
                            <Download className="mr-2 h-4 w-4" /> Word-Vorlage (DOCX)
                        </a>
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Vorlage erstellen</DialogTitle>
                                <DialogDescription>Wählen Sie die Art der Vorlage aus.</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 gap-4 py-4">
                                <Button variant="outline" className="h-20 justify-start px-6 gap-4" onClick={() => navigate('/template-editor/new')}>
                                    <div className="p-2 bg-primary/10 rounded-full"><Layout className="h-5 w-5 text-primary" /></div>
                                    <div className="text-left">
                                        <div className="font-bold">Builder (Empfohlen)</div>
                                        <div className="text-xs text-muted-foreground">Modernes Layout per UI konfigurieren</div>
                                    </div>
                                </Button>
                                <Button variant="outline" className="h-20 justify-start px-6 gap-4" onClick={() => setWizardType('docx')}>
                                    <div className="p-2 bg-blue-500/10 rounded-full"><FileText className="h-5 w-5 text-blue-500" /></div>
                                    <div className="text-left">
                                        <div className="font-bold">Word (DOCX) Upload</div>
                                        <div className="text-xs text-muted-foreground">Eigene Word-Datei mit Platzhaltern nutzen</div>
                                    </div>
                                </Button>
                                <Button variant="outline" className="h-20 justify-start px-6 gap-4" onClick={() => setWizardType('pdf_form')}>
                                    <div className="p-2 bg-red-500/10 rounded-full"><RefreshCw className="h-5 w-5 text-red-500" /></div>
                                    <div className="text-left">
                                        <div className="font-bold">PDF Formular</div>
                                        <div className="text-xs text-muted-foreground">Interaktives PDF mappen</div>
                                    </div>
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.length === 0 && !isLoading && (
                    <Card className="md:col-span-3 py-10 flex flex-col items-center justify-center text-center border-dashed">
                        <Layout className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Keine Vorlagen vorhanden. Erstellen Sie Ihre erste Vorlage.</p>
                    </Card>
                )}

                {templates.map((tpl) => (
                    <Card key={tpl.id} className="group overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-start">
                                <Badge variant={tpl.is_active ? 'success' : 'outline'}>{tpl.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTemplate(tpl); setIsDialogOpen(true); }}>
                                        <PenTool className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(tpl.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="mt-2">{tpl.name}</CardTitle>
                            <CardDescription>{tpl.description || 'Keine Beschreibung'}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Typ:</span>
                                <Badge variant="secondary" className="uppercase text-[10px]">{tpl.template_type || 'builder'}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Sprache:</span>
                                <span className="font-medium uppercase">{tpl.language || 'de'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version:</span>
                                <Badge variant="secondary" className="text-[10px]">v{tpl.template_version}</Badge>
                            </div>
                            <Separator />
                        </CardContent>
                        <CardFooter className="bg-muted/10 pt-4 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                                <Eye className="mr-2 h-4 w-4" /> Vorschau
                            </Button>
                            <Button size="sm" className="flex-1" onClick={() => navigate(tpl.template_type === 'builder' || !tpl.template_type ? `/template-editor/${tpl.id}` : `/template-editor/${tpl.id}`)}>
                                <PenTool className="mr-2 h-4 w-4" /> Editor
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</DialogTitle>
                            <DialogDescription>Basis-Konfiguration für die Zeugnisvorlage.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name der Vorlage</label>
                                <Input name="name" defaultValue={editingTemplate?.name} placeholder="z.B. Standard 2024" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Beschreibung</label>
                                <Input name="description" defaultValue={editingTemplate?.description} placeholder="Kurze Info zur Verwendung" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sprache</label>
                                <select
                                    name="language"
                                    defaultValue={editingTemplate?.language || 'de'}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                >
                                    <option value="de">Deutsch</option>
                                    <option value="en">Englisch</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit">Erstellen</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
