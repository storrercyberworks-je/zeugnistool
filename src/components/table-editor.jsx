import React from 'react';
import {
    Columns,
    Palette,
    Layout,
    CheckCircle2,
    Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function TableEditor({ title, config, onChange }) {
    const updateConfig = (key, value) => {
        onChange({ ...config, [key]: value });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                    <Layout className="h-4 w-4" /> {title}
                </h3>
            </div>

            <div className="grid gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Columns className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-tight">Sichtbare Spalten</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-2 border rounded-md bg-card">
                            <Label htmlFor="col-modul" className="text-xs">Modulname</Label>
                            <Switch id="col-modul" checked={config.columns?.module !== false} onCheckedChange={(val) => updateConfig('columns', { ...config.columns, module: val })} />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded-md bg-card">
                            <Label htmlFor="col-grade" className="text-xs">Note</Label>
                            <Switch id="col-grade" checked={config.columns?.grade !== false} onCheckedChange={(val) => updateConfig('columns', { ...config.columns, grade: val })} />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded-md bg-card">
                            <Label htmlFor="col-predicate" className="text-xs">Prädikat</Label>
                            <Switch id="col-predicate" checked={config.columns?.predicate !== false} onCheckedChange={(val) => updateConfig('columns', { ...config.columns, predicate: val })} />
                        </div>
                        <div className="flex items-center justify-between p-2 border rounded-md bg-card">
                            <Label htmlFor="col-weight" className="text-xs">Gewichtung</Label>
                            <Switch id="col-weight" checked={config.columns?.weight === true} onCheckedChange={(val) => updateConfig('columns', { ...config.columns, weight: val })} />
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Palette className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-tight">Styling & Layout</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Zebra-Streifen</Label>
                                <p className="text-[10px] text-muted-foreground">Wechselnde Hintergrundfarben für Zeilen</p>
                            </div>
                            <Switch checked={config.zebra === true} onCheckedChange={(val) => updateConfig('zebra', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Tabellen-Rahmen</Label>
                                <p className="text-[10px] text-muted-foreground">Rahmen um die gesamte Tabelle anzeigen</p>
                            </div>
                            <Switch checked={config.border === true} onCheckedChange={(val) => updateConfig('border', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Header fixieren</Label>
                                <p className="text-[10px] text-muted-foreground">Spaltenköpfe fett drucken</p>
                            </div>
                            <Switch checked={config.bold_header !== false} onCheckedChange={(val) => updateConfig('bold_header', val)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-[10px] text-muted-foreground italic flex items-start gap-2">
                <Settings2 className="h-3 w-3 mt-0.5 shrink-0" />
                Das System generiert automatisch den HTML-Code für diese Tabelle basierend auf Ihren Einstellungen.
            </div>
        </div>
    );
}
