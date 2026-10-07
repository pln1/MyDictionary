const auth = {
    modal: document.getElementById('auth-modal'),
    form: document.getElementById('auth-form'),
    title: document.getElementById('modal-title'),
    errorMsg: document.getElementById('auth-error'),
    toggleLink: document.getElementById('auth-toggle-link'),
    isLoginMode: true,

    init() {
        document.getElementById('btn-login-modal').addEventListener('click', () => this.openModal(true));
        document.getElementById('btn-register-modal').addEventListener('click', () => this.openModal(false));
        document.querySelector('.close-btn').addEventListener('click', () => this.closeModal());
        
        document.getElementById('link-login-prompt').addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal(true);
        });

        this.toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal(!this.isLoginMode);
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    },

    openModal(isLogin) {
        this.isLoginMode = isLogin;
        this.title.textContent = isLogin ? 'Log In' : 'Sign Up';
        this.errorMsg.textContent = '';
        this.form.reset();
        
        let confirmField = document.getElementById('auth-password-confirm');
        if (!isLogin && !confirmField) {
            confirmField = document.createElement('input');
            confirmField.type = 'password';
            confirmField.id = 'auth-password-confirm';
            confirmField.placeholder = 'Confirm Password';
            confirmField.required = true;
            this.form.insertBefore(confirmField, this.errorMsg);
        } else if (isLogin && confirmField) {
            confirmField.remove();
        }

        document.getElementById('auth-submit').textContent = isLogin ? 'Log In' : 'Sign Up';
        this.toggleLink.textContent = isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In";
        this.modal.classList.remove('hidden');
    },

    closeModal() {
        this.modal.classList.add('hidden');
    },

    async handleSubmit(e) {
        e.preventDefault();
        this.errorMsg.textContent = '';
        const user = document.getElementById('auth-username').value;
        const pass = document.getElementById('auth-password').value;

        try {
            if (this.isLoginMode) {
                await api.login(user, pass);
            } else {
                const passConfirm = document.getElementById('auth-password-confirm').value;
                if (pass !== passConfirm) throw new Error('Passwords do not match');
                await api.register(user, pass, passConfirm);
            }
            this.closeModal();
            window.dispatchEvent(new Event('login-success'));
        } catch (err) {
            this.errorMsg.textContent = err.message || 'Authentication failed';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => auth.init());