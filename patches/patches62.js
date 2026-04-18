/* ================================================================
   StudentOS — patches62.js

   1.  WHITEBOARD SETTINGS — inject under Appearance tab
       patches59/60/61 removed all previous whiteboard settings
       sections from the tabbed settings view.  This patch adds
       them back under #p10-page-appearance with a unique id
       (p62-wb-section) that is not affected by earlier removal
       logic.  Syncs with os_wb_default_bg / os_wb_grid_default
       and with the colour swatches already present in the legacy
       modal's Appearance row.

   2.  ROUTINE — robust recurring-render fix
       The recurring feature saves data correctly (patches41) but
       the patching chain for p16_renderRoutine can result in
       patches20's improved UI not being refreshed after a save.
       This patch wraps p16_renderRoutine so that it ALWAYS calls
       window._p20_renderRoutine() when available, regardless of
       which earlier patch last replaced the function.
   ================================================================ */

(function _p62_init() {
    'use strict';

    /* ── helpers ─────────────────────────────────────────────── */
    function _wait(fn, interval, maxWait) {
        interval = interval || 100;
        maxWait  = maxWait  || 20000;
        var elapsed = 0;
        (function _try() {
            if (fn()) return;
            elapsed += interval;
            if (elapsed < maxWait) setTimeout(_try, interval);
        })();
    }

    function _db(key, def) {
        try {
            if (typeof DB !== 'undefined' && DB && typeof DB.get === 'function')
                return DB.get(key, def);
            var v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : def;
        } catch (_) { return def; }
    }

    function _dbSet(key, val) {
        try {
            if (typeof DB !== 'undefined' && DB && typeof DB.set === 'function')
                return DB.set(key, val);
            localStorage.setItem(key, JSON.stringify(val));
        } catch (_) {}
    }

    /* ================================================================
       1.  WHITEBOARD SETTINGS IN APPEARANCE TAB
       ================================================================ */
    function _injectWhiteboardSettings() {
        var appPage = document.getElementById('p10-page-appearance');
        if (!appPage) return false;
        if (document.getElementById('p62-wb-section')) return true;

        /* ── section wrapper ─────────────────────────────────── */
        var sec = document.createElement('div');
        sec.id        = 'p62-wb-section';
        sec.className = 'p10-section';

        var title = document.createElement('div');
        title.className   = 'p10-section-title';
        title.textContent = 'Whiteboard';
        sec.appendChild(title);

        /* ── Default background row ──────────────────────────── */
        var bgRow   = document.createElement('div');
        bgRow.className = 'p10-row';

        var bgLeft  = document.createElement('div');
        bgLeft.innerHTML =
            '<div class="p10-row-lbl">Default Background</div>' +
            '<div class="p10-row-sub">Colour for new boards</div>';

        var bgRight = document.createElement('div');
        bgRight.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:6px;';

        var PRESETS = ['#1a1a1a', '#0f172a', '#ffffff', '#fef9ef', '#1e3a5f', '#14532d'];

        var bgPicker      = document.createElement('input');
        bgPicker.type     = 'color';
        bgPicker.id       = 'p62-wb-bg-picker';
        bgPicker.value    = _db('os_wb_default_bg', '#1a1a1a');
        bgPicker.title    = 'Custom colour';
        bgPicker.style.cssText =
            'width:22px;height:22px;border-radius:50%;padding:0;cursor:pointer;' +
            'border:2px solid rgba(255,255,255,.2);flex-shrink:0;';
        bgPicker.addEventListener('change', function() {
            _dbSet('os_wb_default_bg', bgPicker.value);
            _syncBgPickers(bgPicker.value);
        });

        PRESETS.forEach(function(hex) {
            var btn = document.createElement('button');
            btn.type  = 'button';
            btn.title = hex;
            btn.style.cssText =
                'width:22px;height:22px;border-radius:50%;background:' + hex +
                ';border:2px solid rgba(255,255,255,.2);cursor:pointer;' +
                'flex-shrink:0;transition:transform .15s;';
            btn.addEventListener('mouseenter', function() { btn.style.transform = 'scale(1.15)'; });
            btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
            btn.addEventListener('click', function() {
                _dbSet('os_wb_default_bg', hex);
                bgPicker.value = hex;
                _syncBgPickers(hex);
                if (typeof window.wbSetBg === 'function') window.wbSetBg(hex);
            });
            bgRight.appendChild(btn);
        });
        bgRight.appendChild(bgPicker);

        bgRow.appendChild(bgLeft);
        bgRow.appendChild(bgRight);
        sec.appendChild(bgRow);

        /* ── Grid-on-by-default row ──────────────────────────── */
        var gridRow   = document.createElement('div');
        gridRow.className = 'p10-row';

        var gridLeft  = document.createElement('div');
        gridLeft.innerHTML = '<div class="p10-row-lbl">Grid Lines by Default</div>';

        var gridBtn   = document.createElement('button');
        gridBtn.type      = 'button';
        gridBtn.id        = 'p62-wb-grid-toggle';
        gridBtn.className = 'p46-toggle' + (_db('os_wb_grid_default', false) ? ' on' : '');
        var dot = document.createElement('div');
        dot.className = 'p46-toggle-dot';
        gridBtn.appendChild(dot);
        gridBtn.addEventListener('click', function() {
            var next = !gridBtn.classList.contains('on');
            gridBtn.classList.toggle('on', next);
            _dbSet('os_wb_grid_default', next);
            _syncGridToggles(next);
            if (typeof window.wbGridOn !== 'undefined' &&
                window.wbGridOn !== next &&
                typeof window.wbToggleGrid === 'function') {
                window.wbToggleGrid();
            }
        });

        gridRow.appendChild(gridLeft);
        gridRow.appendChild(gridBtn);
        sec.appendChild(gridRow);

        appPage.appendChild(sec);
        return true;
    }

    /* Sync value to other wb pickers/toggles that may exist */
    function _syncBgPickers(hex) {
        ['wb-default-bg-picker', 'p46-wb-default-bg', 'p53-wb-bg-picker'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = hex;
        });
        /* Inline script function */
        if (typeof window._setWbDefaultBg === 'function') window._setWbDefaultBg(hex);
    }

    function _syncGridToggles(on) {
        /* Legacy modal toggle (from inline script) */
        var t1  = document.getElementById('wb-grid-default-toggle');
        var d1  = document.getElementById('wb-grid-default-dot');
        if (t1) t1.style.background = on ? 'var(--accent)' : '';
        if (d1) d1.style.transform  = on ? 'translateX(24px)' : '';
        /* patches46 toggle */
        var p46 = document.getElementById('p46-wb-grid-toggle');
        if (p46) p46.classList.toggle('on', on);
    }

    /* Sync p62 controls when settings page is opened */
    function _syncP62Controls() {
        var hex = _db('os_wb_default_bg', '#1a1a1a');
        var on  = _db('os_wb_grid_default', false);
        var bp  = document.getElementById('p62-wb-bg-picker');
        var gt  = document.getElementById('p62-wb-grid-toggle');
        if (bp) bp.value = hex;
        if (gt) gt.classList.toggle('on', !!on);
    }

    /* Run injection once the appearance page exists */
    _wait(_injectWhiteboardSettings, 200, 20000);

    /* Hook openModal so settings are always in sync */
    _wait(function() {
        if (typeof window.openModal !== 'function') return false;
        if (window._p62modalHooked) return true;
        window._p62modalHooked = true;
        var _prev = window.openModal;
        window.openModal = function(id) {
            _prev.apply(this, arguments);
            if (id === 'modal-settings') setTimeout(_syncP62Controls, 80);
        };
        return true;
    });

    /* Also hook switchTab to sync when entering the settings tab */
    _wait(function() {
        if (typeof window.switchTab !== 'function') return false;
        if (window._p62stHooked) return true;
        window._p62stHooked = true;
        var _prevSt = window.switchTab;
        window.switchTab = function(name) {
            _prevSt.apply(this, arguments);
            if (name === 'settings') setTimeout(_syncP62Controls, 200);
        };
        return true;
    });

    /* ================================================================
       2.  ROUTINE RECURRING — robust render fix
           The recurring feature saves data correctly (patches41) but
           the patching chain for p16_renderRoutine can result in
           patches20's improved UI not being refreshed after a save.
           This patch installs a final wrapper 4 s after page load,
           by which time patches16–41 have all settled, so this wrap
           is the last one applied and cannot be silently replaced.
       ================================================================ */
    function _installRecurringFix() {
        if (window._p62rrWrapped) return;
        if (typeof window.p16_renderRoutine !== 'function') return;
        window._p62rrWrapped = true;

        var _prevRR = window.p16_renderRoutine;
        window.p16_renderRoutine = function() {
            _prevRR.apply(this, arguments);
            /* Ensure patches20's UI is refreshed so recurring blocks
               appear on all their selected days. */
            setTimeout(function() {
                if (typeof window._p20_renderRoutine === 'function') {
                    window._p20_renderRoutine();
                }
            }, 60);
        };
    }

    /* Also ensure the save path always updates the p20 view. */
    function _installSaveFix() {
        if (window._p62saveWrapped) return;
        if (typeof window.p16_saveRoutine !== 'function') return;
        window._p62saveWrapped = true;

        var _prevSave = window.p16_saveRoutine;
        window.p16_saveRoutine = function() {
            _prevSave.apply(this, arguments);
            /* Belt-and-braces: always refresh p20 UI after any save */
            setTimeout(function() {
                if (typeof window._p20_renderRoutine === 'function') {
                    window._p20_renderRoutine();
                }
            }, 200);
        };
    }

    /* Install wrappers at 4 s so all earlier patch chains (p16–p41)
       have settled and our wraps become the final layer. */
    setTimeout(function() {
        _installRecurringFix();
        _installSaveFix();
    }, 4000);

    console.log('[patches62] loaded — whiteboard settings in Appearance, routine recurring render fix');
})();
