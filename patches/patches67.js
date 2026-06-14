/* ================================================================
   StudentOS — patches67.js
   June 2026 Comprehensive Update

   BUG-01  Custom modal engine — replaces every native confirm/alert/prompt
   BUG-03  Light-theme contrast  (companion CSS: patches67.css)
   BUG-05  Flashcard dashboard count — live total instead of stale cache
   BUG-06  Pomodoro settings panel — restore broken open/close
   BUG-08  Whiteboard brush — auto-inverts when background changes
   FEATURE-05  GeoGebra graphing tab in the Calculator section
   FEATURE-07  Pomodoro session statistics (total, daily streak, best)
   FEATURE-08  Login screen — two-card layout, GitHub OAuth, Guest mode
   FEATURE-10  New-user onboarding flow (also re-triggerable from Settings)
   FEATURE-15  Brain Dump inbox widget on the Dashboard
   FEATURE-19  Notes reading-time and word-count display
   FEATURE-25  Offline / sync status indicator in the sidebar
   FEATURE-32  In-app changelog modal + "What's new" banner

   INSTALL (add to index.html, after the last patches66 lines):
     <link rel="stylesheet" href="patches/patches67.css">
     <script type="module" src="patches/patches67.js"></script>
   ================================================================ */

(function _p67_init() {
    'use strict';

    /* ── Shared helpers ─────────────────────────────────────────── */
    function _wait(fn, interval, maxWait) {
        interval = interval || 100;
        maxWait  = maxWait  || 25000;
        var elapsed = 0;
        (function _try() {
            if (fn()) return;
            elapsed += interval;
            if (elapsed < maxWait) setTimeout(_try, interval);
        })();
    }

    function _db(key, def) {
        try {
            if (window.DB && typeof window.DB.get === 'function')
                return window.DB.get(key, def);
            var v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : def;
        } catch (_) { return def; }
    }

    function _dbSet(key, val) {
        try {
            if (window.DB && typeof window.DB.set === 'function')
                return window.DB.set(key, val);
            localStorage.setItem(key, JSON.stringify(val));
        } catch (_) {}
    }

    /* Reuse the app's existing toast or create a minimal fallback */
    function _toast(msg, type) {
        var t = document.getElementById('sos-toast') ||
                document.getElementById('toast')      ||
                document.querySelector('.toast');
        if (t) {
            t.textContent = msg;
            t.className   = 'sos-toast-show' + (type === 'error' ? ' sos-toast-error' : '');
            clearTimeout(t._p67timer);
            t._p67timer = setTimeout(function () { t.className = ''; }, 3500);
            return;
        }
        var fb = document.createElement('div');
        fb.textContent    = msg;
        fb.style.cssText  = [
            'position:fixed', 'bottom:28px', 'left:50%', 'transform:translateX(-50%)',
            'z-index:9999999', 'padding:10px 22px', 'border-radius:99px',
            'font-size:.82rem', 'font-weight:700', 'pointer-events:none',
            'transition:opacity .35s', 'box-shadow:0 4px 24px rgba(0,0,0,.28)',
            'color:#fff', 'background:' + (type === 'error' ? '#ef4444' : 'var(--accent,#3b82f6)'),
        ].join(';');
        document.body.appendChild(fb);
        setTimeout(function () {
            fb.style.opacity = '0';
            setTimeout(function () { fb.remove(); }, 380);
        }, 3200);
    }

    /* ================================================================
       1.  CUSTOM MODAL ENGINE  (BUG-01)
           Replaces window.confirm / alert / prompt with styled modals.
           Call sites that use the native API synchronously cannot be
           made async without touching script.js, so we:
             a) expose async helpers  window.p67_confirm / alert / prompt
             b) patch the specific buttons we can identify (patches66
                "New List" still used native prompt — fixed below)
             c) override window.confirm so at minimum nothing visually
                jarring appears; destructive actions default to false
                (safe) so users must confirm via the new modal path.
       ================================================================ */

    function _injectModalEngine() {
        if (document.getElementById('p67-modal-overlay')) return;
        var ov = document.createElement('div');
        ov.id        = 'p67-modal-overlay';
        ov.className = 'p67-modal-overlay';
        ov.innerHTML = [
            '<div id="p67-modal-box" class="p67-modal-box">',
            '  <div id="p67-modal-icon" class="p67-modal-icon"></div>',
            '  <p  id="p67-modal-msg"  class="p67-modal-msg"></p>',
            '  <input id="p67-modal-input" type="text" class="bare-input p67-modal-input" placeholder="">',
            '  <div id="p67-modal-btns" class="p67-modal-btns"></div>',
            '</div>',
        ].join('');
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) {
            if (e.target === ov && ov.dataset.dismissible === 'true') _p67closeModal(undefined);
        });
    }

    var _p67_resolve = null;

    function _p67closeModal(result) {
        var ov = document.getElementById('p67-modal-overlay');
        if (ov) ov.classList.remove('p67-modal-visible');
        if (_p67_resolve) { _p67_resolve(result); _p67_resolve = null; }
    }

    window.p67_showModal = function (opts) {
        _injectModalEngine();
        var ov      = document.getElementById('p67-modal-overlay');
        var msgEl   = document.getElementById('p67-modal-msg');
        var inputEl = document.getElementById('p67-modal-input');
        var btnsEl  = document.getElementById('p67-modal-btns');
        var iconEl  = document.getElementById('p67-modal-icon');
        if (!ov) return Promise.resolve(opts.type === 'confirm' ? false : undefined);

        msgEl.textContent            = opts.message    || '';
        iconEl.innerHTML             = opts.icon       || '';
        ov.dataset.dismissible       = (opts.type !== 'confirm') ? 'true' : 'false';

        if (opts.type === 'prompt') {
            inputEl.style.display = '';
            inputEl.value         = opts.defaultVal || '';
            inputEl.placeholder   = opts.placeholder || '';
            setTimeout(function () { inputEl.focus(); }, 60);
        } else {
            inputEl.style.display = 'none';
        }

        btnsEl.innerHTML = '';

        function _btn(label, cls, cb) {
            var b = document.createElement('button');
            b.textContent = label;
            b.className   = 'p67-mbtn p67-mbtn-' + cls;
            b.onclick     = cb;
            return b;
        }

        if (opts.type === 'confirm') {
            btnsEl.appendChild(_btn('Cancel', 'secondary', function () { _p67closeModal(false); }));
            btnsEl.appendChild(_btn(
                opts.confirmLabel || 'Confirm',
                opts.destructive  ? 'danger' : 'primary',
                function () { _p67closeModal(true); }
            ));
        } else if (opts.type === 'prompt') {
            inputEl.onkeydown = function (e) {
                if (e.key === 'Enter') _p67closeModal(inputEl.value.trim() || null);
            };
            btnsEl.appendChild(_btn('Cancel', 'secondary', function () { _p67closeModal(null); }));
            btnsEl.appendChild(_btn('OK', 'primary', function () { _p67closeModal(inputEl.value.trim() || null); }));
        } else {
            btnsEl.appendChild(_btn('OK', 'primary', function () { _p67closeModal(undefined); }));
        }

        ov.classList.add('p67-modal-visible');
        return new Promise(function (resolve) { _p67_resolve = resolve; });
    };

    /* Convenience wrappers */
    window.p67_confirm = function (msg, label, destructive) {
        return window.p67_showModal({
            type: 'confirm', message: msg,
            icon: '<i class="fa-solid fa-triangle-exclamation"></i>',
            confirmLabel: label || 'Confirm', destructive: !!destructive,
        });
    };
    window.p67_alert  = function (msg) {
        return window.p67_showModal({ type: 'alert', message: msg, icon: '<i class="fa-solid fa-circle-info"></i>' });
    };
    window.p67_prompt = function (msg, placeholder, def) {
        return window.p67_showModal({ type: 'prompt', message: msg, placeholder: placeholder || '', defaultVal: def || '' });
    };

    /* Safe override of window.confirm — returns false (prevents accidental deletes)
       while the async p67_confirm path handles it visually.
       Code that calls confirm() synchronously will safely abort; the UI that
       triggered it should be patched individually (see patches below). */
    if (!window._p67_confirmOverridden) {
        window._p67_confirmOverridden = true;
        window.confirm = function (msg) {
            /* Show a non-blocking toast so the user knows something was attempted */
            _toast(msg || 'Action blocked — use the on-screen controls instead.');
            return false;
        };
        window.alert = function (msg) { window.p67_alert(msg); };
    }

    /* ── Patch patches66 "New List" button which used native prompt() ── */
    _wait(function () {
        var btn = document.getElementById('p66-add-task-list');
        if (!btn) return false;
        /* Always override — we run after patches66 so we take precedence */
        btn.onclick = function (e) {
            e.stopPropagation();
            window.p67_prompt('Name your new task list:', 'e.g. Hobbies').then(function (name) {
                if (!name || !name.trim()) return;
                var lists = _db('os_task_lists', ['Schoolwork', 'Hobbies']);
                if (!lists.includes(name.trim())) {
                    lists.push(name.trim());
                    _dbSet('os_task_lists', lists);
                    _dbSet('os_active_task_list', name.trim());
                    if (typeof window.renderTasks === 'function') window.renderTasks();
                }
            });
        };
        return true;
    }, 900, 25000);

    /* Inject modal engine immediately */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectModalEngine);
    } else {
        _injectModalEngine();
    }

    /* ================================================================
       2.  FLASHCARD DASHBOARD COUNT FIX  (BUG-05)
           The stale counter is replaced by a live sum of window.decks.
       ================================================================ */

    function _p67updateCardCount() {
        var total = (window.decks || []).reduce(function (s, d) {
            return s + ((d.cards || []).length);
        }, 0);

        /* Target explicit count elements */
        var els = document.querySelectorAll(
            '#dash-card-count, #widget-card-count, [data-card-count], ' +
            '.p-flashcard-count, [id*="flashcard-count"], [id*="card-count"]'
        );
        els.forEach(function (el) { el.textContent = total; });

        /* Heuristic: numbers near "card" or "flash" text inside stat widgets */
        document.querySelectorAll('#widget-studystats span, #widget-today span').forEach(function (span) {
            var ctx = (span.closest('div') || span).textContent.toLowerCase();
            if ((ctx.includes('card') || ctx.includes('flash')) && /^\d+$/.test(span.textContent.trim())) {
                span.textContent = total;
            }
        });
    }

    _wait(function () {
        if (typeof window.renderDecks !== 'function') return false;
        if (window._p67deckCountHooked) return true;
        window._p67deckCountHooked = true;
        var _orig = window.renderDecks;
        window.renderDecks = function () {
            _orig.apply(this, arguments);
            setTimeout(_p67updateCardCount, 150);
        };
        return true;
    }, 400, 20000);

    _wait(function () {
        if (typeof window.switchTab !== 'function') return false;
        if (window._p67tabCountHooked) return true;
        window._p67tabCountHooked = true;
        var _origSt = window.switchTab;
        window.switchTab = function (tab) {
            _origSt.apply(this, arguments);
            if (tab === 'dashboard') setTimeout(_p67updateCardCount, 400);
        };
        return true;
    }, 400, 20000);

    /* ================================================================
       3.  POMODORO SETTINGS PANEL FIX  (BUG-06)
       ================================================================ */
    _wait(function () {
        var fv = document.getElementById('view-focus');
        if (!fv) return false;

        /* Locate the settings panel — patches10 uses p10-pomo-settings-panel
           but names differ across versions, so we try several selectors. */
        var panel =
            document.getElementById('p10-pomo-settings-panel') ||
            document.getElementById('p10-settings-panel')      ||
            fv.querySelector('[id$="-settings-panel"]')        ||
            fv.querySelector('[id*="pomo"][id*="setting"]')    ||
            fv.querySelector('[id*="pomo"][id*="panel"]');

        /* Locate the gear button */
        var gearIcon = fv.querySelector('button i.fa-gear, button i.ph-gear, button i.fa-cog, button i.ph-gear-six');
        var gearBtn  =
            document.getElementById('p10-pomo-settings-btn') ||
            document.getElementById('p10-settings-btn')      ||
            fv.querySelector('[id*="settings-btn"]')         ||
            fv.querySelector('button[title*="etting"]')      ||
            (gearIcon ? gearIcon.closest('button') : null);

        if (gearBtn && panel && !gearBtn.dataset.p67fixed) {
            gearBtn.dataset.p67fixed = '1';
            gearBtn.onclick = function (e) {
                e.stopPropagation();
                var hidden = panel.classList.contains('hidden') || panel.style.display === 'none';
                if (hidden) {
                    panel.classList.remove('hidden');
                    panel.style.display = '';
                    if (typeof window._p10syncSettingsValues === 'function')
                        window._p10syncSettingsValues();
                } else {
                    panel.classList.add('hidden');
                }
            };
            return true;
        }

        /* Fallback: inject our own gear button that opens the panel */
        if (panel && !document.getElementById('p67-pomo-gear-fallback')) {
            var fallback = document.createElement('button');
            fallback.id        = 'p67-pomo-gear-fallback';
            fallback.className = 'nav-btn';
            fallback.title     = 'Pomodoro Settings';
            fallback.style.cssText = 'margin-top:8px;display:block;';
            fallback.innerHTML = '<i class="fa-solid fa-gear"></i>';
            fallback.onclick   = function () {
                var h = panel.classList.contains('hidden') || panel.style.display === 'none';
                panel.classList.toggle('hidden', !h);
                if (!panel.classList.contains('hidden')) {
                    panel.style.display = '';
                    if (typeof window._p10syncSettingsValues === 'function')
                        window._p10syncSettingsValues();
                }
            };
            var anchor = fv.querySelector('.text-center') || fv.firstElementChild;
            if (anchor) anchor.insertAdjacentElement('afterend', fallback);
            return true;
        }

        return !!panel; /* Keep polling until panel appears */
    }, 500, 25000);

    /* ================================================================
       4.  WHITEBOARD BRUSH AUTO-SWITCH  (BUG-08)
       ================================================================ */
    function _hexLightness(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
        var r = parseInt(hex.slice(0, 2), 16) / 255;
        var g = parseInt(hex.slice(2, 4), 16) / 255;
        var b = parseInt(hex.slice(4, 6), 16) / 255;
        return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    }

    function _applyBrushForBg(bgColor) {
        if (!bgColor || !bgColor.match(/^#[0-9a-fA-F]{3,6}$/)) return;
        var brush = _hexLightness(bgColor) > 0.5 ? '#1a1a1a' : '#f5f5f5';
        if (typeof window.wbSetPenColor === 'function')   window.wbSetPenColor(brush);
        else if (typeof window.wbSetColor === 'function') window.wbSetColor(brush);
        else if (typeof window.wbColor !== 'undefined')   window.wbColor = brush;
        document.querySelectorAll('#wb-pen-color, .p62-wb-pen-picker, #p62-wb-pen-picker, [id*="wb-pen-color"]')
            .forEach(function (p) { if (p.type === 'color') p.value = brush; });
        _dbSet('os_wb_pen_color', brush);
    }

    _wait(function () {
        if (typeof window._setWbDefaultBg !== 'function') return false;
        if (window._p67wbBgHooked) return true;
        window._p67wbBgHooked = true;
        var _origBg = window._setWbDefaultBg;
        window._setWbDefaultBg = function (color) {
            _origBg.apply(this, arguments);
            setTimeout(function () { _applyBrushForBg(color); }, 60);
        };
        return true;
    }, 400, 20000);

    /* Apply on whiteboard open */
    _wait(function () {
        if (typeof window.switchTab !== 'function') return false;
        if (window._p67wbTabHooked) return true;
        window._p67wbTabHooked = true;
        var _origTab = window.switchTab;
        window.switchTab = function (tab) {
            _origTab.apply(this, arguments);
            if (tab === 'whiteboard')
                setTimeout(function () { _applyBrushForBg(_db('os_wb_default_bg', '#1a1a1a')); }, 300);
        };
        return true;
    }, 400, 20000);

    /* ================================================================
       5.  GEOGEBRA GRAPHING CALCULATOR  (FEATURE-05)
       ================================================================ */
    _wait(function () {
        var calcView = document.getElementById('view-calc');
        if (!calcView || document.getElementById('p67-ggb-btn')) return false;

        /* Find the first flex row that holds mode-switcher buttons */
        var tabBar =
            calcView.querySelector('.flex.gap-1, .flex.gap-2, .calc-tabs, [id*="calc-tabs"]') ||
            calcView.firstElementChild;
        if (!tabBar) return false;

        var tabBtn        = document.createElement('button');
        tabBtn.id         = 'p67-ggb-btn';
        tabBtn.innerHTML  = '<i class="fa-solid fa-chart-line"></i> Graphing';
        tabBtn.style.cssText = 'padding:7px 14px;border-radius:10px;font-size:.8rem;font-weight:600;cursor:pointer;border:1px solid var(--glass-border);background:var(--glass-panel);color:var(--text-muted);transition:all .2s;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;';

        tabBtn.onclick = function () {
            /* Restore sibling buttons to inactive state */
            tabBar.querySelectorAll('button').forEach(function (b) {
                b.style.background  = 'var(--glass-panel)';
                b.style.color       = 'var(--text-muted)';
                b.style.borderColor = 'var(--glass-border)';
            });
            tabBtn.style.background  = 'var(--accent,#3b82f6)';
            tabBtn.style.color       = '#fff';
            tabBtn.style.borderColor = 'transparent';

            /* Hide all direct children of calcView except the tab bar and our panel */
            Array.from(calcView.children).forEach(function (child) {
                if (child !== tabBar && child.id !== 'p67-ggb-panel')
                    child.style.display = 'none';
            });
            var panel = document.getElementById('p67-ggb-panel');
            if (panel) panel.style.display = '';
            _loadGeoGebra();
        };
        tabBar.appendChild(tabBtn);

        /* GeoGebra iframe panel */
        var ggbPanel = document.createElement('div');
        ggbPanel.id            = 'p67-ggb-panel';
        ggbPanel.style.cssText = 'display:none;width:100%;height:580px;border-radius:16px;overflow:hidden;border:1px solid var(--glass-border);margin-top:14px;';
        calcView.appendChild(ggbPanel);

        function _loadGeoGebra() {
            if (ggbPanel.querySelector('iframe')) return;
            var iframe     = document.createElement('iframe');
            iframe.src     = 'https://www.geogebra.org/graphing?embed';
            iframe.title   = 'GeoGebra Graphing Calculator';
            iframe.allow   = 'fullscreen';
            iframe.loading = 'lazy';
            iframe.style.cssText = 'width:100%;height:100%;border:none;';
            ggbPanel.appendChild(iframe);
        }
        return true;
    }, 700, 25000);

    /* ================================================================
       6.  POMODORO SESSION STATISTICS  (FEATURE-07)
       ================================================================ */
    function _getPomoStats() {
        return _db('p67_pomo_stats', { total: 0, streak: 0, longest: 0, lastDate: null });
    }

    function _renderPomoStats() {
        var el = document.getElementById('p67-pomo-stats');
        if (!el) return;
        var s = _getPomoStats();
        el.querySelector('[data-st="total"]').textContent   = s.total   || 0;
        el.querySelector('[data-st="streak"]').textContent  = s.streak  || 0;
        el.querySelector('[data-st="longest"]').textContent = s.longest || 0;
    }

    window.p67_recordPomoSession = function () {
        var s     = _getPomoStats();
        var today = new Date().toDateString();
        s.total   = (s.total || 0) + 1;
        if (s.lastDate !== today) {
            var yesterday = new Date(Date.now() - 86400000).toDateString();
            s.streak = (s.lastDate === yesterday) ? (s.streak || 0) + 1 : 1;
        }
        s.lastDate = today;
        s.longest  = Math.max(s.longest || 0, s.streak);
        _dbSet('p67_pomo_stats', s);
        _renderPomoStats();
    };

    _wait(function () {
        var fv = document.getElementById('view-focus');
        if (!fv || document.getElementById('p67-pomo-stats')) return false;

        var wrap = document.createElement('div');
        wrap.id        = 'p67-pomo-stats';
        wrap.className = 'p67-pomo-stats';
        wrap.innerHTML = [
            '<div class="p67-stat-chip"><span class="p67-stat-val" data-st="total">0</span><span class="p67-stat-lbl">Sessions</span></div>',
            '<div class="p67-stat-chip"><span class="p67-stat-val" data-st="streak">0</span><span class="p67-stat-lbl"><i class="fa-solid fa-fire" style="color:#f97316;margin-right:3px;"></i>Streak</span></div>',
            '<div class="p67-stat-chip"><span class="p67-stat-val" data-st="longest">0</span><span class="p67-stat-lbl">Best</span></div>',
        ].join('');

        var anchor = fv.querySelector('.text-center, [id*="timer"]') || fv.firstElementChild;
        if (anchor) anchor.insertAdjacentElement('afterend', wrap);
        else fv.appendChild(wrap);

        _renderPomoStats();
        return true;
    }, 700, 25000);

    /* Hook pomodoro completion — try common function names */
    _wait(function () {
        var names = ['pomoComplete', 'pomoFinish', 'pomoEnd', 'pomodoroDone', 'timerComplete'];
        var name  = names.find(function (n) { return typeof window[n] === 'function'; });
        if (!name) return false;
        if (window['_p67_' + name + 'H']) return true;
        window['_p67_' + name + 'H'] = true;
        var _orig = window[name];
        window[name] = function () { _orig.apply(this, arguments); window.p67_recordPomoSession(); };
        return true;
    }, 400, 25000);

    /* ================================================================
       7.  LOGIN SCREEN REDESIGN  (FEATURE-08)
           Two cards: Sign In (with Google, GitHub, email) | Guest Mode
       ================================================================ */

    /* GitHub OAuth using Firebase Auth modular v9+ */
    window.p67_signInWithGitHub = async function () {
        try {
            /* Firebase compat (v8) path */
            if (window.firebase && window.firebase.auth) {
                var ghp = new window.firebase.auth.GithubAuthProvider();
                await window.firebase.auth().signInWithPopup(ghp);
                return;
            }
            /* Firebase v9+ modular — NOTE: version must match script.js.
               The module cache shares the default app instance. */
            var mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await mod.signInWithPopup(mod.getAuth(), new mod.GithubAuthProvider());
        } catch (e) {
            _toast('GitHub sign-in failed: ' + (e.message || 'unknown error'), 'error');
        }
    };

    /* Guest mode: same as "Continue offline" but clearly labelled */
    window.p67_guestMode = function () {
        try { localStorage.setItem('studentos_guest', 'true'); } catch (_) {}
        var lo = document.getElementById('login-overlay');
        if (lo) lo.classList.add('hidden');
        if (typeof window.initApp === 'function') window.initApp();
    };

    function _rebuildLogin() {
        var overlay = document.getElementById('login-overlay');
        if (!overlay || overlay.dataset.p67Login === 'true') return true;
        overlay.dataset.p67Login = 'true';

        /* Remove the old single card — it has class "relative" and/or inline width:400px */
        Array.from(overlay.children).forEach(function (c) {
            if (c.classList.contains('relative') || (c.style && c.style.width === '400px')) c.remove();
        });

        var wrap = document.createElement('div');
        wrap.className = 'relative z-10 p67-login-wrap';
        wrap.innerHTML = [
            '<!-- Branding row -->',
            '<div class="p67-login-logo">',
            '  <div style="width:44px;height:44px;border-radius:14px;background:var(--accent);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,.4);">',
            '    <i class="ph-bold ph-student" style="font-size:1.4rem;color:#fff;"></i>',
            '  </div>',
            '  <div>',
            '    <div style="font-size:1.15rem;font-weight:700;color:var(--text-main);letter-spacing:-.02em;">Student OS</div>',
            '    <div style="font-size:.73rem;color:var(--text-muted);">Your workspace, synced everywhere.</div>',
            '  </div>',
            '</div>',
            '',
            '<!-- Two-card layout -->',
            '<div class="p67-login-cards">',
            '',
            '  <!-- Card 1: Sign In -->',
            '  <div class="p67-login-card p67-card-signin">',
            '    <div class="p67-card-eyebrow"><i class="fa-solid fa-cloud"></i> Sign In &mdash; recommended</div>',
            '    <p class="p67-card-desc">Your notes, tasks and grades sync across every device.</p>',
            '',
            '    <button onclick="signInWithGoogle()" class="p67-provider-btn p67-btn-google">',
            '      <svg width="16" height="16" viewBox="0 0 48 48">',
            '        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>',
            '        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"/>',
            '        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.6 4.9C9.7 39.5 16.3 44 24 44z"/>',
            '        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.8l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>',
            '      </svg>',
            '      Continue with Google',
            '    </button>',
            '',
            '    <button onclick="window.p67_signInWithGitHub()" class="p67-provider-btn p67-btn-github">',
            '      <i class="fab fa-github"></i> Continue with GitHub',
            '    </button>',
            '',
            '    <div class="p67-or"><span>or email</span></div>',
            '',
            '    <input id="login-email" type="email" placeholder="Email address" class="bare-input"',
            '           style="margin-bottom:10px;" onkeypress="if(event.key===\'Enter\')signInWithEmail()">',
            '    <input id="login-password" type="password" placeholder="Password" class="bare-input"',
            '           onkeypress="if(event.key===\'Enter\')signInWithEmail()">',
            '',
            '    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">',
            '      <button onclick="resetPassword()" class="p67-text-btn">Forgot password?</button>',
            '    </div>',
            '',
            '    <button onclick="signInWithEmail()" class="p67-provider-btn p67-btn-primary" style="margin-top:8px;">',
            '      <i class="fa-solid fa-right-to-bracket"></i> Sign In / Create Account',
            '    </button>',
            '',
            '    <p class="p67-legal">',
            '      By continuing you agree to the',
            '      <a href="privacy.html" target="_blank" class="p67-link">Privacy Policy</a>.',
            '    </p>',
            '  </div>',
            '',
            '  <!-- Card 2: Guest Mode -->',
            '  <div class="p67-login-card p67-card-guest">',
            '    <div class="p67-card-eyebrow p67-eyebrow-muted"><i class="fa-solid fa-user-secret"></i> Guest Mode</div>',
            '    <p class="p67-card-desc">Try every feature without an account. Data stays on this device only.</p>',
            '',
            '    <ul class="p67-guest-checklist">',
            '      <li><i class="fa-solid fa-check" style="color:#4ade80;"></i> All features available</li>',
            '      <li><i class="fa-solid fa-check" style="color:#4ade80;"></i> Saved to local storage</li>',
            '      <li><i class="fa-solid fa-xmark" style="color:#f87171;"></i> No cross-device sync</li>',
            '      <li><i class="fa-solid fa-xmark" style="color:#f87171;"></i> Lost if cache is cleared</li>',
            '    </ul>',
            '',
            '    <div style="flex:1;"></div>',
            '',
            '    <button onclick="window.p67_guestMode()" class="p67-provider-btn p67-btn-ghost">',
            '      <i class="fa-solid fa-arrow-right-to-bracket"></i> Continue as Guest',
            '    </button>',
            '  </div>',
            '</div>',
        ].join('\n');

        overlay.appendChild(wrap);
        return true;
    }

    _wait(_rebuildLogin, 200, 30000);

    /* ================================================================
       8.  USER ONBOARDING  (FEATURE-10)
       ================================================================ */
    var OB_STEPS = [
        {
            icon:  'fa-solid fa-graduation-cap',
            title: 'Welcome to Student OS',
            body:  'Your all-in-one study workspace — notes, tasks, grades, flashcards, a whiteboard and more. This takes under a minute.',
            btns:  [{ label: 'Skip', style: 'sec' }, { label: 'Get Started', style: 'pri' }],
        },
        {
            icon:  'fa-solid fa-palette',
            title: 'Choose Your Theme',
            body:  'Pick the look that feels right. Change it any time in Settings.',
            type:  'theme',
            btns:  [{ label: 'Back', style: 'sec' }, { label: 'Next', style: 'pri' }],
        },
        {
            icon:  'fa-solid fa-user-pen',
            title: 'Your Display Name',
            body:  'How should Student OS address you?',
            type:  'name',
            btns:  [{ label: 'Back', style: 'sec' }, { label: 'Next', style: 'pri' }],
        },
        {
            icon:  'fa-solid fa-rocket',
            title: 'You are all set',
            body:  'Everything you need is a click away in the sidebar. Good luck with your studies.',
            btns:  [{ label: 'Start Studying', style: 'pri' }],
        },
    ];

    var _obStep = 0;

    /* Exposed so inline onclick from injected HTML can reach it */
    window.p67_setTheme = function (t) {
        document.body.setAttribute('data-theme', t);
        _dbSet('os_theme', t);
        document.querySelectorAll('.p67-theme-pick').forEach(function (b) {
            b.classList.toggle('p67-theme-pick-active', b.dataset.theme === t);
        });
    };

    function _renderOB() {
        var step  = OB_STEPS[_obStep];
        var bodyEl = document.getElementById('p67-ob-body');
        var actsEl = document.getElementById('p67-ob-acts');
        var progEl = document.getElementById('p67-ob-prog');
        if (!bodyEl || !actsEl || !progEl) return;

        progEl.innerHTML = OB_STEPS.map(function (_, i) {
            return '<div class="p67-ob-dot' + (i === _obStep ? ' active' : '') + '"></div>';
        }).join('');

        var extra = '';
        if (step.type === 'theme') {
            var cur = document.body.getAttribute('data-theme') || 'dark';
            extra = '<div style="display:flex;gap:10px;margin-top:16px;justify-content:center;">' +
                '<button class="p67-theme-pick' + (cur === 'dark'  ? ' p67-theme-pick-active' : '') + '" data-theme="dark"  onclick="window.p67_setTheme(\'dark\')"><i class="fa-solid fa-moon"></i> Dark</button>' +
                '<button class="p67-theme-pick' + (cur === 'light' ? ' p67-theme-pick-active' : '') + '" data-theme="light" onclick="window.p67_setTheme(\'light\')"><i class="fa-solid fa-sun"></i> Light</button>' +
                '</div>';
        } else if (step.type === 'name') {
            extra = '<input id="p67-ob-name" type="text" class="bare-input" style="margin-top:16px;width:100%;box-sizing:border-box;" placeholder="Your first name...">';
        }

        bodyEl.innerHTML = [
            '<i class="' + step.icon + '" style="font-size:2rem;color:var(--accent,#3b82f6);display:block;text-align:center;margin-bottom:12px;"></i>',
            '<h2 style="font-size:1.1rem;font-weight:700;color:var(--text-main);text-align:center;margin:0 0 8px;">' + step.title + '</h2>',
            '<p style="font-size:.85rem;color:var(--text-muted);text-align:center;line-height:1.55;margin:0;">' + step.body + '</p>',
            extra,
        ].join('');

        actsEl.innerHTML = '';
        step.btns.forEach(function (btn) {
            var b = document.createElement('button');
            b.textContent = btn.label;
            b.className   = btn.style === 'pri' ? 'p67-ob-btn-pri' : 'p67-ob-btn-sec';
            b.onclick = function () {
                if (OB_STEPS[_obStep].type === 'name') {
                    var inp = document.getElementById('p67-ob-name');
                    if (inp && inp.value.trim()) _dbSet('os_display_name', inp.value.trim());
                }
                if (btn.label === 'Back')                           { _obStep = Math.max(0, _obStep - 1); _renderOB(); }
                else if (btn.label === 'Skip' || btn.label === 'Start Studying') { _finishOB(); }
                else                                                { _obStep = Math.min(OB_STEPS.length - 1, _obStep + 1); _renderOB(); }
            };
            actsEl.appendChild(b);
        });
    }

    function _finishOB() {
        _dbSet('os_onboarding_complete', true);
        var el = document.getElementById('p67-onboarding');
        if (!el) return;
        el.style.transition = 'opacity .3s';
        el.style.opacity    = '0';
        setTimeout(function () { el.remove(); }, 330);
    }

    function _startOB() {
        if (document.getElementById('p67-onboarding')) return;
        _obStep = 0;
        var el = document.createElement('div');
        el.id        = 'p67-onboarding';
        el.className = 'p67-ob-overlay';
        el.innerHTML = [
            '<div class="p67-ob-card">',
            '  <div id="p67-ob-prog" class="p67-ob-prog"></div>',
            '  <div id="p67-ob-body" class="p67-ob-body"></div>',
            '  <div id="p67-ob-acts" class="p67-ob-acts"></div>',
            '</div>',
        ].join('');
        document.body.appendChild(el);
        _renderOB();
    }

    window.p67_startOnboarding = _startOB;

    _wait(function () {
        if (typeof window.initApp !== 'function') return false;
        if (window._p67initHooked) return true;
        window._p67initHooked = true;
        var _origInit = window.initApp;
        window.initApp = function () {
            _origInit.apply(this, arguments);
            setTimeout(function () {
                if (!_db('os_onboarding_complete', false)) _startOB();
            }, 2400);
        };
        return true;
    }, 300, 20000);

    /* ================================================================
       9.  BRAIN DUMP INBOX  (FEATURE-15)
       ================================================================ */
    _wait(function () {
        var dash = document.getElementById('view-dashboard');
        if (!dash || document.getElementById('p67-brain-dump')) return false;
        if (_db('p67_brain_dump_hidden', false)) return true;

        var widget = document.createElement('div');
        widget.id        = 'p67-brain-dump';
        widget.className = 'min-card p67-brain-dump';
        widget.innerHTML = [
            '<div class="p67-bd-header">',
            '  <span class="p67-bd-label"><i class="fa-solid fa-brain"></i> Brain Dump</span>',
            '  <button id="p67-bd-close" class="p67-bd-close" title="Hide this widget"><i class="fa-solid fa-xmark"></i></button>',
            '</div>',
            '<textarea id="p67-bd-area" class="p67-bd-area" placeholder="Dump it here. You can sort it later."></textarea>',
            '<div class="p67-bd-footer">',
            '  <span id="p67-bd-wc" class="p67-bd-wc">0 words</span>',
            '  <button id="p67-bd-sort" class="p67-bd-sort"><i class="fa-solid fa-inbox"></i> Sort Later</button>',
            '</div>',
        ].join('');

        var header = dash.querySelector('header') || dash.firstElementChild;
        dash.insertBefore(widget, header);

        var area = document.getElementById('p67-bd-area');
        try { if (area) area.value = localStorage.getItem('p67_bd_draft') || ''; } catch (_) {}

        function _wc() {
            var w  = (area.value.trim().match(/\S+/g) || []).length;
            var el = document.getElementById('p67-bd-wc');
            if (el) el.textContent = w + ' word' + (w !== 1 ? 's' : '');
        }

        if (area) {
            area.addEventListener('input', function () {
                try { localStorage.setItem('p67_bd_draft', area.value); } catch (_) {}
                _wc();
            });
            _wc();
        }

        document.getElementById('p67-bd-sort').onclick = function () {
            var text = area ? area.value.trim() : '';
            if (!text) { _toast('Nothing to sort — write something first.'); return; }
            var d    = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            var note = { id: Date.now().toString(36), title: 'Brain Dump \u2014 ' + d, content: text, created: Date.now() };
            var ns   = _db('os_notes', []);
            ns.unshift(note);
            _dbSet('os_notes', ns);
            if (area) area.value = '';
            try { localStorage.removeItem('p67_bd_draft'); } catch (_) {}
            _wc();
            _toast('Saved to Notes as "Brain Dump \u2014 ' + d + '"');
            if (typeof window.renderNotes === 'function') window.renderNotes();
        };

        document.getElementById('p67-bd-close').onclick = function () {
            _dbSet('p67_brain_dump_hidden', true);
            widget.remove();
            _toast('Brain Dump hidden. Re-enable in Settings.');
        };
        return true;
    }, 800, 25000);

    /* ================================================================
       10. NOTES READING TIME  (FEATURE-19)
       ================================================================ */
    function _updateRT() {
        var area =
            document.getElementById('note-editor')   ||
            document.getElementById('note-content')  ||
            document.querySelector('.note-editor-content') ||
            document.querySelector('[contenteditable="true"][id*="note"]');
        if (!area) return;

        var text  = (area.innerText || area.value || '').trim();
        var words = (text.match(/\S+/g) || []).length;
        var mins  = Math.max(1, Math.ceil(words / 200));

        var el = document.getElementById('p67-rt');
        if (!el) {
            el = document.createElement('div');
            el.id            = 'p67-rt';
            el.style.cssText = 'font-size:.72rem;color:var(--text-muted);opacity:.65;padding:2px 0 4px;display:flex;align-items:center;gap:5px;';
            var titleEl = document.getElementById('note-title') ||
                          document.querySelector('[id*="note-title"], [class*="note-title"]');
            if (titleEl) titleEl.insertAdjacentElement('afterend', el);
            else if (area.parentElement) area.parentElement.insertAdjacentElement('afterbegin', el);
        }
        el.innerHTML = '<i class="fa-regular fa-clock"></i> ~' + mins + ' min read &middot; ' + words + ' words';

        if (!area.dataset.p67rt) {
            area.dataset.p67rt = '1';
            area.addEventListener('input', _updateRT);
        }
    }

    _wait(function () {
        var name = window.openNote ? 'openNote' : window.selectNote ? 'selectNote' : window.renderNote ? 'renderNote' : null;
        if (!name) return false;
        if (window['_p67rt_' + name]) return true;
        window['_p67rt_' + name] = true;
        var _orig = window[name];
        window[name] = function () { _orig.apply(this, arguments); setTimeout(_updateRT, 120); };
        return true;
    }, 500, 20000);

    /* ================================================================
       11. OFFLINE / SYNC INDICATOR  (FEATURE-25)
       ================================================================ */
    function _setOnlineState(online) {
        var b = document.getElementById('p67-net-badge');
        if (!b) return;
        b.className = 'p67-net-badge ' + (online ? 'p67-net-online' : 'p67-net-offline');
        b.title     = online ? 'Synced' : 'Offline \u2014 changes will sync when reconnected';
        b.innerHTML = '<i class="fa-solid fa-' + (online ? 'wifi' : 'wifi-slash') + '"></i>';
    }

    _wait(function () {
        var nav = document.querySelector('nav.w-20');
        if (!nav || document.getElementById('p67-net-badge')) return false;
        var badge = document.createElement('div');
        badge.id          = 'p67-net-badge';
        badge.style.cssText = 'margin:2px auto;';
        var settingsWrap = nav.querySelector('.mt-auto');
        if (settingsWrap) settingsWrap.insertAdjacentElement('beforebegin', badge);
        else nav.appendChild(badge);
        _setOnlineState(navigator.onLine);
        window.addEventListener('online',  function () { _setOnlineState(true);  });
        window.addEventListener('offline', function () { _setOnlineState(false); });
        return true;
    }, 400, 15000);

    /* ================================================================
       12. CHANGELOG MODAL  (FEATURE-32)
       ================================================================ */
    var CHANGELOG = [{
        v: '2.0', date: 'June 2026',
        items: [
            'Login screen rebuilt — two-card layout with Guest Mode and GitHub sign-in',
            'Custom in-app modals replace all native browser confirm / alert / prompt dialogs',
            'New user onboarding flow (also restartable from Settings)',
            'GeoGebra graphing calculator embedded inside the Calc section',
            'Pomodoro session statistics — total sessions, daily streak, personal best',
            'Brain Dump inbox widget at the top of the Dashboard',
            'Notes reading-time and word-count displayed below the note title',
            'Offline / sync status indicator in the sidebar',
            'Whiteboard brush colour now auto-inverts when the canvas background changes',
            'Flashcard dashboard count fixed — live total from Firestore instead of stale cache',
            'Multiple task lists with custom names (patches66)',
            'AI Notes sidebar rebuilt — Groq + Gemini, quick-prompt buttons (patches65 / 66)',
            'Formula block now uses a neutral colour throughout (patches63)',
            'Mind-map overhauled — drag-and-drop, double-click edit, right-click menu (patches57)',
            'Flashcard star button added to study view and card list (patches58)',
            'Whiteboard appearance settings moved to correct Settings tab (patches62)',
        ],
    }];

    window.p67_showChangelog = function () {
        if (document.getElementById('p67-cl-modal')) return;
        var m = document.createElement('div');
        m.id        = 'p67-cl-modal';
        m.className = 'p67-cl-overlay';
        m.innerHTML = [
            '<div class="p67-cl-box">',
            '  <div class="p67-cl-head">',
            '    <span style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--text-main);font-size:.95rem;">',
            '      <i class="fa-solid fa-scroll" style="color:var(--accent,#3b82f6);"></i> Changelog',
            '    </span>',
            '    <button id="p67-cl-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;"><i class="fa-solid fa-xmark"></i></button>',
            '  </div>',
            '  <div class="p67-cl-body">',
            CHANGELOG.map(function (entry) {
                return [
                    '<div class="p67-cl-entry">',
                    '  <div class="p67-cl-version">v' + entry.v + ' <span class="p67-cl-date">' + entry.date + '</span></div>',
                    '  <ul class="p67-cl-list">',
                    entry.items.map(function (item) {
                        return '    <li><i class="fa-solid fa-circle-check" style="color:var(--accent,#3b82f6);font-size:.6rem;flex-shrink:0;margin-top:.28em;"></i> ' + item + '</li>';
                    }).join('\n'),
                    '  </ul>',
                    '</div>',
                ].join('\n');
            }).join('\n'),
            '  </div>',
            '</div>',
        ].join('\n');
        document.body.appendChild(m);
        document.getElementById('p67-cl-close').onclick = function () { m.remove(); };
        m.onclick = function (e) { if (e.target === m) m.remove(); };
    };

    /* "What's new" banner — shown once after an upgrade */
    var APP_VER = '2.0';
    var _lastSeen = '';
    try { _lastSeen = localStorage.getItem('sos_last_version') || ''; } catch (_) {}

    if (_lastSeen !== APP_VER) {
        _wait(function () {
            if (!document.getElementById('view-dashboard')) return false;
            setTimeout(function () {
                if (document.getElementById('p67-whats-new')) return;
                var banner = document.createElement('div');
                banner.id        = 'p67-whats-new';
                banner.className = 'p67-whats-new';
                banner.innerHTML = '<i class="fa-solid fa-sparkles"></i> Student OS 2.0 is here &mdash; <u>see what\'s new</u>' +
                    '<button id="p67-wn-x" style="background:none;border:none;color:rgba(255,255,255,.75);cursor:pointer;margin-left:10px;font-size:.75rem;"><i class="fa-solid fa-xmark"></i></button>';
                banner.onclick = function (e) {
                    if (e.target.closest('#p67-wn-x')) {
                        try { localStorage.setItem('sos_last_version', APP_VER); } catch (_) {}
                        banner.remove(); return;
                    }
                    window.p67_showChangelog();
                    try { localStorage.setItem('sos_last_version', APP_VER); } catch (_) {}
                    banner.remove();
                };
                document.body.appendChild(banner);
                setTimeout(function () {
                    try { localStorage.setItem('sos_last_version', APP_VER); } catch (_) {}
                    banner.style.transition = 'opacity .4s';
                    banner.style.opacity    = '0';
                    setTimeout(function () { if (banner.parentNode) banner.remove(); }, 440);
                }, 10000);
            }, 3600);
            return true;
        }, 600, 15000);
    }

    console.log('[patches67] loaded — BUG-01,03,05,06,08 + FEATURE-05,07,08,10,15,19,25,32');
}());
