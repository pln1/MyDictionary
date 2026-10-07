const translator = {
    sourceLang: document.getElementById('trans-source-lang'),
    targetLang: document.getElementById('trans-target-lang'),
    input: document.getElementById('trans-input'),
    output: document.getElementById('trans-output'),
    saveBtn: document.getElementById('btn-save-translation'),
    translateBtn: document.getElementById('btn-translate'),
    authPrompt: document.getElementById('trans-auth-prompt'),
    langError: document.getElementById('lang-error'),
    swapBtn: document.getElementById('btn-swap-langs'),
    currentTranslationData: null,
    typingTimer: null,
    doneTypingInterval: 600,

    init() {
        this.translateBtn.addEventListener('click', () => this.handleTranslate());
        this.saveBtn.addEventListener('click', () => this.handleSave());
        
        this.sourceLang.addEventListener('change', () => {
            this.validateLangs();
            if (this.input.value.trim()) this.handleTranslate();
        });
        
        this.targetLang.addEventListener('change', () => {
            this.validateLangs();
            if (this.input.value.trim()) this.handleTranslate();
        });
        
        this.input.addEventListener('input', () => {
            clearTimeout(this.typingTimer);
            if (this.input.value.trim() === '') {
                this.output.value = '';
                this.currentTranslationData = null;
                this.resetSaveButton();
            } else {
                this.typingTimer = setTimeout(() => {
                    if (!this.translateBtn.disabled) this.handleTranslate();
                }, this.doneTypingInterval);
            }
        });

        this.swapBtn.addEventListener('click', () => {
            const tempLang = this.sourceLang.value;
            this.sourceLang.value = this.targetLang.value;
            this.targetLang.value = tempLang;
            
            if (this.currentTranslationData && this.output.value !== 'Translating...' && this.output.value !== 'Error during translation.') {
                this.input.value = this.output.value;
            }
            
            this.output.value = '';
            this.currentTranslationData = null;
            this.validateLangs();
            
            if (this.input.value.trim() && !this.translateBtn.disabled) {
                this.handleTranslate();
            } else {
                this.resetSaveButton();
            }
        });
        
        this.validateLangs();
    },

    validateLangs() {
        if (this.sourceLang.value === this.targetLang.value) {
            this.langError.classList.remove('hidden');
            this.translateBtn.disabled = true;
            this.translateBtn.style.opacity = '0.5';
            this.translateBtn.style.cursor = 'not-allowed';
        } else {
            this.langError.classList.add('hidden');
            this.translateBtn.disabled = false;
            this.translateBtn.style.opacity = '1';
            this.translateBtn.style.cursor = 'pointer';
        }
    },

    setAuthState(isLoggedIn) {
        if (isLoggedIn) {
            this.authPrompt.classList.add('hidden');
            this.saveBtn.classList.remove('hidden');
        } else {
            this.authPrompt.classList.remove('hidden');
            this.saveBtn.classList.add('hidden');
        }
        this.resetSaveButton();
    },

    async handleTranslate() {
        const text = this.input.value.trim();
        if (!text) {
            this.output.value = '';
            this.currentTranslationData = null;
            this.resetSaveButton();
            return;
        }
        
        this.output.value = 'Translating...';
        this.resetSaveButton();

        try {
            const res = await api.translate(text, this.sourceLang.value, this.targetLang.value);
            this.output.value = res.translation;
            this.currentTranslationData = res;

            if (res.is_saved) {
                this.setSaveButtonState('Already Saved', true);
            }
        } catch (err) {
            this.output.value = 'Error during translation.';
        }
    },

    async handleSave() {
        if (!this.currentTranslationData || !this.input.value.trim()) return;
        
        this.saveBtn.textContent = 'Saving...';
        this.saveBtn.disabled = true;

        try {
            const res = await api.saveUnit({
                text: this.currentTranslationData.text,
                translation: this.currentTranslationData.translation,
                source_lang: this.currentTranslationData.source_lang,
                target_lang: this.currentTranslationData.target_lang
            });

            if (res.status === 409) {
                this.setSaveButtonState('Already Saved', true);
            } else {
                this.setSaveButtonState('Saved!', true);
            }
        } catch (err) {
            this.setSaveButtonState('Save Failed', false);
        }
    },

    resetSaveButton() {
        this.saveBtn.textContent = 'Save to Dictionary';
        this.saveBtn.disabled = false;
        this.saveBtn.style.background = '';
    },

    setSaveButtonState(text, disabled) {
        this.saveBtn.textContent = text;
        this.saveBtn.disabled = disabled;
        if (disabled) {
            this.saveBtn.style.background = '#ccc';
        }
    }
};