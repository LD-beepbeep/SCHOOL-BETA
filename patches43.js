/* ================================================================
   StudentOS — patches43.js
   1.  Settings inline profile — keep the settings-embedded profile
       editor in sync with profile state (avatar, emoji, name).
   2.  Font Awesome brands preload — ensure FA webfont files are
       fetched early so brand icons render on first paint.
   ================================================================ */

(function _p43_init() {

    /* ── Helpers ────────────────────────────────────────── */
    function _p43dbG(key, fallback) {
        try {
            var v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch (_) { return fallback; }
    }

    function _p43safeIconClass(raw) {
        return (raw || '').replace(/[^a-zA-Z0-9\- ]/g, '');
    }

    /* Poll until a condition is met (like patches42's _p42waitFor) */
    function _p43waitFor(fn, interval, maxWait) {
        interval = interval || 80;
        maxWait  = maxWait  || 5000;
        var elapsed = 0;
        var id = setInterval(function() {
            elapsed += interval;
            if (fn() || elapsed >= maxWait) clearInterval(id);
        }, interval);
    }

    /* ================================================================
       1.  SETTINGS INLINE PROFILE SYNC
       ================================================================ */

    /*
     * Whenever the settings modal opens, sync the inline profile
     * editor to match the current profile data (avatar preview,
     * selected emoji, name input).
     */
    _p43waitFor(function() {
        if (typeof window.openModal !== 'function') return false;
        if (window._p43modalHooked) return true;
        window._p43modalHooked = true;

        var _origOpen = window.openModal;
        window.openModal = function(id) {
            _origOpen.apply(this, arguments);
            if (id === 'modal-settings') {
                _p43syncSettingsProfile();
            }
        };
        return true;
    });

    /* Sync the inline profile editor inside settings */
    function _p43syncSettingsProfile() {
        var profile = _p43dbG('os_profile', { type: 'emoji', emoji: '🎓', bg: '#3b82f6' });
        var name    = _p43dbG('os_student_name', '');

        /* Name input */
        var nameInp = document.getElementById('student-name-input');
        if (nameInp && name) nameInp.value = name;

        /* Avatar preview */
        var ap = document.getElementById('settings-avatar-preview');
        if (ap) {
            var emoji = profile.emoji || '🎓';
            var bg    = profile.bg || profile.avatarBg || '#3b82f6';

            if (profile.type === 'image' && profile.img) {
                ap.innerHTML = '<img src="' + profile.img + '" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">';
                ap.style.background = '';
            } else if (typeof emoji === 'string' && emoji.indexOf('__fa:') === 0) {
                var iconClass = _p43safeIconClass(emoji.slice(5));
                ap.innerHTML = '';
                var icon = document.createElement('i');
                icon.className = iconClass + ' text-2xl text-white';
                icon.setAttribute('aria-hidden', 'true');
                ap.appendChild(icon);
                ap.style.background = bg;
            } else {
                ap.textContent = emoji;
                ap.style.background = bg;
                ap.style.fontSize = '1.6rem';
            }
        }

        /* Highlight selected emoji */
        var grid = document.getElementById('settings-emoji-grid');
        if (grid) {
            var currentEmoji = profile.emoji || '🎓';
            grid.querySelectorAll('.emoji-opt').forEach(function(opt) {
                opt.classList.toggle('selected', opt.textContent.trim() === currentEmoji);
            });
        }
    }

    /* Also update settings avatar when profile changes */
    _p43waitFor(function() {
        if (typeof window.renderProfileDisplay !== 'function') return false;
        if (window._p43renderHooked) return true;
        window._p43renderHooked = true;

        var _origRender = window.renderProfileDisplay;
        window.renderProfileDisplay = function() {
            _origRender.apply(this, arguments);
            /* Also update the settings inline avatar */
            _p43syncSettingsProfile();
        };
        return true;
    });

    /* ================================================================
       2.  FONT AWESOME BRANDS — EARLY WEBFONT FETCH
       ================================================================ */

    /*
     * Font Awesome loads webfonts lazily — the CSS is fetched first,
     * then the browser downloads the .woff2 files only when an icon
     * is first painted.  Pre-fetching the brands font file ensures
     * fa-brands icons render on first paint without a blank flash.
     *
     * We do this by creating a hidden element with fa-brands class,
     * which forces the browser to request the brands webfont early.
     */
    (function _prefetchFaBrands() {
        var probe = document.createElement('i');
        probe.className = 'fa-brands fa-font-awesome';
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;';
        document.body.appendChild(probe);
        /* Remove after fonts have had time to load */
        setTimeout(function() {
            if (probe.parentNode) probe.parentNode.removeChild(probe);
        }, 5000);
    })();

})();
