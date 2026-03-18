import React from 'react';
import {
    User,
    Calendar,
    BarChart3,
    Signature as SignatureIcon,
    Search,
    Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
    {
        name: 'Schüler',
        icon: User,
        color: 'text-blue-500',
        placeholders: [
            { label: 'Vorname', value: '{{student_first_name}}' },
            { label: 'Nachname', value: '{{student_last_name}}' },
            { label: 'Geburtsdatum', value: '{{student_birth_date}}' },
            { label: 'Klasse', value: '{{class_name}}' }
        ]
    },
    {
        name: 'Zeitraum',
        icon: Calendar,
        color: 'text-orange-500',
        placeholders: [
            { label: 'Semester', value: '{{semester}}' },
            { label: 'Schuljahr', value: '{{school_year}}' },
            { label: 'Ausgabedatum (Lang)', value: '{{issue_date_long}}' }
        ]
    },
    {
        name: 'Ergebnisse',
        icon: BarChart3,
        color: 'text-green-500',
        placeholders: [
            { label: 'Durchschnitt', value: '{{average_grade}}' },
            { label: 'Prädikat', value: '{{semester_predicate}}' },
            { label: 'Promotion', value: '{{promotion_status}}' }
        ]
    },
    {
        name: 'Unterschriften',
        icon: SignatureIcon,
        color: 'text-purple-500',
        placeholders: [
            { label: 'Name 1', value: '{{signature_1_name}}' },
            { label: 'Titel 1', value: '{{signature_1_title}}' },
            { label: 'Name 2', value: '{{signature_2_name}}' },
            { label: 'Titel 2', value: '{{signature_2_title}}' }
        ]
    }
];

export function PlaceholderPopover({ onSelect, trigger }) {
    const [search, setSearch] = React.useState('');

    const filteredCategories = CATEGORIES.map(cat => ({
        ...cat,
        placeholders: cat.placeholders.filter(p =>
            p.label.toLowerCase().includes(search.toLowerCase()) ||
            p.value.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(cat => cat.placeholders.length > 0);

    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger || <Button variant="outline" size="sm" className="h-8 gap-2"><Type className="h-4 w-4" /> Platzhalter</Button>}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-muted/30">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Suche..."
                            className="pl-8 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-[400px] overflow-auto p-2">
                    {filteredCategories.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                            Keine Platzhalter gefunden.
                        </div>
                    )}
                    {filteredCategories.map((cat) => (
                        <div key={cat.name} className="mb-4 last:mb-0">
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <cat.icon className={`h-3 w-3 ${cat.color}`} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                {cat.placeholders.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => onSelect(p.value)}
                                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left group"
                                    >
                                        <span className="text-xs font-medium">{p.label}</span>
                                        <code className="text-[10px] text-primary opacity-50 group-hover:opacity-100">{p.value}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
