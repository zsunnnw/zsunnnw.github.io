(() => {
    const storageKey = 'site-theme';
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    let preference;

    try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === 'light' || saved === 'dark') preference = saved;
    } catch {
        // The theme still works when browser storage is unavailable.
    }

    const currentTheme = () => preference || (systemTheme.matches ? 'dark' : 'light');
    const applyTheme = () => {
        const isDark = currentTheme() === 'dark';
        document.documentElement.dataset.theme = currentTheme();
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(isDark));
        toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        toggle.hidden = false;
    };

    applyTheme();
    systemTheme.addEventListener('change', applyTheme);

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('theme-toggle');
        applyTheme();
        toggle.addEventListener('click', () => {
            preference = currentTheme() === 'dark' ? 'light' : 'dark';
            try {
                window.localStorage.setItem(storageKey, preference);
            } catch {
                // Keep the selection for the current page.
            }
            applyTheme();
        });
    });
})();
