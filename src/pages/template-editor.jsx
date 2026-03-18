import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import {
    ChevronLeft,
    Save,
    Eye,
    Code,
    Settings,
    Layout,
    Type,
    Image as ImageIcon,
    Table as TableIcon,
    Signature as SignatureIcon,
    GripVertical,
    MoveUp,
    MoveDown,
    Trash2,
    Plus,
    Search,
    BadgeAlert,
    CheckCircle2,
    Undo2,
    FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PlaceholderPopover } from '@/components/placeholder-popover'
import { TableEditor } from '@/components/table-editor'
import { buildCertificateModel, renderCertificateHTML } from '@/lib/certificate-renderer'

const SECTIONS = {
    HEADER: 'header',
    TITLE: 'title',
    STUDENT: 'student',
    TABLE_F: 'table_f', // Fachmodule
    TABLE_A: 'table_a', // Allgemeinbildung
    SUMMARY: 'summary',
    SIGNATURES: 'signatures',
    FOOTER: 'footer'
};

const DEFAULT_LAYOUT = [
    { id: 'sec-header', type: SECTIONS.HEADER, active: true },
    { id: 'sec-title', type: SECTIONS.TITLE, active: true },
    { id: 'sec-student', type: SECTIONS.STUDENT, active: true },
    { id: 'sec-table-f', type: SECTIONS.TABLE_F, active: true },
    { id: 'sec-table-a', type: SECTIONS.TABLE_A, active: true },
    { id: 'sec-summary', type: SECTIONS.SUMMARY, active: true },
    { id: 'sec-signatures', type: SECTIONS.SIGNATURES, active: true },
    { id: 'sec-footer', type: SECTIONS.FOOTER, active: true }
];

export default function CertificateBuilderPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const isNew = id === 'new'
    const fileInputRef = useRef(null)
    const [uploadTarget, setUploadTarget] = useState(null)
    const [activeTab, setActiveTab] = useState('layout')
    const [showAdvanced, setShowAdvanced] = useState(false)

    // Data Fetching
    const { data: template, isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.TEMPLATES, id],
        queryFn: async () => {
            if (isNew) return {
                name: 'Neues Zeugnis',
                template_type: 'builder',
                layout_config: { sections: DEFAULT_LAYOUT, table_f: { columns: { module: true, grade: true, predicate: true }, zebra: true }, table_a: { columns: { module: true, grade: true, predicate: true }, zebra: true } },
                content_config: { header_text: 'GIBB Gewerblich-Industrielle Berufsschule Bern', title_text: 'Semesterzeugnis', footer_text: 'Rechtshinweis: Gegen dieses Zeugnis kann innert 30 Tagen...' },
                assets_config: { signatures: [{ name: 'R. Maurer', title: 'Abteilungsleiter' }, { name: 'M. Aeby', title: 'Prüfungsleiter' }] },
                is_active: true
            };
            const t = await MockApi.get(STORAGE_KEYS.TEMPLATES, id);
            return {
                ...t,
                layout_config: typeof t.layout_config === 'string' ? JSON.parse(t.layout_config) : (t.layout_config || { sections: DEFAULT_LAYOUT }),
                content_config: typeof t.content_config === 'string' ? JSON.parse(t.content_config) : (t.content_config || {}),
                assets_config: typeof t.assets_config === 'string' ? JSON.parse(t.assets_config) : (t.assets_config || {})
            };
        },
    })

    const [localTemplate, setLocalTemplate] = useState(null)

    useEffect(() => {
        if (template) setLocalTemplate(template)
    }, [template])

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (data) => {
            const payload = {
                ...data,
                // Do not generate HTML cache for builder template, renderer uses config
                layout_config: JSON.stringify(data.layout_config),
                content_config: JSON.stringify(data.content_config),
                assets_config: JSON.stringify(data.assets_config),
                template_version: (data.template_version || 0) + 1
            };
            return isNew
                ? MockApi.create(STORAGE_KEYS.TEMPLATES, payload)
                : MockApi.update(STORAGE_KEYS.TEMPLATES, id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES])
            toast({ title: 'Erfolg', description: 'Vorlage wurde gespeichert.' })
            navigate('/certificate-templates')
        }
    })

    const previewHtml = useMemo(() => {
        if (!localTemplate) return '';
        const dummyModel = buildCertificateModel(null, [], [], null, null, localTemplate);
        return renderCertificateHTML(localTemplate, dummyModel);
    }, [localTemplate]);

    // Handlers
    const moveSection = (index, dir) => {
        const sections = [...localTemplate.layout_config.sections];
        const target = index + dir;
        if (target < 0 || target >= sections.length) return;
        [sections[index], sections[target]] = [sections[target], sections[index]];
        setLocalTemplate({
            ...localTemplate,
            layout_config: { ...localTemplate.layout_config, sections }
        });
    };

    const toggleSection = (id) => {
        const sections = localTemplate.layout_config.sections.map(s =>
            s.id === id ? { ...s, active: !s.active } : s
        );
        setLocalTemplate({
            ...localTemplate,
            layout_config: { ...localTemplate.layout_config, sections }
        });
    };

    const triggerUpload = (target) => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadTarget) return;
        // Mock upload or real upload
        const response = await MockApi.uploadFile(file);
        if (uploadTarget === 'logo') {
            setLocalTemplate({
                ...localTemplate,
                assets_config: { ...localTemplate.assets_config, logo_url: response.file_url }
            });
        } else if (uploadTarget.startsWith('sig')) {
            const idx = parseInt(uploadTarget.split('_')[1]);
            setLocalTemplate({
                ...localTemplate,
                assets_config: { ...localTemplate.assets_config, [`signature_${idx}_url`]: response.file_url }
            });
        }
    };

    if (isLoading || !localTemplate) return <div className="p-8">Laden...</div>

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/certificate-templates')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <Input
                            value={localTemplate.name}
                            onChange={(e) => setLocalTemplate({ ...localTemplate, name: e.target.value })}
                            className="text-2xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                        />
                        <p className="text-xs text-muted-foreground">Editor: 3-Tab guided system</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
                        <Code className="mr-2 h-4 w-4" /> {showAdvanced ? 'Hide Code' : 'Advanced'}
                    </Button>
                    <Button onClick={() => saveMutation.mutate(localTemplate)} disabled={saveMutation.isLoading}>
                        <Save className="mr-2 h-4 w-4" /> {saveMutation.isLoading ? 'Speichere...' : 'Speichern'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Editor Side */}
                <Card className="flex flex-col overflow-hidden border-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                        <TabsList className="grid w-full grid-cols-3 rounded-none border-b h-12 bg-muted/20">
                            <TabsTrigger value="layout" className="data-[state=active]:bg-background">1. Layout</TabsTrigger>
                            <TabsTrigger value="content" className="data-[state=active]:bg-background">2. Inhalte</TabsTrigger>
                            <TabsTrigger value="assets" className="data-[state=active]:bg-background">3. Assets</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-auto bg-card">
                            <TabsContent value="layout" className="p-4 m-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full"><FileText className="h-4 w-4 text-primary" /></div>
                                            <div>
                                                <div className="text-sm font-bold">A4 Hochformat</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Format-Einstellung</div>
                                            </div>
                                        </div>
                                        <Switch checked disabled />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Sektions-Reihenfolge</Label>
                                        <div className="space-y-2">
                                            {localTemplate.layout_config.sections.map((sec, idx) => (
                                                <div key={sec.id} className={`flex items-center justify-between p-3 rounded-lg border ${sec.active ? 'bg-card' : 'bg-muted/30 opacity-60'} transition-all`}>
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                                                        <div className="space-y-0.5">
                                                            <div className="text-sm font-medium capitalize">{sec.type.replace('_', ' ')}</div>
                                                            <Badge variant="outline" className="text-[9px] uppercase">{sec.id}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, -1)} disabled={idx === 0}><MoveUp className="h-3 w-3" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, 1)} disabled={idx === localTemplate.layout_config.sections.length - 1}><MoveDown className="h-3 w-3" /></Button>
                                                        <Separator orientation="vertical" className="h-4 mx-1" />
                                                        <Switch checked={sec.active} onCheckedChange={() => toggleSection(sec.id)} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <TableEditor
                                        title="Fachmodule (Table F)"
                                        config={localTemplate.layout_config.table_f || {}}
                                        onChange={(val) => setLocalTemplate({ ...localTemplate, layout_config: { ...localTemplate.layout_config, table_f: val } })}
                                    />
                                    <Separator />
                                    <TableEditor
                                        title="Allgemeinbildung (Table A)"
                                        config={localTemplate.layout_config.table_a || {}}
                                        onChange={(val) => setLocalTemplate({ ...localTemplate, layout_config: { ...localTemplate.layout_config, table_a: val } })}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="content" className="p-4 m-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-bold">Header Text</Label>
                                            <PlaceholderPopover onSelect={(v) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, header_text: (localTemplate.content_config.header_text || '') + v } })} />
                                        </div>
                                        <Input
                                            value={localTemplate.content_config.header_text}
                                            onChange={(e) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, header_text: e.target.value } })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-bold">Titel</Label>
                                            <PlaceholderPopover onSelect={(v) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, title_text: (localTemplate.content_config.title_text || '') + v } })} />
                                        </div>
                                        <Input
                                            value={localTemplate.content_config.title_text}
                                            onChange={(e) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, title_text: e.target.value } })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-bold">Fusszeile (Footer)</Label>
                                            <PlaceholderPopover onSelect={(v) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, footer_text: (localTemplate.content_config.footer_text || '') + v } })} />
                                        </div>
                                        <Textarea
                                            className="min-h-[100px] text-xs"
                                            value={localTemplate.content_config.footer_text}
                                            onChange={(e) => setLocalTemplate({ ...localTemplate, content_config: { ...localTemplate.content_config, footer_text: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="assets" className="p-4 m-0 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Schullogo</Label>
                                        <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
                                            <div className="h-16 w-24 border-2 border-dashed rounded flex flex-col items-center justify-center bg-muted/20 overflow-hidden">
                                                {localTemplate.assets_config.logo_url ? (
                                                    <img src={localTemplate.assets_config.logo_url} className="h-full w-full object-contain" />
                                                ) : (
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="text-sm font-medium">Logo hochladen</div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => triggerUpload('logo')}>Wählen</Button>
                                                    {localTemplate.assets_config.logo_url && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setLocalTemplate({ ...localTemplate, assets_config: { ...localTemplate.assets_config, logo_url: null } })}>Löschen</Button>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unterschriften</Label>
                                        {[1, 2].map((num, i) => (
                                            <div key={num} className="p-4 border rounded-xl bg-card space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-20 border-2 border-dashed rounded flex items-center justify-center bg-muted/20 overflow-hidden">
                                                        {localTemplate.assets_config[`signature_${num}_url`] ? (
                                                            <img src={localTemplate.assets_config[`signature_${num}_url`]} className="h-full w-full object-contain" />
                                                        ) : (
                                                            <SignatureIcon className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <Button size="xs" variant="outline" onClick={() => triggerUpload(`sig_${num}`)}>Upload</Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Name</Label>
                                                        <Input
                                                            className="h-8 text-xs"
                                                            value={localTemplate.assets_config.signatures?.[i]?.name || ''}
                                                            onChange={(e) => {
                                                                const sigs = [...(localTemplate.assets_config.signatures || [])];
                                                                sigs[i] = { ...sigs[i], name: e.target.value };
                                                                setLocalTemplate({ ...localTemplate, assets_config: { ...localTemplate.assets_config, signatures: sigs } });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Titel</Label>
                                                        <Input
                                                            className="h-8 text-xs"
                                                            value={localTemplate.assets_config.signatures?.[i]?.title || ''}
                                                            onChange={(e) => {
                                                                const sigs = [...(localTemplate.assets_config.signatures || [])];
                                                                sigs[i] = { ...sigs[i], title: e.target.value };
                                                                setLocalTemplate({ ...localTemplate, assets_config: { ...localTemplate.assets_config, signatures: sigs } });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>

                {/* Preview Side */}
                <Card className="flex flex-col overflow-hidden bg-gray-200 shadow-inner border-2">
                    <CardHeader className="py-2 px-4 border-b bg-white flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase">Live Vorschau (Demodaten)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">210 x 297 mm</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-8 flex justify-center">
                        <div
                            className="bg-white text-black shadow-2xl p-[20mm] w-[210mm] min-h-[297mm] transition-all duration-300 transform origin-top shrink-0 border"
                            style={{ boxShadow: '0 0 50px rgba(0,0,0,0.1)' }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    </CardContent>
                </Card>
            </div>

            {showAdvanced && (
                <Card className="border-t-4 border-primary">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">Generierter HTML-Output (Read Only)</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(false)}>Schliessen</Button>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            readOnly
                            className="font-mono text-[10px] h-[300px] bg-muted/20"
                            value={generatePreviewHtml(localTemplate)}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
