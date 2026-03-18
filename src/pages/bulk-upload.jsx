import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Download,
    Loader2,
    Database,
    Users,
    FileUp,
    XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

export default function BulkUpload() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importStats, setImportStats] = useState(null);
    const [errorLogs, setErrorLogs] = useState([]);
    const [schoolYear, setSchoolYear] = useState('2024/2025');

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setImportStats(null);
        setErrorLogs([]);

        try {
            const data = await api.extractData(selectedFile);
            setPreviewData(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Parse-Fehler', description: error.message });
        }
    };

    const handleImport = async () => {
        if (!previewData) return;
        setIsProcessing(true);
        setImportStats(null);
        setErrorLogs([]);

        try {
            const results = await api.importStudents({
                students: previewData,
                school_year: schoolYear
            });

            setImportStats(results);
            setErrorLogs(results.errors || []);

            toast({
                title: 'Import abgeschlossen',
                description: `${results.created} neu, ${results.updated} aktualisiert.`
            });

            setPreviewData(null);
            setFile(null);
            queryClient.invalidateQueries();

        } catch (error) {
            toast({ variant: 'destructive', title: 'Import fehlgeschlagen', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Schüler-Import</h1>
                    <p className="text-muted-foreground">Klassenlisten aus Excel direkt in das System einpflegen.</p>
                </div>
            </div>

            {importStats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-in fade-in duration-500">
                    <Card className="bg-green-500/10 border-green-200">
                        <CardContent className="pt-6 text-center">
                            <p className="text-[10px] text-green-700 uppercase font-bold">Schüler Neu</p>
                            <p className="text-2xl font-black text-green-600">{importStats.created}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500/10 border-blue-200">
                        <CardContent className="pt-6 text-center">
                            <p className="text-[10px] text-blue-700 uppercase font-bold">Schüler Aktualisiert</p>
                            <p className="text-2xl font-black text-blue-600">{importStats.updated}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-500/10 border-purple-200">
                        <CardContent className="pt-6 text-center">
                            <p className="text-[10px] text-purple-700 uppercase font-bold">Klassen Neu</p>
                            <p className="text-2xl font-black text-purple-600">{importStats.classesCreated}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-500/10 border-orange-200">
                        <CardContent className="pt-6 text-center">
                            <p className="text-[10px] text-orange-700 uppercase font-bold">Klassen Besteh.</p>
                            <p className="text-2xl font-black text-orange-600">{importStats.classesExisting}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-500/10 border-red-200 text-red-700">
                        <CardContent className="pt-6 text-center">
                            <p className="text-[10px] uppercase font-bold">Fehler</p>
                            <p className="text-2xl font-black">{errorLogs.length}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {errorLogs.length > 0 && (
                <Card className="border-red-200 bg-red-50/20">
                    <CardHeader className="py-3 border-b border-red-100 flex flex-row items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-sm text-red-700">Import-Warnungen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[200px] overflow-y-auto">
                        <Table>
                            <TableBody>
                                {errorLogs.map((err, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="text-xs text-red-600 font-medium">{err}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-lg border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-6 w-6 text-primary" /> Excel-Liste hochladen
                    </CardTitle>
                    <CardDescription>Erwartete Spalten: Vorname, Nachname, Klasse, Geburtstag (optional), Adresse (optional), Email Schule, Email Privat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        className="border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary transition-all cursor-pointer bg-card"
                        onClick={() => document.getElementById('student-file').click()}
                    >
                        <FileSpreadsheet className="h-10 w-10 text-primary opacity-50" />
                        <div>
                            <p className="text-lg font-bold">Datei auswählen oder hierher ziehen</p>
                            <p className="text-sm text-muted-foreground">Unterstützt .xlsx, .xls und .csv</p>
                        </div>
                        <input
                            id="student-file"
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                        />
                        {file && (
                            <Badge variant="secondary" className="px-4 py-2 text-primary font-bold">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> {file.name}
                            </Badge>
                        )}
                    </div>

                    {previewData && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <Database className="h-4 w-4" /> Vorschau ({previewData.length} Zeilen)
                            </h3>
                            <div className="max-h-[300px] overflow-auto border rounded-md bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {Object.keys(previewData[0]).slice(0, 5).map(h => (
                                                <TableHead key={h}>{h}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <TableRow key={i}>
                                                {Object.values(row).slice(0, 5).map((v, j) => (
                                                    <TableCell key={j} className="text-xs truncate max-w-[150px]">{String(v)}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t flex justify-between items-center py-4 px-6 rounded-b-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-48">
                            <Input
                                placeholder="Schuljahr"
                                value={schoolYear}
                                onChange={e => setSchoolYear(e.target.value)}
                                className="bg-card"
                            />
                        </div>
                    </div>
                    <Button
                        disabled={!previewData || isProcessing}
                        onClick={handleImport}
                        className="px-8 font-bold"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Import jetzt starten
                    </Button>
                </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Download className="h-4 w-4" /> Vorlage erforderlich?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground pb-4">
                        Nutzen Sie die standardisierte Klassenliste Ihrer Schulverwaltung. Stellen Sie sicher, dass die Spaltenüberschriften "Vorname", "Nachname" und "Klasse" vorhanden sind.
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                            <a href="/templates/vorlage_schuelerimport.xlsx" download>
                                <Download className="h-3 w-3 mr-2" /> Vorlage herunterladen
                            </a>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" /> Duplikate-Check
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        Bestehende Schüler werden anhand von Vorname, Nachname und Klasse automatisch erkannt und aktualisiert statt neu angelegt.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
