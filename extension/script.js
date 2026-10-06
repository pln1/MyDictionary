function getSelectedText() {
    return window.getSelection ? window.getSelection().toString().trim() : "";
}

document.addEventListener('mousedown', function (event) {
    const card = document.getElementById('dict-popup-card');
    const triggerBtn = document.getElementById('dict-builder-btn');

    if (card && !card.contains(event.target)) {
        DictUI.removeCard();
    }
    if (triggerBtn && !triggerBtn.contains(event.target)) {
        DictUI.removeButton();
    }
});

document.addEventListener('mouseup', function (event) {
    if (event.target.closest('#dict-builder-btn') || event.target.closest('#dict-popup-card')) {
        return;
    }

    setTimeout(() => {
        const text = getSelectedText();
        const selection = window.getSelection();

        if (text.length >= CONFIG.LIMITS.MIN_CHAR_COUNT && selection && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            DictUI.createButton(rect, () => handleTranslateWorkflow(rect, text));
        } else {
            DictUI.removeButton();
        }
    }, CONFIG.TIMERS.SELECTION_DEBOUNCE_MS);
});

async function handleTranslateWorkflow(rect, originalText) {
    const settings = await DictAPI.getSettings();
    const token = settings.jwt_token;
    const sourceLang = settings.source_lang || CONFIG.DEFAULTS.SOURCE_LANG;
    const targetLang = settings.target_lang || CONFIG.DEFAULTS.TARGET_LANG;

    if (!token) {
        alert('Please sign in via the MyDictionary extension popup.');
        return;
    }

    let currentTranslation = '';

    DictUI.createCard(rect, originalText, sourceLang, targetLang, async (saveBtn) => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            await DictAPI.saveUnit(originalText, currentTranslation, sourceLang, targetLang, token);
            saveBtn.textContent = 'Saved';
            saveBtn.style.background = '#28a745';
            setTimeout(() => DictUI.removeCard(), CONFIG.TIMERS.SUCCESS_CLOSE_MS);
        } catch (error) {
            saveBtn.textContent = 'Save failed';
            saveBtn.style.background = '#dc3545';
        }
    });

    const wordCount = originalText.split(/\s+/).length;
    if (originalText.length > CONFIG.LIMITS.MAX_CHAR_COUNT || wordCount > CONFIG.LIMITS.MAX_WORD_COUNT) {
        DictUI.showWarning(`Text too long (max ${CONFIG.LIMITS.MAX_CHAR_COUNT} chars)`);
        return;
    }

    try {
        const result = await DictAPI.translate(originalText, sourceLang, targetLang, token);
        currentTranslation = result.translation || originalText;
        DictUI.setTranslatedText(currentTranslation);
    } catch (error) {
        DictUI.showError('Translation error');
    }
}