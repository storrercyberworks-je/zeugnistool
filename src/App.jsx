import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Providers } from './components/providers'
import { ThemeProvider } from './components/theme-provider'
import { DashboardLayout } from './components/layout'
import { Toaster } from './components/ui/toaster'
import ErrorBoundary from './components/error-boundary'
import { APP_ROUTES } from './routes'
import { Loader2 } from 'lucide-react'
import { ProtectedRoute } from './components/protected-route'

const Login = React.lazy(() => import('./pages/login'));
const TenantSelect = React.lazy(() => import('./pages/tenant-select'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
  </div>
);

function AppContent() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/select-tenant" element={<TenantSelect />} />
            
            <Route path="/*" element={
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    {APP_ROUTES.map((route) => (
                      <Route key={route.path} path={route.path} element={route.element} />
                    ))}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            } />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="nm-ui-theme">
      <Providers>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
        <Toaster />
      </Providers>
    </ThemeProvider>
  )
}

export default App
