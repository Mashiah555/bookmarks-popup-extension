document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('bookmarks-container');
    const searchBox = document.getElementById('search-box');

    // We store the "root" nodes in memory so we can restore them
    // quickly when the user clears the search box.
    let bookmarksBarContent = [];
    let flatBookmarksList = [];

    // 1. Load specifically the "Bookmarks Bar" (ID '1')
    chrome.bookmarks.getSubTree('1', function (results) {
        if (chrome.runtime.lastError || !results || !results.length) {
            container.textContent = "Could not load bookmarks.";
            return;
        }

        // results[0] is the "Bookmarks Bar" folder itself.
        // We want its children (the actual items inside).
        bookmarksBarContent = results[0].children;

        // Render the tree starting directly from the contents
        renderTree(bookmarksBarContent, container);

        // Create a flat index for searching
        flattenBookmarks(bookmarksBarContent);
    });

    // 2. Search Listener
    searchBox.addEventListener('input', function (e) {
        const query = e.target.value.toLowerCase();
        container.innerHTML = ''; // Clear current view

        if (query.trim() === '') {
            // Restore the original folder view
            renderTree(bookmarksBarContent, container);
        } else {
            // Filter the flat list and show matches
            const matches = flatBookmarksList.filter(b => b.title && b.title.toLowerCase().includes(query));

            if (matches.length === 0) {
                const noResult = document.createElement('div');
                noResult.textContent = "No results found.";
                noResult.style.padding = "10px";
                noResult.style.color = "#888";
                container.appendChild(noResult);
            } else {
                matches.forEach(node => renderBookmark(node, container));
            }
        }
    });

    // Helper: Flatten tree for search
    function flattenBookmarks(nodes) {
        if (!nodes) return;
        for (let node of nodes) {
            if (node.children) {
                flattenBookmarks(node.children);
            } else if (node.url) {
                flatBookmarksList.push(node);
            }
        }
    }
});

// 3. Render Functions (unchanged logic, just organizing)
function renderTree(nodes, parentElement) {
    if (!nodes) return;
    for (let node of nodes) {
        if (node.children) {
            renderFolder(node, parentElement);
        } else if (node.url) {
            renderBookmark(node, parentElement);
        }
    }
}

function renderFolder(node, parentElement) {
    const header = document.createElement('div');
    header.className = 'folder-header';
    header.setAttribute('dir', 'auto');

    const arrow = document.createElement('span');
    arrow.textContent = '▶';
    arrow.className = 'arrow';
    header.appendChild(arrow);

    // Folder Icon
    const icon = document.createTextNode(' \uD83D\uDCC1 ');
    header.appendChild(icon);

    const title = document.createTextNode(node.title);
    header.appendChild(title);

    parentElement.appendChild(header);

    const content = document.createElement('div');
    content.className = 'folder-content';
    parentElement.appendChild(content);

    // Recurse
    renderTree(node.children, content);

    // Toggle Click
    header.addEventListener('click', function () {
        header.classList.toggle('folder-open');
        if (header.classList.contains('folder-open')) {
            arrow.style.transform = 'rotate(90deg)';
        } else {
            arrow.style.transform = 'rotate(0deg)';
        }
        // Toggle visibility of the content div immediately following the header
        const contentDiv = header.nextElementSibling;
        if (contentDiv) {
            contentDiv.style.display = header.classList.contains('folder-open') ? 'block' : 'none';
        }
    });
}

function renderBookmark(node, parentElement) {
    const link = document.createElement('a');
    link.href = node.url;
    link.className = 'bookmark-item';
    link.target = "_blank";
    link.setAttribute('dir', 'auto');

    // Favicon
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}`;
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.className = 'favicon';

    const textSpan = document.createElement('span');
    textSpan.textContent = node.title || node.url;
    textSpan.className = 'bookmark-text';

    link.appendChild(img);
    link.appendChild(textSpan);
    parentElement.appendChild(link);
}