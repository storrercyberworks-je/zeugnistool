import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MockApi, STORAGE_KEYS } from '@/lib/api';
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    Search,
    RefreshCw,
    Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const STEPS = {
    UPLOAD: 0,
    MAPPING: 1,
    LOOPS: 2,
    FINALIZING: 3
};

const PLACEHOLDERS = [
    { label: 'Vorname (Schüler)', value: '{{student_first_name}}' },
    { label: 'Nachname (Schüler)', value: '{{student_last_name}}' },
    { label: 'Geburtsdatum', value: '{{student_birth_date}}' },
    { label: 'Klasse', value: '{{class_name}}' },
    { label: 'Semester', value: '{{semester}}' },
    { label: 'Schuljahr', value: '{{school_year}}' },
    { label: 'Durchschnittsnote', value: '{{average_grade}}' },
    { label: 'Ausgabedatum', value: '{{issue_date_long}}' },
    { label: 'Signatur 1 Name', value: '{{signature_1_name}}' },
    { label: 'Signatur 1 Titel', value: '{{signature_1_title}}' },
    { label: 'Signatur 2 Name', value: '{{signature_2_name}}' },
    { label: 'Signatur 2 Titel', value: '{{signature_2_title}}' },
    { label: 'Fusszeile', value: '{{footer_text}}' }
];

const LOOP_FIELDS = [
    { label: 'Modulname', value: '{{module_name}}' },
    { label: 'Note (Dezimal)', value: '{{module_average}}' },
    { label: 'Prädikat', value: '{{module_predicate}}' }
];

export function MappingWizard({ onComplete, onCancel, type = 'docx' }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(STEPS.UPLOAD);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [templateData, setTemplateData] = useState({
        name: '',
        file_url: '',
        detected_fields: [],
        mapping: {},
        loops: { fachmodule: false, allgemeinbildung: false }
    });

    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Check mime type
        if (type === 'docx' && !selectedFile.name.endsWith('.docx')) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte wählen Sie eine .docx Datei.' });
            return;
        }
        if (type === 'pdf_form' && !selectedFile.name.endsWith('.pdf')) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte wählen Sie eine .pdf Datei.' });
            return;
        }

        setFile(selectedFile);
        setIsUploading(true);

        try {
            // Upload to special templates endpoint
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch('http://localhost:3001/api/templates/docx/upload', {
                method: 'POST',
                body: formData
            });

            const contentType = response.headers.get("content-type") || "";
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Upload fehlgeschlagen (${response.status}). Response: ${text.slice(0, 100)}`);
            }
            if (!contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Unerwartete Server-Antwort: Expected JSON but got: ${contentType}.`);
            }

            const result = await response.json();

            if (!result.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Simulate field detection (hardcoded for now, or could call a scan API)
            // In a real app, the server would return detected placeholders
            const detected = ['student_last_name', 'student_first_name', 'average_grade', 'semester'];

            setTemplateData(prev => ({
                ...prev,
                name: selectedFile.name.replace(/\.[^/.]+$/, ""),
                file_url: result.file_url,
                file_mime: selectedFile.type,
                detected_fields: detected
            }));

            setStep(STEPS.MAPPING);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Fehler', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const saveMutation = useMutation({
        mutationFn: (payload) => MockApi.create(STORAGE_KEYS.TEMPLATES, payload),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.TEMPLATES]);
            toast({ title: 'Erfolg', description: 'Vorlage wurde gespeichert.' });
            onComplete();
        }
    });

    const handleFinalize = () => {
        saveMutation.mutate({
            name: templateData.name,
            template_type: type,
            file_url: templateData.file_url,
            file_mime: templateData.file_mime,
            mapping_config: JSON.stringify({
                fields: templateData.mapping,
                loops: templateData.loops
            }),
            is_active: true,
            template_version: 1
        });
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-2 shadow-xl">
            <CardHeader className="bg-muted/30 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            {type === 'docx' ? <FileText className="h-5 w-5 text-blue-500" /> : <RefreshCw className="h-5 w-5 text-red-500" />}
                            {type === 'docx' ? 'Word (DOCX) Vorlage' : 'PDF Formular Vorlage'}
                        </CardTitle>
                        <CardDescription>
                            Folgen Sie den Schritten um Ihre {type === 'docx' ? 'DOCX' : 'PDF'} zu konfigurieren.
                        </CardDescription>
                    </div>
                    <Badge variant="outline">Schritt {step + 1} von 4</Badge>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {step === STEPS.UPLOAD && (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => fileInputRef.current.click()}>
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept={type === 'docx' ? ".docx" : ".pdf"} />
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <Upload className="h-8 w-8 text-primary animate-bounce" />
                        </div>
                        <h3 className="text-lg font-bold">Datei auswählen</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {type === 'docx' ? 'Klicken oder ziehen Sie Ihre Word-Datei hierher.' : 'Klicken oder ziehen Sie Ihr Formular-PDF hierher.'}
                        </p>
                        {isUploading && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                                <RefreshCw className="h-4 w-4 animate-spin" /> Datei wird verarbeitet...
                            </div>
                        )}
                    </div>
                )}

                {step === STEPS.MAPPING && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> Felder verknüpfen
                            </h3>
                            <span className="text-xs text-muted-foreground">{templateData.detected_fields.length} Felder erkannt</span>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-auto pr-2">
                            {templateData.detected_fields.map((field) => (
                                <div key={field} className="grid grid-cols-2 gap-4 items-center p-3 rounded-lg border bg-card">
                                    <div className="text-sm font-mono text-muted-foreground">
                                        {field}
                                    </div>
                                    <Select
                                        onValueChange={(val) => setTemplateData(prev => ({
                                            ...prev,
                                            mapping: { ...prev.mapping, [field]: val }
                                        }))}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Wähle Platzhalter..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PLACEHOLDERS.map(p => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === STEPS.LOOPS && (
                    <div className="space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3">
                            <TableIcon className="h-5 w-5 text-blue-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Tabellen-Konfiguration</h4>
                                <p className="text-xs text-blue-700 mt-1">
                                    In Word müssen Sie Tabellen mit Loops (z.B. <code className="bg-white/50 px-1 rounded">{"{{#fachmodule}}"}</code>) markiert haben.
                                    Hier geben Sie an, welche System-Daten in diese Loops fliessen sollen.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 mt-6">
                            <Card className="border shadow-none">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold">Tabelle: Fachmodule</div>
                                        <div className="text-xs text-muted-foreground">Enthält technikorientierte Fächer</div>
                                    </div>
                                    <Button
                                        variant={templateData.loops.fachmodule ? "secondary" : "outline"}
                                        onClick={() => setTemplateData(prev => ({
                                            ...prev,
                                            loops: { ...prev.loops, fachmodule: !prev.loops.fachmodule }
                                        }))}
                                    >
                                        {templateData.loops.fachmodule ? "Aktiviert" : "Aktivieren"}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-none">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold">Tabelle: Allgemeinbildung</div>
                                        <div className="text-xs text-muted-foreground">Sozialkunde, Sprache, etc.</div>
                                    </div>
                                    <Button
                                        variant={templateData.loops.allgemeinbildung ? "secondary" : "outline"}
                                        onClick={() => setTemplateData(prev => ({
                                            ...prev,
                                            loops: { ...prev.loops, allgemeinbildung: !prev.loops.allgemeinbildung }
                                        }))}
                                    >
                                        {templateData.loops.allgemeinbildung ? "Aktiviert" : "Aktivieren"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {step === STEPS.FINALIZING && (
                    <div className="text-center py-8 space-y-4">
                        <div className="p-4 bg-green-500/10 rounded-full w-fit mx-auto">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold">Fast fertig!</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Geben Sie der Vorlage einen Namen und speichern Sie sie ab. Danach können Sie echte Zeugnisse generieren.
                        </p>
                        <div className="max-w-sm mx-auto pt-4">
                            <Input
                                placeholder="Name der Vorlage"
                                value={templateData.name}
                                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-muted/10 border-t p-4 flex justify-between">
                <Button variant="ghost" onClick={step === STEPS.UPLOAD ? onCancel : () => setStep(step - 1)}>
                    {step === STEPS.UPLOAD ? "Abbrechen" : "Zurück"}
                </Button>

                {step < STEPS.FINALIZING ? (
                    <Button
                        disabled={step === STEPS.UPLOAD}
                        onClick={() => setStep(step + 1)}
                    >
                        Weiter <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleFinalize} disabled={!templateData.name || saveMutation.isLoading}>
                        {saveMutation.isLoading ? "Speichere..." : "Vorlage Speichern"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
