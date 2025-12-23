document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    function getCookie(name) {
        const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return v ? decodeURIComponent(v.pop()) : null;
    }

    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days || 30) * 24 * 60 * 60 * 1000);
        document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/';
    }

    const savedTheme = getCookie('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            setCookie('theme', newTheme, 365);
        });
    }

    const searchbox = document.getElementById('searchbox');
    if (searchbox) {
        let suggestionTimeout;
        let suggestionsContainer;
        const MAX_HISTORY = 10;

        function getSearchHistory() {
            try {
                return JSON.parse(localStorage.getItem('searchHistory') || '[]');
            } catch (e) {
                return [];
            }
        }

        function saveSearchHistory(query) {
            if (!query || query.trim().length === 0) return;
            query = query.trim();
            let history = getSearchHistory();
            history = history.filter(function(h) { return h !== query; });
            history.unshift(query);
            if (history.length > MAX_HISTORY) {
                history = history.slice(0, MAX_HISTORY);
            }
            localStorage.setItem('searchHistory', JSON.stringify(history));
        }

        function clearSearchHistory() {
            localStorage.removeItem('searchHistory');
        }

        function createSuggestionsContainer() {
            if (!suggestionsContainer) {
                suggestionsContainer = document.createElement('div');
                suggestionsContainer.className = 'suggestions-container';
                suggestionsContainer.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 0 0 12px 12px;
                    max-height: 300px;
                    overflow-y: auto;
                    z-index: 1001;
                    display: none;
                `;
                searchbox.parentElement.style.position = 'relative';
                searchbox.parentElement.appendChild(suggestionsContainer);
            }
            return suggestionsContainer;
        }

        function showSearchHistory() {
            const history = getSearchHistory();
            const container = createSuggestionsContainer();
            
            if (history.length === 0) {
                container.style.display = 'none';
                return;
            }

            let html = '<div class="history-header" style="padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">';
            html += '<span style="font-size: 0.85rem; color: var(--text-secondary);">検索履歴</span>';
            html += '<button id="clearHistoryBtn" style="font-size: 0.75rem; color: var(--text-secondary); background: none; border: none; cursor: pointer; padding: 4px 8px;">クリア</button>';
            html += '</div>';

            html += history.map(function(h) {
                return '<div class="history-item" style="padding: 12px 16px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 10px;">' +
                    '<span style="color: var(--text-secondary);">🕐</span>' +
                    '<span>' + escapeHtml(h) + '</span>' +
                    '</div>';
            }).join('');

            container.innerHTML = html;
            container.style.display = 'block';

            var clearBtn = document.getElementById('clearHistoryBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    clearSearchHistory();
                    container.style.display = 'none';
                });
            }

            container.querySelectorAll('.history-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var text = this.querySelector('span:last-child').textContent;
                    searchbox.value = text;
                    container.style.display = 'none';
                    searchbox.form.submit();
                });

                item.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255, 255, 255, 0.1)';
                });

                item.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
            });
        }

        function showSuggestions(suggestions) {
            const container = createSuggestionsContainer();
            if (suggestions.length === 0) {
                container.style.display = 'none';
                return;
            }

            container.innerHTML = suggestions.map(function(s) {
                return '<div class="suggestion-item" style="padding: 12px 16px; cursor: pointer; transition: background 0.2s;">' + escapeHtml(s) + '</div>';
            }).join('');

            container.style.display = 'block';

            container.querySelectorAll('.suggestion-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    searchbox.value = this.textContent;
                    container.style.display = 'none';
                    searchbox.form.submit();
                });

                item.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255, 255, 255, 0.1)';
                });

                item.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        searchbox.addEventListener('focus', function() {
            if (this.value.trim().length === 0) {
                showSearchHistory();
            }
        });

        searchbox.addEventListener('click', function() {
            if (this.value.trim().length === 0) {
                showSearchHistory();
            }
        });

        searchbox.addEventListener('input', function() {
            clearTimeout(suggestionTimeout);
            const query = this.value.trim();

            if (query.length === 0) {
                showSearchHistory();
                return;
            }

            if (query.length < 2) {
                if (suggestionsContainer) {
                    suggestionsContainer.style.display = 'none';
                }
                return;
            }

            suggestionTimeout = setTimeout(function() {
                fetch('/suggest?keyword=' + encodeURIComponent(query))
                    .then(function(res) { return res.json(); })
                    .then(showSuggestions)
                    .catch(function() {
                        if (suggestionsContainer) {
                            suggestionsContainer.style.display = 'none';
                        }
                    });
            }, 300);
        });

        searchbox.form.addEventListener('submit', function() {
            const query = searchbox.value.trim();
            if (query.length > 0) {
                saveSearchHistory(query);
            }
        });

        document.addEventListener('click', function(e) {
            if (suggestionsContainer && !searchbox.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }
});
