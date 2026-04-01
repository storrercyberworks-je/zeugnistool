import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function Users() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
        role: 'dozent',
        is_active: true,
        tenant_ids: []
    });

    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.list('users')
    });

    const { data: tenants = [] } = useQuery({
        queryKey: ['tenants-list'],
        queryFn: () => api.list('tenants')
    });

    const saveMutation = useMutation({
        mutationFn: (data) => editingUser 
            ? api.update('users', editingUser.id, data)
            : api.create('users', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast({ title: 'Erfolg', description: 'Benutzer gespeichert.' });
            setIsDialogOpen(false);
        },
        onError: (err) => toast({ variant: 'destructive', title: 'Fehler', description: err.message })
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete('users', id),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast({ title: 'Erfolg', description: 'Benutzer gelöscht.' });
        },
        onError: (err) => toast({ variant: 'destructive', title: 'Fehler', description: err.message })
    });

    const handleOpenDialog = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                full_name: user.full_name,
                password: '', // Hidden to frontend, only set if changing
                role: user.role,
                is_active: user.is_active,
                tenant_ids: user.tenants.map(t => t.tenant_id)
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                full_name: '',
                password: '',
                role: 'dozent',
                is_active: true,
                tenant_ids: []
            });
        }
        setIsDialogOpen(true);
    };

    const handleTenantToggle = (tenantId) => {
        setFormData(prev => ({
            ...prev,
            tenant_ids: prev.tenant_ids.includes(tenantId)
                ? prev.tenant_ids.filter(id => id !== tenantId)
                : [...prev.tenant_ids, tenantId]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    if (loadingUsers) return <div>Lade Benutzer...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Benutzerverwaltung</h2>
                    <p className="text-muted-foreground">Verwalten Sie Logins, Rollen und Schul-Zuweisungen.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Benutzer hinzufügen
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Benutzername</TableHead>
                                <TableHead>Echter Name</TableHead>
                                <TableHead>Rolle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Schulen</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.username}</TableCell>
                                    <TableCell>{u.full_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.is_active ? 'outline' : 'destructive'}>
                                            {u.is_active ? 'Aktiv' : 'Gesperrt'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {u.tenants.length} zugewiesen
                                    </TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(u)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => {
                                            if(window.confirm('Diesen Benutzer wirklich löschen?')) deleteMutation.mutate(u.id);
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Keine Benutzer gefunden.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}</DialogTitle>
                        <DialogDescription>
                            {editingUser ? 'Lassen Sie das Passwort-Feld leer, um es nicht zu ändern.' : 'Legen Sie einen neuen Account an.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Benutzername</Label>
                                <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Voller Name</Label>
                                <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Passwort {editingUser && '(Optional)'}</Label>
                            <Input 
                                type="password" 
                                required={!editingUser} 
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                placeholder={editingUser ? '••••••••' : ''}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Rolle</Label>
                                <select 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="dozent">Dozent</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div className="space-y-2 flex flex-col justify-end pb-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={formData.is_active} onCheckedChange={c => setFormData({...formData, is_active: c})} />
                                    Account ist aktiv
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <Label className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Schul-Zuweisung</Label>
                            <div className="space-y-2 max-h-[150px] overflow-auto border rounded-md p-3 bg-muted/20">
                                {tenants.map(t => (
                                    <label key={t.id} className="flex items-center gap-2 text-sm">
                                        <Checkbox 
                                            checked={formData.tenant_ids.includes(t.id)}
                                            onCheckedChange={() => handleTenantToggle(t.id)}
                                        />
                                        <span>{t.name} <span className="text-muted-foreground text-xs">({t.code})</span></span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Speichert...' : 'Speichern'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
