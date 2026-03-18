
export const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher'
};

const DEFAULT_USER = {
    id: 'admin-1',
    email: 'admin@notenmeister.ch',
    full_name: 'Admin Lokal',
    role: ROLES.ADMIN
};

// Simplified: No real auth, just a UI role toggle
export const getAuthUser = () => {
    const user = localStorage.getItem('nm_ui_role');
    return user ? JSON.parse(user) : DEFAULT_USER;
};

export const switchRole = (role) => {
    localStorage.setItem('nm_ui_role', JSON.stringify({ ...DEFAULT_USER, role }));
    window.dispatchEvent(new Event('auth-change'));
};

export const logout = () => {
    // No-op in local version
};
