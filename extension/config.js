const CONFIG = {
    API: {
        BASE_URL: 'http://127.0.0.1:8000/api',
        ENDPOINTS: {
            TRANSLATE: '/translate/',
            UNITS: '/units/',
            AUTH_TOKEN: '/auth/token/',
            AUTH_REFRESH: '/auth/token/refresh/'
        }
    },
    LIMITS: {
        MIN_CHAR_COUNT: 1,
        MAX_CHAR_COUNT: 600,
        MAX_WORD_COUNT: 50
    },
    TIMERS: {
        AUTO_CLOSE_MS: 20000,
        SUCCESS_CLOSE_MS: 1200,
        SELECTION_DEBOUNCE_MS: 50
    },
    UI: {
        TRIGGER_BTN_OFFSET_TOP: 34,
        TRIGGER_BTN_OFFSET_LEFT: 10,
        POPUP_CARD_OFFSET_TOP: 8,
        POPUP_CARD_OFFSET_LEFT: 20,
        MIN_SCREEN_LEFT_MARGIN: 10
    },
    DEFAULTS: {
        SOURCE_LANG: 'en',
        TARGET_LANG: 'uk'
    }
};