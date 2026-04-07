import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { Plus, PenTool, Trash2, Layout, FileText } from 'lucide-react'
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

export default function TemplatesPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)

    const { data: templates = [], isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.TEMPLATES],
        queryFn: () => MockApi.list(STORAGE_KEYS.TEMPLATES),
    })

    const createMutation = useMutation({
        mutationFn: (data) => MockApi.create(STORAGE_KEYS.TEMPLATES, {
            ...data,
            is_active: true,
            template_version: 2
        }),
        onSuccess: (newTemplate) => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            setIsDialogOpen(false)
            toast({ title: 'Erfolg', description: 'Vorlage erstellt.' })
            // Jump straight to editor
            if(newTemplate && newTemplate.id) {
                navigate(`/template-editor/${newTemplate.id}`)
            }
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
            // Update handled inside template-editor now, so here we ignore or redirect
            navigate(`/template-editor/${editingTemplate.id}`)
        } else {
            createMutation.mutate(data)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Zeugnis-Vorlagen</h1>
                    <p className="text-muted-foreground">Verwalten und konfigurieren Sie das standardisierte Zeugnis-Layout.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setEditingTemplate(null)}>
                                <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Neue Vorlage erstellen</DialogTitle>
                                    <DialogDescription>Basis-Konfiguration für die Zeugnisvorlage.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Name der Vorlage</label>
                                        <Input name="name" placeholder="z.B. BMS Semesterzeugnis" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Beschreibung</label>
                                        <Input name="description" placeholder="Kurze Info zur Verwendung" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Titel auf dem Zeugnis</label>
                                        <Input name="title" defaultValue="Semesterzeugnis" required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                                    <Button type="submit">Basis Erstellen & Konfigurieren</Button>
                                </DialogFooter>
                            </form>
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
                    <Card key={tpl.id} className="group overflow-hidden flex flex-col">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-start">
                                <Badge variant={tpl.is_active ? 'success' : 'outline'}>{tpl.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(tpl.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="mt-2">{tpl.name}</CardTitle>
                            <CardDescription>{tpl.description || 'Keine Beschreibung'}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 text-sm space-y-2 flex-grow">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Titel:</span>
                                <span className="font-medium text-right max-w-[150px] truncate">{tpl.title || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Logo:</span>
                                <span className="font-medium">{tpl.show_logo ? 'Ja' : 'Nein'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Rundung:</span>
                                <Badge variant="secondary" className="text-[10px]">{tpl.rounding || '0.1'}</Badge>
                            </div>
                        </CardContent>
                        <Separator />
                        <CardFooter className="bg-muted/10 p-0">
                            <Button variant="ghost" className="w-full rounded-none h-14" onClick={() => navigate(`/template-editor/${tpl.id}`)}>
                                <PenTool className="mr-2 h-4 w-4" /> Konfiguration öffnen
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
