import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { APP_ROUTES } from '@/routes';

export const ProtectedRoute = () => {
    const { user, isLoading, activeTenant, allowedTenants } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedTenants.length > 1 && !activeTenant && location.pathname !== '/select-tenant') {
        return <Navigate to="/select-tenant" replace />;
    }

    // Role-based routing protection
    const currentRoute = APP_ROUTES.find(r => 
        r.path === '/' ? false : location.pathname.startsWith(r.path.split('/:')[0])
    );
    
    if (currentRoute && currentRoute.roles && !currentRoute.roles.includes(user.role)) {
        // Fallback for Dozent is grade-entry
        if (user.role === 'dozent') {
            return <Navigate to="/grade-entry" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
