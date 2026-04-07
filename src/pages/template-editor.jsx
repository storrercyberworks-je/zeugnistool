import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { CertificateLayout } from '@/components/certificate-layout'

// Dummy Data for Preview
const PREVIEW_STUDENT = {
    first_name: 'Max',
    last_name: 'Mustermann',
    class_name: 'IET-24',
    birth_date: '15.08.2005',
    semester: '1. Halbjahr',
    school_year: '2024/2025'
};

const PREVIEW_GRADES = [
    { subject_id: '1', subject_name: 'Berufskenntnisse', grade_value: 5.5, weight: 100 },
    { subject_id: '2', subject_name: 'Mathematik', grade_value: 4.5, weight: 100 },
    { subject_id: '3', subject_name: 'Englisch', grade_value: 5.0, weight: 100 },
    { subject_id: '4', subject_name: 'ABU / Sprache und Kommunikation', grade_value: 4.5, weight: 100 },
    { subject_id: '5', subject_name: 'ABU / Gesellschaft', grade_value: 5.0, weight: 100 },
];

const PREVIEW_SUBJECTS = [
    { id: '1', name: 'Berufskenntnisse', category: 'fachmodul' },
    { id: '2', name: 'Mathematik', category: 'fachmodul' },
    { id: '3', name: 'Englisch', category: 'fachmodul' },
    { id: '4', name: 'ABU / Sprache und Kommunikation', category: 'allgemeinbildung' },
    { id: '5', name: 'ABU / Gesellschaft', category: 'allgemeinbildung' },
];

export default function TemplateEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: profile } = useQuery({
        queryKey: [STORAGE_KEYS.SCHOOL_PROFILE],
        queryFn: () => MockApi.getSchoolProfile()
    })

    const { data: template, isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.TEMPLATES, id],
        queryFn: () => MockApi.get(STORAGE_KEYS.TEMPLATES, id)
    })

    const [formState, setFormState] = useState(null)

    useEffect(() => {
        if (template) {
            setFormState(template)
        }
    }, [template])

    const updateMutation = useMutation({
        mutationFn: (data) => MockApi.update(STORAGE_KEYS.TEMPLATES, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            toast({ title: 'Erfolg', description: 'Vorlage gespeichert.' })
        }
    })

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormState(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSwitch = (name, checked) => {
        setFormState(prev => ({
            ...prev,
            [name]: checked
        }))
    }

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Bild max 2MB groß.' })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setFormState(prev => ({ ...prev, [fieldName]: reader.result }))
        }
        reader.readAsDataURL(file)
    }

    const handleSave = () => {
        updateMutation.mutate(formState)
    }

    if (isLoading || !formState) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>
    }

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-muted/40 -m-6">
            
            {/* Sidebar Configuration */}
            <div className="w-[450px] bg-background border-r flex flex-col h-full z-10 shrink-0 shadow-sm">
                <div className="p-4 border-b flex items-center justify-between bg-card text-card-foreground">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/certificate-templates')}><ArrowLeft className="w-5 h-5" /></Button>
                        <h2 className="font-bold truncate max-w-[200px]">{formState.name}</h2>
                    </div>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isLoading}>
                        {updateMutation.isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Speichern
                    </Button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-10">
                    
                    <section className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2">Texte & Allgemein</h3>
                        <div className="space-y-2">
                            <Label>Zeugnis-Titel</Label>
                            <Input name="title" value={formState.title || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Untertitel (z.B. 1. Halbjahr)</Label>
                            <Input name="subtitle" value={formState.subtitle || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Introtext (Optional)</Label>
                            <Textarea name="intro_text" value={formState.intro_text || ''} onChange={handleChange} placeholder="Der Schüler hat..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Footer (Standard-Zusatz)</Label>
                            <Input name="footer_text" value={formState.footer_text || ''} onChange={handleChange} placeholder="Gültig ohne Unterschrift etc." />
                        </div>
                        <div className="space-y-2">
                            <Label>Rundung Schnitt</Label>
                            <select name="rounding" value={formState.rounding || '0.1'} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="0.1">0.1 (z.B. 4.6)</option>
                                <option value="0.5">0.5 (Ganze/Halbe Noten)</option>
                                <option value="0.01">0.01 (z.B. 4.58)</option>
                            </select>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2">Darstellung / Optionen</h3>
                        <div className="flex items-center justify-between border p-3 rounded-lg bg-card">
                            <div>
                                <Label className="text-base">Schul-Logo anzeigen</Label>
                                <p className="text-xs text-muted-foreground">Logo oben rechts einblenden</p>
                            </div>
                            <Switch checked={formState.show_logo} onCheckedChange={(c) => handleSwitch('show_logo', c)} />
                        </div>
                        {formState.show_logo && (
                            <div className="space-y-2">
                                <Label>Eigenes Logo hochladen hochladen (Überschreibt Schul-Profil)</Label>
                                <div className="flex items-center gap-4">
                                    {formState.logo_url && <img src={formState.logo_url} className="h-10 object-contain border bg-white p-1" />}
                                    <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleFileChange(e, 'logo_url')} />
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between border p-3 rounded-lg bg-card mt-2">
                            <div>
                                <Label className="text-base">Gewichtungen einblenden</Label>
                                <p className="text-xs text-muted-foreground">Spalte für Gewichtungen in der Tabelle anzeigen</p>
                            </div>
                            <Switch checked={formState.show_weights} onCheckedChange={(c) => handleSwitch('show_weights', c)} />
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h3 className="font-bold text-lg border-b pb-2">Signaturen</h3>
                        
                        <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-4">
                            <div className="flex justify-between items-center mb-2 border-b border-primary/10 pb-2">
                                <Label className="font-bold text-base">Erste Unterschrift (Links)</Label>
                                <Switch checked={formState.show_signature_1} onCheckedChange={(c) => handleSwitch('show_signature_1', c)} />
                            </div>
                            {formState.show_signature_1 && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input name="signature_1_name" value={formState.signature_1_name || ''} onChange={handleChange} placeholder="Klassenlehrer/in" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Rolle / Titel</Label>
                                        <Input name="signature_1_title" value={formState.signature_1_title || ''} onChange={handleChange} placeholder="Unterschrift" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Digitale Signatur (Bild)</Label>
                                        <div className="flex items-center gap-4">
                                            {formState.signature_1_url ? <img src={formState.signature_1_url} className="h-10 border bg-white" /> : <div className="h-10 w-20 border border-dashed flex items-center justify-center bg-background"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
                                            <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'signature_1_url')} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-4">
                            <div className="flex justify-between items-center mb-2 border-b border-primary/10 pb-2">
                                <Label className="font-bold text-base">Zweite Unterschrift (Rechts)</Label>
                                <Switch checked={formState.show_signature_2} onCheckedChange={(c) => handleSwitch('show_signature_2', c)} />
                            </div>
                            {formState.show_signature_2 && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input name="signature_2_name" value={formState.signature_2_name || ''} onChange={handleChange} placeholder="Schulleitung" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Rolle / Titel</Label>
                                        <Input name="signature_2_title" value={formState.signature_2_title || ''} onChange={handleChange} placeholder="Unterschrift" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Digitale Signatur (Bild)</Label>
                                        <div className="flex items-center gap-4">
                                            {formState.signature_2_url ? <img src={formState.signature_2_url} className="h-10 border bg-white" /> : <div className="h-10 w-20 border border-dashed flex items-center justify-center bg-background"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
                                            <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'signature_2_url')} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Live Preview Pane */}
            <div className="flex-[2] bg-[#f0f0f0] overflow-y-auto p-[50px] flex justify-center items-start shadow-inner">
                <div className="transition-all transform origin-top lg:scale-100 xl:scale-100 scale-75 shadow-2xl">
                    <CertificateLayout
                        student={PREVIEW_STUDENT}
                        grades={PREVIEW_GRADES}
                        subjects={PREVIEW_SUBJECTS}
                        template={formState}
                        schoolProfile={profile}
                    />
                </div>
            </div>

        </div>
    )
}
