import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import {
    Users,
    GraduationCap,
    Users2,
    BookOpen,
    FileUp,
    Files,
    TrendingUp,
    Activity,
    Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
    const { data: teachers = [], isLoading: loadT } = useQuery({ queryKey: [STORAGE_KEYS.TEACHERS], queryFn: () => MockApi.list(STORAGE_KEYS.TEACHERS) })
    const { data: classes = [], isLoading: loadC } = useQuery({ queryKey: [STORAGE_KEYS.CLASSES], queryFn: () => MockApi.list(STORAGE_KEYS.CLASSES) })
    const { data: students = [], isLoading: loadS } = useQuery({ queryKey: [STORAGE_KEYS.STUDENTS], queryFn: () => MockApi.list(STORAGE_KEYS.STUDENTS) })
    const { data: subjects = [], isLoading: loadSub } = useQuery({ queryKey: [STORAGE_KEYS.SUBJECTS], queryFn: () => MockApi.list(STORAGE_KEYS.SUBJECTS) })
    const { data: grades = [], isLoading: loadG } = useQuery({ queryKey: [STORAGE_KEYS.GRADES], queryFn: () => MockApi.list(STORAGE_KEYS.GRADES) })
    const { data: certs = [] } = useQuery({ queryKey: [STORAGE_KEYS.CERTIFICATES], queryFn: () => MockApi.list(STORAGE_KEYS.CERTIFICATES) })

    const stats = [
        { label: 'Dozenten', value: teachers.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Klassen', value: classes.length, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Schüler', value: students.length, icon: Users2, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Fächer/Module', value: subjects.length, icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Noten', value: grades.length, icon: FileUp, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { label: 'Zeugnisse', value: certs.length, icon: Files, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    ]

    const recentActivity = [
        ...grades.slice(-3).map(g => ({ type: 'grade', text: `Neue Note für ${g.student_name} in ${g.subject_name}`, date: g.created_at })),
        ...students.slice(-2).map(s => ({ type: 'student', text: `Schüler ${s.first_name} ${s.last_name} hinzugefügt`, date: s.created_at })),
        ...certs.slice(-2).map(c => ({ type: 'cert', text: `Zeugnis generiert für ${c.student_name}`, date: c.issued_at }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

    if (loadT || loadC || loadS || loadSub || loadG) return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
    )

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground">Willkommen zurück! Hier ist eine Übersicht über das System.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                            <div className={`${stat.bg} p-2 rounded-md`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-full lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Notenverteilung</CardTitle>
                        <CardDescription>Übersicht über die Noten im aktuellen Schuljahr.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-md m-6 mt-0">
                        <div className="text-center">
                            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>Diagramm-Visualisierung (Statistik-Vorschau)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-full lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Aktuelle Aktivitäten</CardTitle>
                        <CardDescription>Die neuesten Änderungen im System.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-10 italic">Noch keine Aktivitäten vorhanden.</p>
                            ) : recentActivity.map((act, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${act.type === 'grade' ? 'bg-pink-500' :
                                            act.type === 'student' ? 'bg-green-500' : 'bg-cyan-500'
                                        }`} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{act.text}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> {new Date(act.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
