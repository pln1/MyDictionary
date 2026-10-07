const app = {
    currentUser: null,

    async init() {
        this.bindEvents();
        await this.checkAuth();
    },

    bindEvents() {
        document.getElementById('nav-home').addEventListener('click', () => this.showView('translator'));
        document.getElementById('btn-dashboard').addEventListener('click', () => {
            this.showView('dashboard');
            dashboard.loadTopics();
        });
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());
        window.addEventListener('auth-expired', () => this.logout());
        window.addEventListener('login-success', () => this.checkAuth());
    },

    async checkAuth() {
        const { access } = api.getTokens();
        if (access) {
            try {
                this.currentUser = await api.getMe();
                this.updateUI(true);
            } catch (err) {
                this.logout();
            }
        } else {
            this.updateUI(false);
        }
    },

    updateUI(isLoggedIn) {
        const authMenu = document.getElementById('auth-menu');
        const userMenu = document.getElementById('user-menu');
        const userNameDisplay = document.getElementById('user-name-display');

        if (isLoggedIn) {
            authMenu.classList.add('hidden');
            userMenu.classList.remove('hidden');
            userNameDisplay.textContent = this.currentUser.username;
            translator.setAuthState(true);
        } else {
            authMenu.classList.remove('hidden');
            userMenu.classList.add('hidden');
            translator.setAuthState(false);
            this.showView('translator');
        }
    },

    logout() {
        api.clearTokens();
        this.currentUser = null;
        this.updateUI(false);
    },

    showView(viewName) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    translator.init();
    dashboard.init();
});