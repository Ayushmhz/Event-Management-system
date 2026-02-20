const API_BASE = ''; // Same origin

async function apiFetch(endpoint, options = {}) {
    let token = localStorage.getItem('token');
    const headers = { ...options.headers };

    // If body is not FormData, default to JSON
    // If body IS FormData, do NOT set Content-Type header manually, let browser set boundary
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        if (options.body && typeof options.body !== 'string') {
            options.body = JSON.stringify(options.body);
        }
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Check if response is empty (204 No Content)
        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Attempt to read text if not JSON
            const text = await response.text();
            // If response is not ok, we still want to throw with the text content if possible
            if (!response.ok) {
                throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
            }
            // If ok but not json, return text logic or throw? 
            // For this app, backend should always return JSON except maybe for files/images which we don't fetch this way usually.
            // Let's assume it's an error if we expected JSON.
            throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 50)}...`);
        }

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (err) {
        console.error('API Fetch Error:', err);
        throw err;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    // Ensure toast has base class + type + show
    toast.className = `toast toast-${type} show`;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function checkAuth(roleRequired = null) {
    const user = getUser();
    const token = localStorage.getItem('token');

    if (!token || !user) {
        window.location.href = 'auth.html';
        return null;
    }

    if (roleRequired && user.role !== roleRequired) {
        window.location.href = 'dashboard.html';
        return null;
    }

    return user;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
