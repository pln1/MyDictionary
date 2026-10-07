const DictAPI = {
    async getSettings() {
        return await chrome.storage.local.get(['jwt_token', 'refresh_token', 'source_lang', 'target_lang']);
    },

    async refreshAccessToken() {
        const data = await chrome.storage.local.get(['refresh_token']);
        const refreshToken = data.refresh_token;

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH_REFRESH}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (!response.ok) {
            await chrome.storage.local.remove(['jwt_token', 'refresh_token']);
            throw new Error('Refresh token expired');
        }

        const tokens = await response.json();
        const newAccess = tokens.access;
        const newRefresh = tokens.refresh || refreshToken;

        await chrome.storage.local.set({
            jwt_token: newAccess,
            refresh_token: newRefresh
        });

        return newAccess;
    },

    async authFetch(url, options = {}) {
        let { jwt_token } = await this.getSettings();

        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt_token}`
        };

        let response = await fetch(url, options);

        if (response.status === 401) {
            try {
                const refreshedToken = await this.refreshAccessToken();
                options.headers['Authorization'] = `Bearer ${refreshedToken}`;
                response = await fetch(url, options);
            } catch (err) {
                throw new Error('Session expired, please login again.');
            }
        }

        return response;
    },

    async translate(text, sourceLang, targetLang) {
        const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TRANSLATE}`;
        const response = await this.authFetch(url, {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                source_lang: sourceLang,
                target_lang: targetLang
            })
        });

        if (!response.ok) {
            throw new Error(`Translation error: ${response.status}`);
        }

        return await response.json();
    },

    async saveUnit(text, translation, sourceLang, targetLang) {
        const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.UNITS}`;
        const response = await this.authFetch(url, {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                translation: translation,
                source_lang: sourceLang,
                target_lang: targetLang
            })
        });
        if (response.status === 409) {
            const err = new Error('Already saved');
            err.status = 409;
            throw err;
        }
        if (!response.ok) {
            throw new Error(`Save error: ${response.status}`);
        }

        return await response.json();
    }
};