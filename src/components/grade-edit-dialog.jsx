import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertCircle } from 'lucide-react';

export function GradeEditDialog({ grade, isOpen, onClose, onSave, isLoading }) {
    const [formData, setFormData] = useState({
        grade_value: '',
        weight: '',
        learning_field_name: '',
        comment: '',
        reexamination_required: false
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (grade && isOpen) {
            setFormData({
                grade_value: grade.grade_value || '',
                weight: grade.weight || '',
                learning_field_name: grade.learning_field_name || '',
                comment: grade.comment || '',
                reexamination_required: !!grade.reexamination_required
            });
            setError(null);
        }
    }, [grade, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (val) => {
        setFormData(prev => ({ ...prev, reexamination_required: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        const val = parseFloat(formData.grade_value);
        if (isNaN(val) || val < 1.0 || val > 6.0) {
            setError('Die Note muss zwischen 1.0 und 6.0 liegen.');
            return;
        }

        const weight = formData.weight === '' ? null : parseFloat(formData.weight);
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 100)) {
            setError('Die Gewichtung muss zwischen 0 und 100 liegen.');
            return;
        }

        onSave({
            ...formData,
            grade_value: val,
            weight: weight
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Note bearbeiten</DialogTitle>
                    <DialogDescription>
                        Änderungen für {grade?.student_name} im Fach {grade?.subject_name} vornehmen.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2 text-destructive text-xs">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="grade_value">Note (1-6)</Label>
                            <Input
                                id="grade_value"
                                name="grade_value"
                                type="number"
                                step="0.01"
                                min="1"
                                max="6"
                                value={formData.grade_value}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="weight">Gewichtung (%)</Label>
                            <Input
                                id="weight"
                                name="weight"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.weight}
                                onChange={handleChange}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="learning_field_name">Lernfeld / Titel</Label>
                        <Input
                            id="learning_field_name"
                            name="learning_field_name"
                            value={formData.learning_field_name}
                            onChange={handleChange}
                            placeholder="z.B. Prüfung 1, Modulabschluss..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Kommentar</Label>
                        <Textarea
                            id="comment"
                            name="comment"
                            value={formData.comment}
                            onChange={handleChange}
                            placeholder="Interne Bemerkungen..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="space-y-0.5">
                            <Label htmlFor="reexam">Nachprüfung erforderlich</Label>
                            <p className="text-[10px] text-muted-foreground">Markiert diese Note manuell für eine Nachprüfung.</p>
                        </div>
                        <Switch
                            id="reexam"
                            checked={formData.reexamination_required}
                            onCheckedChange={handleSwitchChange}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
