const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

export const STORAGE_KEYS = {
    TEACHERS: 'teachers',
    CLASSES: 'classes',
    STUDENTS: 'students',
    SUBJECTS: 'subjects',
    GRADES: 'grades',
    GRADE_REQUESTS: 'grade-requests',
    SCHOOL_PROFILE: 'school-profile',
    TEMPLATES: 'templates',
    CERTIFICATES: 'certificates',
    ARCHIVE_RUNS: 'archive-runs',
    ARCHIVE_SNAPSHOTS: 'archive-snapshots',
    GRADE_COMPLETENESS: 'completeness'
};

const handleResponse = async (response) => {
    if (response.status === 401 || response.status === 403) {
        if (window.location.pathname !== '/login') {
            localStorage.removeItem('nm-auth-token');
            window.location.href = '/login';
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API request failed: ${response.statusText}`);
    }
    return response.json();
};

const getHeaders = (customHeaders = {}) => {
    const token = localStorage.getItem('nm-auth-token');
    return {
        ...customHeaders,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Generic CRUD
    list: (path, filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        const url = `${API_BASE}/${path}${query ? '?' + query : ''}`;
        return fetch(url, { headers: getHeaders() }).then(handleResponse);
    },
    get: (path, id) => fetch(`${API_BASE}/${path}/${id}`, { headers: getHeaders() }).then(handleResponse),
    create: (path, data) => fetch(`${API_BASE}/${path}`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
    }).then(handleResponse),
    update: (path, id, data) => fetch(`${API_BASE}/${path}/${id}`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
    }).then(handleResponse),
    delete: (path, id) => fetch(`${API_BASE}/${path}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    }).then(handleResponse),
    bulkCreate: async (path, items) => {
        // Simple sequential create for bulk for now, or implement bulk endpoint on server
        const results = [];
        for (const item of items) {
            results.push(await api.create(path, item));
        }
        return results;
    },

    // Specific helpers
    getSchoolProfile: () => fetch(`${API_BASE}/school-profile`, { headers: getHeaders() }).then(handleResponse),
    updateSchoolProfile: (data) => fetch(`${API_BASE}/school-profile`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
    }).then(handleResponse),

    clearAllData: () => fetch(`${API_BASE}/system/clear`, { method: 'POST', headers: getHeaders() }).then(handleResponse),

    // File helpers
    uploadFile: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            headers: getHeaders(),
            body: formData
        }).then(handleResponse);
    },
    extractData: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/files/extract`, {
            method: 'POST',
            headers: getHeaders(),
            body: formData
        }).then(handleResponse);
    },
    importStudents: (data) => fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
    }).then(handleResponse),
    getCompleteness: (classId, semester, schoolYear) => {
        const query = { classId };
        if (semester) query.semester = semester;
        if (schoolYear) query.schoolYear = schoolYear;
        const params = new URLSearchParams(query).toString();
        return fetch(`${API_BASE}/${STORAGE_KEYS.GRADE_COMPLETENESS}?${params}`, { headers: getHeaders() }).then(handleResponse);
    },
    // Auth specific API helper
    auth: {
        login: (username, password) => fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(handleResponse),
        me: () => fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse),
        switchTenant: (tenant_id) => fetch(`${API_BASE}/auth/switch-tenant`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ tenant_id })
        }).then(handleResponse)
    }
};

export const MockApi = api;
