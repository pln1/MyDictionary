function getSelectedText() {
    let text = "";
    if (window.getSelection) {
        text = window.getSelection().toString().trim();
    }
    return text;
}

document.addEventListener('mouseup', function (event) {
    if (event.target.id === 'vocab-builder-btn') {
        return;
    }

    setTimeout(() => {
        const highlightedText = getSelectedText();

        if (highlightedText.length > 0) {
            const selection = window.getSelection();
            if (!selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                createTranslationButton(rect, highlightedText);
            }
        } else {
            removeTranslationButton();
        }
    }, 10);
});

document.addEventListener('mousedown', function (event) {
    if (event.target.id !== 'dict-builder-btn') {
        removeTranslationButton();
    }
});

function createTranslationButton(rect, text) {
    let existingButton = document.getElementById('dict-builder-btn');
    if (!existingButton) {
        existingButton = document.createElement('div');
        existingButton.id = 'dict-builder-btn';
        existingButton.textContent = 'Translate';
        
        existingButton.addEventListener('click', function () {
            alert(`Send "${text}" to translator`);
            removeTranslationButton();
        });

        document.body.appendChild(existingButton);
    }

    existingButton.style.top = `${rect.top + window.scrollY - 30}px`;
    existingButton.style.left = `${rect.right + window.scrollX - 20}px`;
}


function removeTranslationButton() {
    const button = document.getElementById('dict-builder-btn');
    if (button) {
        button.remove();
    }
}