import React from 'react';
import { useAuth } from '@/lib/auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, ArrowRight, Loader2 } from 'lucide-react';

export default function TenantSelect() {
    const { user, allowedTenants, activeTenant, switchTenant, isLoading } = useAuth();
    const navigate = useNavigate();
    const [isSwitching, setIsSwitching] = React.useState(null);

    // If no user or still loading, the ProtectedRoute handles redirection
    if (!user || isLoading) return null;

    if (allowedTenants.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <School className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold text-red-500">Keine Schulen zugewiesen</h2>
                <p className="text-muted-foreground">Sie haben keine Berechtigung für eine Schule. Bitte kontaktieren Sie den Administrator.</p>
            </div>
        );
    }

    if (allowedTenants.length === 1 && activeTenant) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSelect = async (tenantId) => {
        console.log("Tenant selected:", tenantId);
        setIsSwitching(tenantId);
        try {
            await switchTenant(tenantId);
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error("switchTenant failed", error);
            setIsSwitching(null);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-3xl font-black text-primary">NotenMeister</h1>
                    <p className="text-xl text-muted-foreground">Willkommen zurück, {user.full_name}</p>
                </div>
                
                <Card className="shadow-lg border-primary/20">
                    <CardHeader className="text-center pb-8 border-b bg-muted/20">
                        <CardTitle className="text-2xl">Schule auswählen</CardTitle>
                        <CardDescription className="text-base">
                            Sie haben Zugriff auf mehrere Schulen. Bitte wählen Sie Ihren Arbeitsbereich:
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allowedTenants.map((tenant) => (
                                <Button
                                    key={tenant.id}
                                    variant={activeTenant?.id === tenant.id ? 'default' : 'outline'}
                                    className={`h-auto flex flex-col items-start p-6 text-left transition-all hover:border-primary border-2 ${activeTenant?.id === tenant.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                    onClick={() => handleSelect(tenant.id)}
                                    disabled={isSwitching !== null}
                                >
                                    <div className="flex items-center justify-between w-full mb-4">
                                        <div className={`p-3 rounded-xl ${activeTenant?.id === tenant.id ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
                                            <School className={`h-6 w-6 ${activeTenant?.id === tenant.id ? 'text-primary-foreground' : 'text-primary'}`} />
                                        </div>
                                        {isSwitching === tenant.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <ArrowRight className={`h-5 w-5 ${activeTenant?.id === tenant.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg">{tenant.name}</h3>
                                        <p className={`text-sm ${activeTenant?.id === tenant.id ? 'opacity-90' : 'text-muted-foreground'}`}>
                                            Code: {tenant.code}
                                        </p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
