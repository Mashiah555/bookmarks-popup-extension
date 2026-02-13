document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('bookmarks-container');
    const searchBox = document.getElementById('search-box');

    // Define defaults in case user hasn't visited options yet
    const defaults = {
        theme: 'system',
        language: 'en',
        viewMode: 'tree',
        openNewTab: true
    };

    // 1. Fetch Settings FIRST
    chrome.storage.sync.get(defaults, (settings) => {
        applySettings(settings); // Apply theme, language, etc.
        loadBookmarks(settings); // Pass settings to render logic
    });

    // UI Locals for Search
    const uiStrings = {
        en: { search: "Search bookmarks...", noResult: "No results found." },
        he: { search: "חפש סימניות...", noResult: "לא נמצאו תוצאות." }
    };

    function applySettings(settings) {
        const html = document.documentElement;
        const body = document.body;

        // A. Language / Direction
        html.lang = settings.language;
        html.dir = settings.language === 'he' ? 'rtl' : 'ltr';
        searchBox.placeholder = uiStrings[settings.language].search;

        // B. Theme
        body.className = ''; // Reset
        if (settings.theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('theme-dark');
            } else {
                body.classList.add('theme-light');
            }
        } else {
            body.classList.add(`theme-${settings.theme}`);
        }

        // C. View Mode (Add class to container)
        container.className = `view-${settings.viewMode}`;
    }

    function loadBookmarks(settings) {
        let flatBookmarksList = [];
        let bookmarksBarContent = [];

        // Load "Bookmarks Bar" (ID '1')
        chrome.bookmarks.getSubTree('1', function (results) {
            if (!results || !results.length) return;
            bookmarksBarContent = results[0].children;

            // Render with user settings
            renderTree(bookmarksBarContent, container, settings);
            flattenBookmarks(bookmarksBarContent);
        });

        // Search Listener
        searchBox.addEventListener('input', function (e) {
            const query = e.target.value.toLowerCase();
            container.innerHTML = '';

            if (query.trim() === '') {
                renderTree(bookmarksBarContent, container, settings);
            } else {
                const matches = flatBookmarksList.filter(b => b.title && b.title.toLowerCase().includes(query));
                if (matches.length === 0) {
                    container.textContent = uiStrings[settings.language].noResult;
                } else {
                    matches.forEach(node => renderBookmark(node, container, settings));
                }
            }
        });

        function flattenBookmarks(nodes) {
            if (!nodes) return;
            for (let node of nodes) {
                if (node.children) flattenBookmarks(node.children);
                else if (node.url) flatBookmarksList.push(node);
            }
        }
    }
});

// Render Functions
function renderTree(nodes, parentElement, settings) {
    if (!nodes) return;
    for (let node of nodes) {
        if (node.children) {
            renderFolder(node, parentElement, settings);
        } else if (node.url) {
            renderBookmark(node, parentElement, settings);
        }
    }
}

function renderFolder(node, parentElement, settings) {
    const wrapper = document.createElement('div');
    wrapper.className = 'node-wrapper';

    const header = document.createElement('div');
    header.className = 'folder-header';

    const arrow = document.createElement('span');
    arrow.textContent = settings.language === 'he' ? '◀' : '▶';
    arrow.className = 'arrow';

    const icon = document.createTextNode(' \uD83D\uDCC1 ');
    const title = document.createTextNode(node.title);

    header.appendChild(arrow);
    header.appendChild(icon);
    header.appendChild(title);
    wrapper.appendChild(header);

    const content = document.createElement('div');
    content.className = 'folder-content';
    wrapper.appendChild(content);

    parentElement.appendChild(wrapper);

    renderTree(node.children, content, settings);

    header.addEventListener('click', function () {
        header.classList.toggle('folder-open');
        const isOpen = header.classList.contains('folder-open');

        // Rotate Arrow logic
        if (isOpen) arrow.style.transform = 'rotate(90deg)';
        else arrow.style.transform = 'rotate(0deg)';

        content.style.display = isOpen ? 'block' : 'none';
    });
}

function renderBookmark(node, parentElement, settings) {
    const link = document.createElement('a');
    link.href = node.url;
    link.className = 'bookmark-item';
    // Apply "Open in New Tab" setting
    link.target = settings.openNewTab ? "_blank" : "_self";

    // Tooltip Text
    link.title = `${node.title}\n${node.url}`;

    // Favicon
    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}&sz=32`;
    img.className = 'favicon';

    // Text Label
    const textSpan = document.createElement('span');
    textSpan.textContent = node.title || node.url;
    textSpan.className = 'bookmark-text';

    link.appendChild(img);
    link.appendChild(textSpan);
    parentElement.appendChild(link);
}