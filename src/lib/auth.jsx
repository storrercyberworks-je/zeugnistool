import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { useToast } from '@/hooks/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const { toast } = useToast();
    const [user, setUser] = useState(null);
    const [activeTenant, setActiveTenant] = useState(null);
    const [allowedTenants, setAllowedTenants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const checkSession = useCallback(async () => {
        try {
            const token = localStorage.getItem('nm-auth-token');
            if (token) {
                const data = await api.auth.me();
                setUser(data.user);
                setActiveTenant(data.activeTenant);
                setAllowedTenants(data.allowedTenants);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            localStorage.removeItem('nm-auth-token');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (username, password) => {
        try {
            const data = await api.auth.login(username, password);
            localStorage.setItem('nm-auth-token', data.token);
            setUser(data.user);
            setActiveTenant(data.activeTenant);
            setAllowedTenants(data.user.allowedTenants);
            return true;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Login fehlgeschlagen', description: error.message });
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('nm-auth-token');
        setUser(null);
        setActiveTenant(null);
        setAllowedTenants([]);
        window.location.href = '/login';
    };

    const switchTenant = async (tenantId) => {
        try {
            const data = await api.auth.switchTenant(tenantId);
            localStorage.setItem('nm-auth-token', data.token);
            window.location.reload(); // Reload completely to clear react-query cache and UI state!
        } catch (error) {
            toast({ variant: 'destructive', title: 'Mandanten-Wechsel fehlgeschlagen', description: error.message });
        }
    };

    const value = {
        user,
        activeTenant,
        allowedTenants,
        login,
        logout,
        switchTenant,
        isLoading,
        isAdmin: user?.role === 'admin',
        isDozent: user?.role === 'dozent'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
