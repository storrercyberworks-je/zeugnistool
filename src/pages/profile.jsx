import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MockApi, STORAGE_KEYS } from '@/lib/api'
import { Save, School, MapPin, Phone, Mail, Globe, Info, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: profile, isLoading } = useQuery({
        queryKey: [STORAGE_KEYS.SCHOOL_PROFILE],
        queryFn: () => MockApi.getSchoolProfile(),
    })

    const updateMutation = useMutation({
        mutationFn: (data) => MockApi.updateSchoolProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries([STORAGE_KEYS.SCHOOL_PROFILE])
            toast({ title: 'Erfolg', description: 'Schulprofil wurde aktualisiert.' })
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const data = Object.fromEntries(formData)

        // Handle checkbox boolean
        data.show_developer_credit_in_pdf = formData.has('show_developer_credit_in_pdf')

        updateMutation.mutate(data)
    }

    const handleLogoUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target.result
            updateMutation.mutate({ ...profile, logo_data_url: dataUrl })
        }
        reader.readAsDataURL(file)
    }

    if (isLoading) return <div>Lade...</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Schulprofil</h1>
                <p className="text-muted-foreground">Stammdaten der Schule für Briefköpfe und Zeugnisse.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5" /> Allgemeine Informationen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schulname</label>
                                <Input name="school_name" defaultValue={profile?.school_name} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Stadt</label>
                                    <Input name="city" defaultValue={profile?.city} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kanton / Bundesland</label>
                                    <Input name="canton" defaultValue={profile?.canton} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Adresse Zeile 1</label>
                                <Input name="address_line1" defaultValue={profile?.address_line1} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Adresse Zeile 2</label>
                                <Input name="address_line2" defaultValue={profile?.address_line2} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Kontakt & Media</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Telefon</label>
                                    <Input name="phone" defaultValue={profile?.phone} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Website</label>
                                    <Input name="website" defaultValue={profile?.website} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email (Zentral)</label>
                                <Input name="email" type="email" defaultValue={profile?.email} />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schul-Logo</label>
                                <div className="flex items-center gap-4">
                                    {profile?.logo_data_url ? (
                                        <img src={profile.logo_data_url} alt="Logo" className="h-16 w-16 object-contain border rounded-md" />
                                    ) : (
                                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><ImageIcon /></div>
                                    )}
                                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-up').click()}>Logo ändern</Button>
                                    <input id="logo-up" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Unterschriften & Footer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Unterschrift 1 (links)</h3>
                                    <Input name="signature_1_name" placeholder="Name" defaultValue={profile?.signature_1_name} />
                                    <Input name="signature_1_title" placeholder="Titel (z.B. Schulleitung)" defaultValue={profile?.signature_1_title} />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm">Unterschrift 2 (rechts)</h3>
                                    <Input name="signature_2_name" placeholder="Name" defaultValue={profile?.signature_2_name} />
                                    <Input name="signature_2_title" placeholder="Titel (z.B. Klassenleitung)" defaultValue={profile?.signature_2_title} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Footer Text (Zeugnis-Ende)</label>
                                <textarea
                                    name="footer_text"
                                    defaultValue={profile?.footer_text}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Dieses Zeugnis wurde maschinell erstellt und ist ohne Unterschrift gültig..."
                                />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold">Entwickler-Credit im PDF</h4>
                                    <p className="text-xs text-muted-foreground">Zeigt dezent "Konzeption, Entwicklung und Design: STORRER Cyberworks & Guidance" am Ende des PDFs an.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    name="show_developer_credit_in_pdf"
                                    defaultChecked={profile?.show_developer_credit_in_pdf}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={updateMutation.isLoading}>Profil Speichern</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    )
}
