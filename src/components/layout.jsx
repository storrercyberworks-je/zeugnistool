import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getAuthUser, switchRole, ROLES } from '@/lib/auth'
import {
    ChevronLeft,
    ChevronRight,
    Menu,
    Moon,
    Sun,
    Layout
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { APP_ROUTES } from '../routes'
import { Footer } from './footer'

export function DashboardLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [user, setUser] = useState(getAuthUser())
    const { theme, setTheme } = useTheme()
    const location = useLocation()

    useEffect(() => {
        const handleAuthChange = () => setUser(getAuthUser())
        window.addEventListener('auth-change', handleAuthChange)
        return () => window.removeEventListener('auth-change', handleAuthChange)
    }, [])

    const activeRoute = APP_ROUTES.find(r => location.pathname === r.path)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
                    <Menu className="h-4 w-4" />
                </Button>
            </div>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 bg-card border-r transition-all duration-300 z-40 md:relative",
                    collapsed ? "w-16" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="p-4 flex items-center justify-between border-b">
                        {!collapsed && <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">NotenMeister</h1>}
                        {collapsed && <Layout className="h-6 w-6 text-primary mx-auto" />}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex"
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 px-2 py-4">
                        <nav className="space-y-1">
                            {APP_ROUTES.filter(r => r.showInSidebar).map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                        location.pathname === item.path
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        collapsed && "justify-center px-2"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            ))}
                        </nav>
                    </ScrollArea>

                    <div className="p-4 border-t space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("w-full justify-start", collapsed && "justify-center")}
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            {!collapsed && <span className="ml-2">{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>}
                        </Button>
                        {!collapsed && (
                            <div className="px-2 py-1 flex items-center justify-between group">
                                <div className="min-w-0">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{user.role}</p>
                                    <p className="text-sm font-semibold truncate leading-tight">{user.full_name}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => switchRole(user.role === ROLES.ADMIN ? ROLES.TEACHER : ROLES.ADMIN)}
                                    title="Rolle wechseln"
                                >
                                    <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center text-[8px] font-bold">
                                        R
                                    </div>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
                    <h2 className="text-lg font-semibold truncate">
                        {activeRoute?.label || 'Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Rolle simulieren:</span>
                            <div className="flex gap-1">
                                <Button
                                    variant={user.role === ROLES.ADMIN ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-black px-3 rounded-full"
                                    onClick={() => switchRole(ROLES.ADMIN)}
                                >
                                    Admin
                                </Button>
                                <Button
                                    variant={user.role === ROLES.TEACHER ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-black px-3 rounded-full"
                                    onClick={() => switchRole(ROLES.TEACHER)}
                                >
                                    Dozent
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto">
                    <div className="min-h-full flex flex-col p-6 md:p-8">
                        <div className="flex-1 max-w-7xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
                            {children}
                        </div>
                        <Footer />
                    </div>
                </div>
            </main>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    )
}
