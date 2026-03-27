document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('bookmarks-container');
    const searchBox = document.getElementById('search-box');

    // Context Menu Elements
    const contextMenu = document.getElementById('context-menu');
    const cmEdit = document.getElementById('cm-edit');
    const cmDelete = document.getElementById('cm-delete');
    const cmColorWrapper = document.getElementById('cm-color-wrapper');
    const cmColorPicker = document.getElementById('cm-color-picker');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editTitle = document.getElementById('edit-title');
    const editUrl = document.getElementById('edit-url');
    const modalSave = document.getElementById('modal-save');
    const modalCancel = document.getElementById('modal-cancel');

    let activeNode = null; // Stores the node being right-clicked

    const defaults = {
        theme: 'system', language: 'en', viewMode: 'tree', openNewTab: true,
        folderColors: {} // Initialize empty object for colors
    };

    chrome.storage.sync.get(defaults, (settings) => {
        applySettings(settings);
        loadBookmarks(settings);
    });

    // ==========================================
    // CONTEXT MENU & MODAL LOGIC
    // ==========================================

    // Hide context menu when clicking anywhere else
    document.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });

    function showContextMenu(e, node, isFolder) {
        e.preventDefault(); // Stop default Chrome right-click menu
        activeNode = node;

        // Position the menu at mouse coordinates
        contextMenu.style.left = `${Math.min(e.clientX, document.body.clientWidth - 150)}px`;
        contextMenu.style.top = `${Math.min(e.clientY, document.body.clientHeight - 100)}px`;
        contextMenu.classList.remove('hidden');

        // Show/Hide color picker based on if it's a folder
        if (isFolder) {
            cmColorWrapper.style.display = 'flex';
            chrome.storage.sync.get(defaults, (settings) => {
                cmColorPicker.value = settings.folderColors[node.id] || '#888888';
            });
        } else {
            cmColorWrapper.style.display = 'none';
        }
    }

    // Action: Delete
    cmDelete.addEventListener('click', () => {
        if (!activeNode) return;
        if (confirm(`Are you sure you want to delete "${activeNode.title}"?`)) {
            if (activeNode.children) {
                chrome.bookmarks.removeTree(activeNode.id, reloadPopup);
            } else {
                chrome.bookmarks.remove(activeNode.id, reloadPopup);
            }
        }
    });

    // Action: Edit/Rename
    cmEdit.addEventListener('click', () => {
        if (!activeNode) return;
        editTitle.value = activeNode.title;
        editUrl.value = activeNode.url || '';
        editUrl.style.display = activeNode.children ? 'none' : 'block'; // Hide URL for folders
        editModal.classList.remove('hidden');
    });

    // Action: Change Folder Color
    cmColorPicker.addEventListener('input', (e) => {
        if (!activeNode || !activeNode.children) return;
        const newColor = e.target.value;

        chrome.storage.sync.get(defaults, (settings) => {
            settings.folderColors[activeNode.id] = newColor;
            chrome.storage.sync.set({ folderColors: settings.folderColors }, reloadPopup);
        });
    });

    // Modal Actions
    modalCancel.addEventListener('click', () => editModal.classList.add('hidden'));

    modalSave.addEventListener('click', () => {
        const updates = { title: editTitle.value };
        if (!activeNode.children) updates.url = editUrl.value;

        chrome.bookmarks.update(activeNode.id, updates, () => {
            editModal.classList.add('hidden');
            reloadPopup();
        });
    });

    function reloadPopup() {
        window.location.reload(); // Quickest way to refresh the state after an edit
    }


    // ==========================================
    // CORE RENDERING LOGIC (Updated for Context Menu)
    // ==========================================

    const uiStrings = {
        en: { search: "Search bookmarks...", noResult: "No results found." },
        he: { search: "חפש סימניות...", noResult: "לא נמצאו תוצאות." }
    };

    function applySettings(settings) {
        const html = document.documentElement;
        const body = document.body;
        html.lang = settings.language;
        html.dir = settings.language === 'he' ? 'rtl' : 'ltr';
        searchBox.placeholder = uiStrings[settings.language].search;

        body.classList.remove('theme-light', 'theme-dark', 'theme-system', 'view-tree', 'view-grid');
        if (settings.theme === 'system') {
            body.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${settings.theme}`);
        }
        body.classList.add(`view-${settings.viewMode}`);
    }

    function loadBookmarks(settings) {
        let flatBookmarksList = [];
        let bookmarksBarContent = [];

        chrome.bookmarks.getSubTree('1', function (results) {
            if (!results || !results.length) return;
            bookmarksBarContent = results[0].children;
            renderTree(bookmarksBarContent, container, settings);
            flattenBookmarks(bookmarksBarContent);
        });

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

        // ATTACH CONTEXT MENU TO FOLDER
        header.addEventListener('contextmenu', (e) => showContextMenu(e, node, true));

        const arrow = document.createElement('span');
        arrow.textContent = settings.language === 'he' ? '◀' : '▶';
        arrow.className = 'arrow';

        // NEW: colorable SVG Folder Icon instead of Emoji
        const folderColor = settings.folderColors[node.id] || (document.body.classList.contains('theme-dark') ? '#9aa0a6' : '#5f6368');
        const iconSpan = document.createElement('span');
        iconSpan.style.marginRight = "6px";
        iconSpan.style.display = "flex";
        iconSpan.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${folderColor}"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;

        const title = document.createTextNode(node.title);

        header.appendChild(arrow);
        header.appendChild(iconSpan);
        header.appendChild(title);
        wrapper.appendChild(header);

        const content = document.createElement('div');
        content.className = 'folder-content';
        wrapper.appendChild(content);

        parentElement.appendChild(wrapper);

        renderTree(node.children, content, settings);

        header.addEventListener('click', function (e) {
            if (e.target.closest('#context-menu')) return; // Don't trigger if clicking menu
            header.classList.toggle('folder-open');
        });
    }

    function renderBookmark(node, parentElement, settings) {
        const link = document.createElement('a');
        link.href = node.url;
        link.className = 'bookmark-item';
        link.title = `${node.title}\n${node.url}`;

        // ATTACH CONTEXT MENU TO BOOKMARK
        link.addEventListener('contextmenu', (e) => showContextMenu(e, node, false));

        link.addEventListener('click', function (event) {
            event.preventDefault();
            if (settings.openNewTab) chrome.tabs.create({ url: node.url });
            else chrome.tabs.update({ url: node.url });
            window.close();
        });

        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}&sz=32`;
        img.className = 'favicon';

        const textSpan = document.createElement('span');
        textSpan.textContent = node.title || node.url;
        textSpan.className = 'bookmark-text';

        link.appendChild(img);
        link.appendChild(textSpan);
        parentElement.appendChild(link);
    }
});