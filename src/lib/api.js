const isDev = window.location.port === '5173';
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
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }
    return response.json();
};

export const api = {
    // Generic CRUD
    list: (path, filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        const url = `${API_BASE}/${path}${query ? '?' + query : ''}`;
        return fetch(url).then(handleResponse);
    },
    get: (path, id) => fetch(`${API_BASE}/${path}/${id}`).then(handleResponse),
    create: (path, data) => fetch(`${API_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),
    update: (path, id, data) => fetch(`${API_BASE}/${path}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),
    delete: (path, id) => fetch(`${API_BASE}/${path}/${id}`, {
        method: 'DELETE'
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
    getSchoolProfile: () => fetch(`${API_BASE}/school-profile`).then(handleResponse),
    updateSchoolProfile: (data) => fetch(`${API_BASE}/school-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),

    clearAllData: () => fetch(`${API_BASE}/system/clear`, { method: 'POST' }).then(handleResponse),

    // File helpers
    uploadFile: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            body: formData
        }).then(handleResponse);
    },
    extractData: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/files/extract`, {
            method: 'POST',
            body: formData
        }).then(handleResponse);
    },
    importStudents: (data) => fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),
    getCompleteness: (classId, semester, schoolYear) => {
        const query = { classId };
        if (semester) query.semester = semester;
        if (schoolYear) query.schoolYear = schoolYear;
        const params = new URLSearchParams(query).toString();
        return fetch(`${API_BASE}/${STORAGE_KEYS.GRADE_COMPLETENESS}?${params}`).then(handleResponse);
    }
};

export const MockApi = api;
