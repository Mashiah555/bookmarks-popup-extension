// Default settings
const defaults = {
    theme: 'system',
    language: 'en',
    viewMode: 'tree',
    openNewTab: true
};

// Load settings when options page opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(defaults, (items) => {
        document.getElementById('theme').value = items.theme;
        document.getElementById('language').value = items.language;
        document.getElementById('viewMode').value = items.viewMode;
        document.getElementById('openNewTab').checked = items.openNewTab;
    });
});

// Save settings when button clicked
document.getElementById('save').addEventListener('click', () => {
    const settings = {
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value,
        viewMode: document.getElementById('viewMode').value,
        openNewTab: document.getElementById('openNewTab').checked
    };

    chrome.storage.sync.set(settings, () => {
        // Show "Saved!" message
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => { status.textContent = ''; }, 1500);
    });
});