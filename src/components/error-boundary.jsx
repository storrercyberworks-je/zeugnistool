import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-6 animate-in fade-in duration-500">
                    <div className="bg-destructive/10 p-4 rounded-full">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Ups! Etwas ist schiefgelaufen.</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Die Seite <span className="font-mono text-destructive">{window.location.pathname}</span> konnte nicht geladen werden oder hat einen Fehler verursacht.
                        </p>
                        {this.state.error && (
                            <pre className="mt-4 p-4 bg-muted rounded-md text-xs text-left overflow-auto max-w-xl mx-auto border block font-mono">
                                {this.state.error.toString()}
                            </pre>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Zurück zum Dashboard
                        </Button>
                        <Button onClick={() => this.setState({ hasError: false })}>
                            Erneut versuchen
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
