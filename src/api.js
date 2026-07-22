import { getApiBaseUrl } from './config';

async function request(endpoint, options = {}) {
    const baseUrl = await getApiBaseUrl();
    const userId = localStorage.getItem('broom_user_id');

    const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId || '',
        ...options.headers,
    };

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/setup';
            return;
        }

        if (response.status === 409) return await response.json();
        if (response.status === 423) throw { status: 423, message: "Vacation Mode attiva" };

        if (!response.ok) {
            const error = await response.json();
            throw { status: response.status, ...error };
        }

        return await response.json();
    } catch (err) {
        if (!err.status && !options._isRetry) {
            await new Promise(r => setTimeout(r, 1500));
            return request(endpoint, { ...options, _isRetry: true });
        }
        throw err;
    }
}

export const api = {
    // Tasks
    getDueTasks: () => request('/api/tasks/due'),
    getTasks: () => request('/api/tasks'),
    createTask: (data) => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    updateTask: (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
    completeTask: (id, theoretical) => request(`/api/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ use_theoretical_date: theoretical })
    }),
    completeOnDemand: (id) => request(`/api/tasks/${id}/complete-ondemand`, { method: 'POST' }),
    undoComplete: (id) => request(`/api/tasks/${id}/complete`, { method: 'DELETE' }),
    resetTest: () => request('/api/tasks/reset-test', { method: 'POST' }),
    generateTestData: () => request('/api/tasks/generate-test-data', { method: 'POST' }),

    // Rooms
    getRooms: () => request('/api/rooms'),
    createRoom: (data) => request('/api/rooms', { method: 'POST', body: JSON.stringify(data) }),
    updateRoom: (id, data) => request(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRoom: (id, force = false) => request(`/api/rooms/${id}?force=${force}`, { method: 'DELETE' }),

    // Stats
    getStats: () => request('/api/stats/leaderboard'),
    getHistory: (days = 30) => request(`/api/stats/history?days=${days}`),
    deleteHistoryItem: (id) => request(`/api/stats/history/${id}`, { method: 'DELETE' }),

    // Settings & Setup
    getSettings: () => request('/api/settings'),
    getPreferences: () => request('/api/settings'),
    patchPreferences: (data) => request('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    getWidgets: () => request('/api/settings/widgets'),
    patchWidgets: (data) => request('/api/settings/widgets', { method: 'PATCH', body: JSON.stringify(data) }),
    getScoring: () => request('/api/settings/scoring'),
    patchScoring: (data) => request('/api/settings/scoring', { method: 'PATCH', body: JSON.stringify(data) }),
    renameUser: (id, name) => request(`/api/users/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    toggleVacation: (active) => request('/api/settings/vacation', {
        method: 'PATCH',
        body: JSON.stringify({ active })
    }),
    verifySetup: (user_id, token) => request(`/api/setup/verify?user_id=${user_id}&token=${token}`, {
        method: 'POST'
    }),
};
