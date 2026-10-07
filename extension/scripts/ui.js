const DictUI = {
    autoCloseTimer: null,

    removeButton() {
        const btn = document.getElementById('dict-builder-btn');
        if (btn) btn.remove();
    },

    removeCard() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
        const card = document.getElementById('dict-popup-card');
        if (card) card.remove();
    },

    createButton(rect, onClick) {
        this.removeButton();

        const btn = document.createElement('div');
        btn.id = 'dict-builder-btn';
        btn.textContent = 'Translate';

        btn.style.top = `${rect.top + window.scrollY - CONFIG.UI.TRIGGER_BTN_OFFSET_TOP}px`;
        btn.style.left = `${rect.right + window.scrollX - CONFIG.UI.TRIGGER_BTN_OFFSET_LEFT}px`;

        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeButton();
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            onClick();
        });

        document.body.appendChild(btn);
    },

    createCard(rect, originalText, sourceLang, targetLang, onSaveClick) {
        this.removeCard();

        const card = document.createElement('div');
        card.id = 'dict-popup-card';
        card.style.top = `${rect.bottom + window.scrollY + CONFIG.UI.POPUP_CARD_OFFSET_TOP}px`;
        card.style.left = `${Math.max(CONFIG.UI.MIN_SCREEN_LEFT_MARGIN, rect.left + window.scrollX - CONFIG.UI.POPUP_CARD_OFFSET_LEFT)}px`;

        const header = document.createElement('div');
        header.className = 'dict-card-header';

        const langsSpan = document.createElement('span');
        langsSpan.className = 'dict-card-langs';
        langsSpan.textContent = `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'dict-card-close';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeCard();
        });

        header.appendChild(langsSpan);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'dict-card-body';

        const colOriginal = document.createElement('div');
        colOriginal.className = 'dict-card-col';
        const labelOrig = document.createElement('div');
        labelOrig.className = 'dict-card-label';
        labelOrig.textContent = sourceLang.toUpperCase();
        const textOrig = document.createElement('div');
        textOrig.className = 'dict-card-text';
        textOrig.textContent = originalText;
        colOriginal.appendChild(labelOrig);
        colOriginal.appendChild(textOrig);

        const colTranslated = document.createElement('div');
        colTranslated.className = 'dict-card-col';
        const labelTrans = document.createElement('div');
        labelTrans.className = 'dict-card-label';
        labelTrans.textContent = targetLang.toUpperCase();
        const textTrans = document.createElement('div');
        textTrans.className = 'dict-card-text';
        textTrans.id = 'dict-trans-text';
        textTrans.textContent = 'Translating...';
        colTranslated.appendChild(labelTrans);
        colTranslated.appendChild(textTrans);

        body.appendChild(colOriginal);
        body.appendChild(colTranslated);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'dict-card-save-btn';
        saveBtn.id = 'dict-save-btn';
        saveBtn.textContent = 'Save';
        saveBtn.disabled = true;

        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onSaveClick(saveBtn);
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(saveBtn);

        document.body.appendChild(card);

        this.autoCloseTimer = setTimeout(() => {
            this.removeCard();
        }, CONFIG.TIMERS.AUTO_CLOSE_MS);
    },

    setTranslatedText(text, isSaved = false) {
        const transElem = document.getElementById('dict-trans-text');
        const saveBtn = document.getElementById('dict-save-btn');
        if (transElem) {
            transElem.style.color = '';
            transElem.textContent = text;
        }
        if (saveBtn) {
            if (isSaved) {
                saveBtn.textContent = 'Already in Saved';
                saveBtn.disabled = true;
                saveBtn.style.background = '#6c757d';
                saveBtn.style.cursor = 'default';
            } else {
                saveBtn.textContent = 'Save';
                saveBtn.disabled = false;
                saveBtn.style.background = '';
                saveBtn.style.cursor = 'pointer';
            }
        }
    },

    showWarning(message) {
        const transElem = document.getElementById('dict-trans-text');
        const saveBtn = document.getElementById('dict-save-btn');
        if (transElem) {
            transElem.style.color = '#e67e22';
            transElem.textContent = message;
        }
        if (saveBtn) saveBtn.disabled = true;
    },

    showError(message) {
        const transElem = document.getElementById('dict-trans-text');
        const saveBtn = document.getElementById('dict-save-btn');
        if (transElem) {
            transElem.style.color = '#dc3545';
            transElem.textContent = message;
        }
        if (saveBtn) saveBtn.disabled = true;
    }
};