const CONFIG = {
    BASE_URL: 'http://localhost:8000/api'
};

const api = {
    getTokens() {
        return {
            access: localStorage.getItem('access_token'),
            refresh: localStorage.getItem('refresh_token')
        };
    },

    setTokens(access, refresh) {
        if (access) localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    async authFetch(endpoint, options = {}) {
        let { access } = this.getTokens();
        const headers = {
            'Content-Type': 'application/json',
            ...(access ? { 'Authorization': `Bearer ${access}` } : {}),
            ...(options.headers || {})
        };
        let response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, { ...options, headers });

        if (response.status === 401 && access) {
            const { refresh } = this.getTokens();
            if (refresh) {
                const refreshRes = await fetch(`${CONFIG.BASE_URL}/auth/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    this.setTokens(data.access, data.refresh || refresh);
                    headers['Authorization'] = `Bearer ${data.access}`;
                    response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, { ...options, headers });
                } else {
                    this.clearTokens();
                    window.dispatchEvent(new Event('auth-expired'));
                }
            }
        }
        return response;
    },

    async login(username, password) {
        const res = await fetch(`${CONFIG.BASE_URL}/auth/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json();
        this.setTokens(data.access, data.refresh);
    },

    async register(username, password, password_confirm) {
        const res = await fetch(`${CONFIG.BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, password_confirm })
        });
        if (!res.ok) throw new Error('Registration failed');
        const data = await res.json();
        this.setTokens(data.tokens.access, data.tokens.refresh);
    },

    async getMe() {
        const res = await this.authFetch('/auth/me/');
        if (!res.ok) throw new Error('Failed to fetch profile');
        return await res.json();
    },

    async translate(text, source_lang, target_lang) {
        const res = await this.authFetch('/translate/', {
            method: 'POST',
            body: JSON.stringify({ text, source_lang, target_lang })
        });
        if (!res.ok) throw new Error('Translation failed');
        return await res.json();
    },

    async saveUnit(data) {
        const res = await this.authFetch('/units/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.status === 409) return { status: 409 };
        if (!res.ok) throw new Error('Failed to save unit');
        return await res.json();
    },

    async getTopics() {
        const res = await this.authFetch('/topics/');
        return await res.json();
    },

    async createTopic(name) {
        const res = await this.authFetch('/topics/', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        return await res.json();
    },

    async renameTopic(id, name) {
        const res = await this.authFetch(`/topics/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error('Failed to rename topic');
    },

    async deleteTopic(id) {
        await this.authFetch(`/topics/${id}/`, { method: 'DELETE' });
    },

    async reorderTopics(positions) {
        await this.authFetch('/topics/reorder/', {
            method: 'POST',
            body: JSON.stringify({ positions })
        });
    },

    async getUnits(topicId = null, pageUrl = null) {
        let url = pageUrl;
        if (!url) {
            url = topicId && topicId !== 'saved' ? `/units/?topic_id=${topicId}` : `/units/`;
        } else {
            url = url.replace(CONFIG.BASE_URL, '');
        }
        const res = await this.authFetch(url);
        return await res.json();
    },

    async toggleUnitState(id) {
        const res = await this.authFetch(`/units/${id}/toggle_state/`, { method: 'PATCH' });
        return await res.json();
    },
    
    async deleteUnit(id) {
        await this.authFetch(`/units/${id}/`, { method: 'DELETE' });
    },

    async removeUnitFromTopic(unitId, topicId) {
        await this.authFetch(`/units/${unitId}/remove_from_topic/`, {
            method: 'POST',
            body: JSON.stringify({ topic_id: topicId })
        });
    },

    async setUnitTopics(unitId, topicIds) {
        await this.authFetch(`/units/${unitId}/set_topics/`, {
            method: 'POST',
            body: JSON.stringify({ topic_ids: topicIds })
        });
    },

    async reorderUnits(topicId, positions) {
        await this.authFetch('/units/reorder_in_topic/', {
            method: 'POST',
            body: JSON.stringify({ topic_id: topicId, positions })
        });
    }
};