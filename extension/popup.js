document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const settingsSection = document.getElementById('settings-section');
    const errorMsg = document.getElementById('error-msg');
    const statusMsg = document.getElementById('status-msg');
    const langErrorMsg = document.getElementById('lang-error-msg');
    const saveBtn = document.getElementById('save-btn');

    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');

    // Загрузка сохраненных настроек
    chrome.storage.local.get(['jwt_token', 'source_lang', 'target_lang'], (result) => {
        if (result.jwt_token) {
            showSettings(result.source_lang || 'en', result.target_lang || 'ru');
        }
    });

    // Функция проверки языков на совпадение
    function validateLanguages() {
        if (sourceLangSelect.value === targetLangSelect.value) {
            // Если языки одинаковые
            if (langErrorMsg) langErrorMsg.style.display = 'block';
            
            saveBtn.disabled = true; // Отключаем функционал клика
            saveBtn.style.background = '#ccc'; // Делаем кнопку серой
            saveBtn.style.cursor = 'not-allowed'; // Меняем курсор
            saveBtn.style.transform = 'none';
        } else {
            // Если языки разные
            if (langErrorMsg) langErrorMsg.style.display = 'none';
            
            saveBtn.disabled = false; // Включаем клик
            saveBtn.style.background = 'linear-gradient(135deg, #FF7B00, #FFC300)'; // Возвращаем градиент
            saveBtn.style.cursor = 'pointer';
        }
    }

    // Слушаем изменения в обоих списках
    sourceLangSelect.addEventListener('change', validateLanguages);
    targetLangSelect.addEventListener('change', validateLanguages);

    document.getElementById('login-btn').addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        errorMsg.style.display = 'none';

        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                chrome.storage.local.set({ 'jwt_token': data.access }, () => {
                    showSettings('en', 'ru');
                });
            } else {
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            errorMsg.textContent = 'Server is offline';
            errorMsg.style.display = 'block';
        }
    });

    document.getElementById('save-btn').addEventListener('click', () => {
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        chrome.storage.local.set({ 'source_lang': sourceLang, 'target_lang': targetLang }, () => {
            statusMsg.style.display = 'block';
            setTimeout(() => statusMsg.style.display = 'none', 2000);
        });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        chrome.storage.local.remove('jwt_token', () => {
            loginSection.classList.remove('hidden');
            settingsSection.classList.add('hidden');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        });
    });

    function showSettings(source, target) {
        loginSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
        sourceLangSelect.value = source;
        targetLangSelect.value = target;
        validateLanguages(); // Проверяем сразу при отрисовке
    }
});