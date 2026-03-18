import React, { lazy } from 'react';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Users2,
    BookOpen,
    FileText,
    Upload,
    Settings,
    FileUp,
    Files,
    PenTool,
    Layout,
    Clock,
    UserPlus
} from 'lucide-react';

// Lazy load pages for better performance and separation
const Dashboard = lazy(() => import('./pages/dashboard'));
const Teachers = lazy(() => import('./pages/teachers'));
const Classes = lazy(() => import('./pages/classes'));
const Students = lazy(() => import('./pages/students'));
const Subjects = lazy(() => import('./pages/subjects'));
const GradeRequests = lazy(() => import('./pages/grade-requests'));
const UploadGrades = lazy(() => import('./pages/upload-grades'));
const Grades = lazy(() => import('./pages/grades'));
const Certificates = lazy(() => import('./pages/certificates'));
const Templates = lazy(() => import('./pages/templates'));
const Profile = lazy(() => import('./pages/profile'));
const SystemPage = lazy(() => import('./pages/system'));
const ArchivesPage = lazy(() => import('./pages/archives'));
const CertificateBuilder = lazy(() => import('./pages/certificate-builder'));
const BulkUpload = lazy(() => import('./pages/bulk-upload'));
const TemplateEditor = lazy(() => import('./pages/template-editor'));
const Assignments = lazy(() => import('./pages/assignments'));
const GradeEntry = lazy(() => import('./pages/grade-entry'));

export const APP_ROUTES = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        element: <Dashboard />,
        showInSidebar: true
    },
    {
        path: '/teachers',
        label: 'Dozenten',
        icon: Users,
        element: <Teachers />,
        showInSidebar: true
    },
    {
        path: '/classes',
        label: 'Klassen',
        icon: GraduationCap,
        element: <Classes />,
        showInSidebar: true
    },
    {
        path: '/students',
        label: 'Schüler',
        icon: Users2,
        element: <Students />,
        showInSidebar: true
    },
    {
        path: '/subjects',
        label: 'Fächer/Module',
        icon: BookOpen,
        element: <Subjects />,
        showInSidebar: true
    },
    {
        path: '/assignments',
        label: 'Zuweisungen',
        icon: UserPlus,
        element: <Assignments />,
        showInSidebar: true
    },
    {
        path: '/grade-entry',
        label: 'Notenvergabe',
        icon: PenTool,
        element: <GradeEntry />,
        showInSidebar: true
    },
    {
        path: '/grade-requests',
        label: 'Notenanforderungen',
        icon: FileText,
        element: <GradeRequests />,
        showInSidebar: false
    },
    {
        path: '/upload-grades',
        label: 'Noten hochladen',
        icon: Upload,
        element: <UploadGrades />,
        showInSidebar: false
    },
    {
        path: '/grade-management',
        label: 'Notenverwaltung',
        icon: FileUp,
        element: <Grades />,
        showInSidebar: true
    },
    {
        path: '/certificates',
        label: 'Zeugnisse',
        icon: Files,
        element: <Certificates />,
        showInSidebar: true
    },
    {
        path: '/certificate-templates',
        label: 'Zeugnis-Vorlagen',
        icon: PenTool,
        element: <Templates />,
        showInSidebar: true
    },
    {
        path: '/certificate-builder',
        label: 'Builder',
        icon: PenTool,
        element: <CertificateBuilder />,
        showInSidebar: true
    },
    {
        path: '/template-editor/:id',
        label: 'Template Editor',
        icon: PenTool,
        element: <TemplateEditor />,
        showInSidebar: false
    },
    {
        path: '/bulk-upload',
        label: 'Schüler-Import',
        icon: FileUp,
        element: <BulkUpload />,
        showInSidebar: true
    },
    {
        path: '/school-profile',
        label: 'Schulprofil',
        icon: Settings,
        element: <Profile />,
        showInSidebar: true
    },
    {
        path: '/system',
        label: 'System',
        icon: Layout,
        element: <SystemPage />,
        showInSidebar: true
    },
    {
        path: '/archive',
        label: 'Archiv',
        icon: Files,
        element: <ArchivesPage />,
        showInSidebar: true
    }
];
