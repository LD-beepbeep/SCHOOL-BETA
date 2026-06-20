/* ================================================================
   StudentOS — patches69.js
   Final polish pass

   FIX-01  Loading blank screen — splash overlay while Firebase boots
   FIX-02  Brain Dump note open — reliable multi-strategy open
   FIX-03  AI sidebar — student-friendly label, compact, blends in
   FIX-04  Calculator — complete rebuild with Basic + Scientific + Graphing
   FIX-05  Black belt at bottom — CSS + layout audit (companion CSS)
   FIX-06  Login screen polish — refined two-card layout
   FIX-07  Brain Dump toggle in Settings > Widgets section
   FEATURE-17  Cornell Notes template + Print button in Notes
   ================================================================ */

(function _p69_init() {
    'use strict';

    /* ── Helpers ────────────────────────────────────────────────── */
    function _wait(fn, iv, mx) {
        iv = iv || 100; mx = mx || 25000;
        var el = 0;
        (function t() { if (fn()) return; el += iv; if (el < mx) setTimeout(t, iv); })();
    }
    function _db(k, d) {
        try { if (window.DB && typeof window.DB.get === 'function') return window.DB.get(k, d);
              var v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; }
        catch (_) { return d; }
    }
    function _dbSet(k, v) {
        try { if (window.DB && typeof window.DB.set === 'function') return window.DB.set(k, v);
              localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    }

    /* ================================================================
       FIX-01  LOADING SPLASH
       Shows a branded loading screen the instant the script runs,
       then fades it out once initApp fires or the login overlay appears.
       ================================================================ */
    (function _p69splash() {
        if (document.getElementById('p69-splash')) return;
        var el = document.createElement('div');
        el.id = 'p69-splash';
        /* Inline critical styles so it shows before the CSS file loads */
        el.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:9999998',
            'background:var(--bg-color,#0f172a)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'gap:20px', 'transition:opacity .4s',
        ].join(';');
        el.innerHTML = [
            '<div style="width:52px;height:52px;border-radius:16px;',
            'background:var(--accent,#3b82f6);display:flex;',
            'align-items:center;justify-content:center;',
            'box-shadow:0 4px 24px rgba(59,130,246,.4);">',
            '<i class="ph-bold ph-student" style="font-size:1.6rem;color:#fff;"></i>',
            '</div>',
            '<div style="font-size:.85rem;color:rgba(255,255,255,.4);',
            'letter-spacing:.06em;">Loading Student OS\u2026</div>',
            '<div class="p69-spinner"></div>',
        ].join('');
        document.body.appendChild(el);
    })();

    function _p69hideSplash() {
        var el = document.getElementById('p69-splash');
        if (!el || el.dataset.gone) return;
        el.dataset.gone = '1';
        el.style.opacity = '0';
        setTimeout(function () { if (el.parentNode) el.remove(); }, 420);
    }

    /* Hide when initApp runs */
    _wait(function () {
        if (typeof window.initApp !== 'function') return false;
        if (window._p69splashHooked) return true;
        window._p69splashHooked = true;
        var _orig = window.initApp;
        window.initApp = function () { _orig.apply(this, arguments); setTimeout(_p69hideSplash, 200); };
        return true;
    }, 80, 8000);

    /* Also hide if login overlay becomes visible (user already logged out) */
    _wait(function () {
        var lo = document.getElementById('login-overlay');
        if (!lo) return false;
        var hidden = lo.classList.contains('hidden') || lo.style.display === 'none';
        if (!hidden) { setTimeout(_p69hideSplash, 100); return true; }
        return false;
    }, 150, 8000);

    /* Safety net — always hide after 6 s */
    setTimeout(_p69hideSplash, 6000);

    /* ================================================================
       FIX-02  BRAIN DUMP NOTE OPEN
       Overrides the Sort Later handler with a robust multi-strategy
       approach to both save the note correctly AND open it.
       ================================================================ */
    _wait(function () {
        var sortBtn = document.getElementById('p68-bd-sort') || document.getElementById('p67-bd-sort');
        if (!sortBtn || sortBtn.dataset.p69) return false;
        sortBtn.dataset.p69 = '1';

        sortBtn.onclick = function () {
            var areaEl = document.getElementById('p68-bd-area') || document.getElementById('p67-bd-area');
            var text   = areaEl ? areaEl.value.trim() : '';
            if (!text) { if (window.p67_alert) window.p67_alert('Write something first.'); return; }

            var d    = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            var id   = 'bd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
            /* Save in every possible field name the app might use */
            var note = {
                id:        id,
                title:     'Brain Dump \u2014 ' + d,
                content:   text,
                body:      text,
                text:      text,
                markdown:  text,
                created:   Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                timestamp: Date.now(),
                pinned:    false,
                tags:      [],
            };

            var notes = _db('os_notes', []);
            notes.unshift(note);
            _dbSet('os_notes', notes);

            if (areaEl) areaEl.value = '';
            try { localStorage.removeItem('p67_bd_draft'); localStorage.removeItem('p68_bd_draft'); } catch (_) {}
            var wcEl = document.getElementById('p68-bd-wc') || document.getElementById('p67-bd-wc');
            if (wcEl) wcEl.textContent = '0 words';

            /* Re-render notes list so the note appears */
            if (typeof window.renderNotes === 'function') window.renderNotes();
            if (typeof window.loadNotes   === 'function') window.loadNotes();
            if (typeof window.refreshNotes === 'function') window.refreshNotes();

            /* --- Open the note --- */
            function _openNote() {
                /* Strategy 1: named open function with id */
                var fns = ['openNote', 'selectNote', 'loadNote', 'viewNote', 'showNote'];
                for (var i = 0; i < fns.length; i++) {
                    if (typeof window[fns[i]] === 'function') { window[fns[i]](id); return; }
                }
                /* Strategy 2: find rendered note item by data attribute */
                var attrs = ['[data-note-id="'+id+'"]', '[data-id="'+id+'"]', '[data-key="'+id+'"]'];
                for (var j = 0; j < attrs.length; j++) {
                    var el = document.querySelector(attrs[j]);
                    if (el) { el.click(); return; }
                }
                /* Strategy 3: click the first note in the list (we unshifted it) */
                var selectors = [
                    '#notes-list > *:first-child',
                    '.notes-list > *:first-child',
                    '[id*="notes-list"] > *:first-child',
                    '[class*="note-item"]:first-of-type',
                    '[class*="note-card"]:first-of-type',
                ];
                for (var k = 0; k < selectors.length; k++) {
                    var el2 = document.querySelector(selectors[k]);
                    if (el2) { el2.click(); return; }
                }
            }

            /* Switch to notes tab first, then open */
            if (typeof window.switchTab === 'function') {
                window.switchTab('notes');
                setTimeout(_openNote, 400);
            } else {
                setTimeout(_openNote, 200);
            }

            /* Show a non-blocking confirmation */
            var toast = document.createElement('div');
            toast.className = 'p68-toast p68-toast-click';
            toast.innerHTML = '<i class="fa-solid fa-check-circle" style="margin-right:6px;color:#4ade80;"></i> Saved to Notes \u2014 click to open';
            toast.onclick   = function () { toast.remove(); if (typeof window.switchTab === 'function') window.switchTab('notes'); setTimeout(_openNote, 300); };
            document.body.appendChild(toast);
            setTimeout(function () { toast.style.opacity = '0'; setTimeout(function () { if (toast.parentNode) toast.remove(); }, 380); }, 5000);
        };
        return true;
    }, 1200, 25000);

    /* ================================================================
       FIX-03  AI SIDEBAR — STUDENT FRIENDLY
       Renames "Core Intelligence" to "Study Assistant", makes the
       panel feel like part of the notes view rather than a huge overlay.
       ================================================================ */
    _wait(function () {
        var panel = document.getElementById('note-groq-chat-panel');
        if (!panel) return false;

        /* Rename the header */
        var header = panel.querySelector('[class*="tracking-widest"], [class*="uppercase"]');
        if (header && header.textContent.includes('Intelligence')) {
            header.textContent = 'Study Assistant';
        }

        /* Remove the "live" green dot if too prominent */
        var dot = panel.querySelector('.animate-pulse');
        if (dot) dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:var(--accent,#3b82f6);opacity:.6;flex-shrink:0;';

        /* Ensure panel has compact positioning from patches68 */
        if (!panel.style.borderRadius) {
            panel.style.cssText = [
                'position:fixed', 'right:18px', 'bottom:74px',
                'top:auto', 'width:288px', 'max-height:400px',
                'border-radius:18px',
                'border:1px solid var(--glass-border)',
                'background:var(--bg-color)',
                'box-shadow:0 8px 32px rgba(0,0,0,.25)',
                'display:flex', 'flex-direction:column', 'z-index:4999',
                'overflow:hidden',
            ].join(';');
        }

        panel.dataset.p69 = '1';

        /* Update the trigger icon & tooltip on the notes toolbar */
        var triggerBtn = document.getElementById('note-groq-btn');
        if (triggerBtn) {
            triggerBtn.title = 'Study Assistant';
            var icon = triggerBtn.querySelector('i');
            if (icon) {
                icon.className = 'fa-solid fa-robot';
                icon.style.cssText = 'font-size:1rem;color:var(--accent,#3b82f6);';
            }
        }
        return true;
    }, 600, 20000);

    /* ================================================================
       FIX-04  CALCULATOR REBUILD
       Replaces whatever is in #view-calc with a clean two-mode
       calculator (Basic / Scientific) plus the GeoGebra Graphing tab.
       Uses a sandboxed Function evaluator — no eval().
       ================================================================ */
    var _p69calcExpr  = '';
    var _p69calcMode  = 'basic';
    var _p69calcDeg   = true; /* degrees mode */

    function _p69safeEval(expr) {
        try {
            /* Normalise operators */
            var e = expr
                .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
                .replace(/\^/g, '**').replace(/π/g, '(Math.PI)');

            /* Replace named constants that look like standalone tokens */
            e = e.replace(/\be\b/g, '(Math.E)');

            /* Replace trig, log, sqrt using sandboxed helpers */
            e = e
                .replace(/\bsin\b/g,  '_s')
                .replace(/\bcos\b/g,  '_c')
                .replace(/\btan\b/g,  '_t')
                .replace(/\basin\b/g, '_as')
                .replace(/\bacos\b/g, '_ac')
                .replace(/\batan\b/g, '_at')
                .replace(/\bsqrt\b/g, '_sq')
                .replace(/\babs\b/g,  'Math.abs')
                .replace(/\blog\b/g,  '_log')
                .replace(/\bln\b/g,   '_ln')
                .replace(/√/g,        '_sq');

            var toR  = _p69calcDeg ? '(Math.PI/180)*' : '';
            var fromR = _p69calcDeg ? '(180/Math.PI)*' : '';

            var result = Function(
                '"use strict";' +
                'var _s  = function(x){ return Math.sin('  + toR + 'x); };' +
                'var _c  = function(x){ return Math.cos('  + toR + 'x); };' +
                'var _t  = function(x){ return Math.tan('  + toR + 'x); };' +
                'var _as = function(x){ return ' + fromR + 'Math.asin(x); };' +
                'var _ac = function(x){ return ' + fromR + 'Math.acos(x); };' +
                'var _at = function(x){ return ' + fromR + 'Math.atan(x); };' +
                'var _sq = function(x){ return Math.sqrt(x); };' +
                'var _log= function(x){ return Math.log10(x); };' +
                'var _ln = function(x){ return Math.log(x);   };' +
                'return (' + e + ');'
            )();

            if (typeof result !== 'number' || !isFinite(result)) {
                return !isFinite(result) ? (result > 0 ? '\u221e' : result < 0 ? '-\u221e' : 'Error') : 'Error';
            }
            /* Remove floating-point noise */
            var rounded = parseFloat(result.toPrecision(12));
            return String(rounded);
        } catch (_) { return 'Error'; }
    }

    function _p69updateDisplay() {
        var exprEl   = document.getElementById('p69-expr');
        var resultEl = document.getElementById('p69-result');
        if (!exprEl || !resultEl) return;
        exprEl.textContent = _p69calcExpr || '';
        if (!_p69calcExpr) { resultEl.textContent = '0'; return; }
        /* Show live result while typing if expression ends with a digit or ) */
        if (/[\d\)π]$/.test(_p69calcExpr)) {
            var r = _p69safeEval(_p69calcExpr);
            resultEl.textContent = (r !== 'Error' && r !== _p69calcExpr) ? r : '';
        } else {
            resultEl.textContent = '';
        }
    }

    function _p69press(val) {
        if (val === 'C')  { _p69calcExpr = ''; _p69updateDisplay(); return; }
        if (val === '\u232b') { /* backspace */
            _p69calcExpr = _p69calcExpr.slice(0, -1);
            _p69updateDisplay(); return;
        }
        if (val === '=') {
            var r = _p69safeEval(_p69calcExpr);
            _p69calcExpr = (r === 'Error') ? '' : r;
            _p69updateDisplay(); return;
        }
        /* Functions that need an opening paren */
        if (['sin','cos','tan','asin','acos','atan','sqrt','log','ln','\u221a'].includes(val)) {
            _p69calcExpr += (val === '\u221a' ? 'sqrt' : val) + '(';
            _p69updateDisplay(); return;
        }
        _p69calcExpr += val;
        _p69updateDisplay();
    }

    function _p69btn(label, type, value) {
        return '<button class="p69-btn p69-btn-' + type + '" onclick="window._p69press(\'' +
            (value || label).replace(/'/g, "\\'") + '\')">' + label + '</button>';
    }

    function _p69buildCalcUI() {
        var calcView = document.getElementById('view-calc');
        if (!calcView || calcView.dataset.p69rebuilt) return false;
        calcView.dataset.p69rebuilt = '1';

        /* Expose press function */
        window._p69press = _p69press;

        calcView.innerHTML = [
            '<div class="p69-calc-wrap">',

            /* Display */
            '<div class="p69-calc-display">',
            '  <div id="p69-expr"   class="p69-expr"></div>',
            '  <div id="p69-result" class="p69-result">0</div>',
            '</div>',

            /* Mode tabs */
            '<div class="p69-modes">',
            '  <button class="p69-mode active" data-m="basic"   onclick="window._p69switchMode(\'basic\')">Basic</button>',
            '  <button class="p69-mode"        data-m="sci"     onclick="window._p69switchMode(\'sci\')">Scientific</button>',
            '  <button class="p69-mode"        data-m="graph"   onclick="window._p69switchMode(\'graph\')">Graphing</button>',
            '</div>',

            /* Basic grid */
            '<div id="p69-grid-basic" class="p69-grid">',
            '  <div class="p69-row">',
            _p69btn('C',   'fn'),   _p69btn('\u232b','fn'),   _p69btn('(','op'),   _p69btn(')','op'),
            '  </div><div class="p69-row">',
            _p69btn('7','num'), _p69btn('8','num'), _p69btn('9','num'), _p69btn('\u00f7','op','\u00f7'),
            '  </div><div class="p69-row">',
            _p69btn('4','num'), _p69btn('5','num'), _p69btn('6','num'), _p69btn('\u00d7','op','\u00d7'),
            '  </div><div class="p69-row">',
            _p69btn('1','num'), _p69btn('2','num'), _p69btn('3','num'), _p69btn('\u2212','op','\u2212'),
            '  </div><div class="p69-row">',
            _p69btn('0','num'), _p69btn('.','num'), _p69btn('%','op'), _p69btn('+','op'),
            '  </div><div class="p69-row p69-row-eq">',
            _p69btn('=','eq'),
            '  </div>',
            '</div>',

            /* Scientific grid (hidden by default) */
            '<div id="p69-grid-sci" class="p69-grid p69-grid-sci" style="display:none;">',
            /* Deg/Rad toggle */
            '  <div class="p69-row p69-row-degrad">',
            '    <button id="p69-deg-btn" class="p69-degbtn active" onclick="window._p69toggleDeg()">DEG</button>',
            '    <button id="p69-rad-btn" class="p69-degbtn"        onclick="window._p69toggleDeg()">RAD</button>',
            '  </div>',
            /* Scientific buttons */
            '  <div class="p69-row">',
            _p69btn('sin','sci'), _p69btn('cos','sci'), _p69btn('tan','sci'), _p69btn('^','op'),
            '  </div><div class="p69-row">',
            _p69btn('asin','sci'), _p69btn('acos','sci'), _p69btn('atan','sci'), _p69btn('\u221a','sci'),
            '  </div><div class="p69-row">',
            _p69btn('log','sci'), _p69btn('ln','sci'), _p69btn('\u03c0','num','\u03c0'), _p69btn('e','num','e'),
            '  </div>',
            /* Basic keys repeated */
            '  <div class="p69-row">',
            _p69btn('C','fn'), _p69btn('\u232b','fn'), _p69btn('(','op'), _p69btn(')','op'),
            '  </div><div class="p69-row">',
            _p69btn('7','num'), _p69btn('8','num'), _p69btn('9','num'), _p69btn('\u00f7','op','\u00f7'),
            '  </div><div class="p69-row">',
            _p69btn('4','num'), _p69btn('5','num'), _p69btn('6','num'), _p69btn('\u00d7','op','\u00d7'),
            '  </div><div class="p69-row">',
            _p69btn('1','num'), _p69btn('2','num'), _p69btn('3','num'), _p69btn('\u2212','op','\u2212'),
            '  </div><div class="p69-row">',
            _p69btn('0','num'), _p69btn('.','num'), _p69btn('%','op'), _p69btn('+','op'),
            '  </div><div class="p69-row p69-row-eq">',
            _p69btn('=','eq'),
            '  </div>',
            '</div>',

            /* GeoGebra panel */
            '<div id="p69-ggb-pane" style="display:none;flex-direction:column;flex:1;min-height:520px;border-radius:14px;overflow:hidden;border:1px solid var(--glass-border);margin-top:2px;">',
            '  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--glass-panel);border-bottom:1px solid var(--glass-border);flex-shrink:0;">',
            '    <span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);">',
            '      <i class="fa-solid fa-chart-line" style="color:var(--accent);margin-right:6px;"></i>GeoGebra Graphing</span>',
            '    <button onclick="window._p69switchMode(\'basic\')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.82rem;padding:3px 7px;border-radius:7px;">',
            '      <i class="fa-solid fa-xmark"></i> Close</button>',
            '  </div>',
            '  <iframe id="p69-ggb-frame" src="" title="GeoGebra" allow="fullscreen" loading="lazy" style="width:100%;flex:1;border:none;"></iframe>',
            '</div>',

            '</div>',/* /p69-calc-wrap */
        ].join('');

        /* Mode switcher */
        window._p69switchMode = function (mode) {
            _p69calcMode = mode;
            document.querySelectorAll('.p69-mode').forEach(function (b) {
                b.classList.toggle('active', b.dataset.m === mode);
            });
            document.getElementById('p69-grid-basic').style.display = (mode === 'basic')  ? '' : 'none';
            document.getElementById('p69-grid-sci').style.display   = (mode === 'sci')    ? '' : 'none';
            document.getElementById('p69-ggb-pane').style.display   = (mode === 'graph')  ? 'flex' : 'none';
            /* Lazy-load GeoGebra iframe */
            if (mode === 'graph') {
                var iframe = document.getElementById('p69-ggb-frame');
                if (iframe && !iframe.src.includes('geogebra')) {
                    iframe.src = 'https://www.geogebra.org/graphing?embed';
                }
            }
        };

        /* Deg/Rad toggle */
        window._p69toggleDeg = function () {
            _p69calcDeg = !_p69calcDeg;
            var degBtn = document.getElementById('p69-deg-btn');
            var radBtn = document.getElementById('p69-rad-btn');
            if (degBtn) degBtn.classList.toggle('active', _p69calcDeg);
            if (radBtn) radBtn.classList.toggle('active', !_p69calcDeg);
        };

        /* Keyboard support */
        document.addEventListener('keydown', function (e) {
            /* Only active when calc view is visible */
            var cv = document.getElementById('view-calc');
            if (!cv || cv.classList.contains('hidden') || cv.style.display === 'none') return;
            var key = e.key;
            if (key === 'Enter' || key === '=') { _p69press('='); return; }
            if (key === 'Backspace') { _p69press('\u232b'); return; }
            if (key === 'Escape')   { _p69press('C'); return; }
            if (/^[\d\.\+\-\*\/\(\)\%\^]$/.test(key)) { _p69press(key); return; }
        });

        return true;
    }

    _wait(_p69buildCalcUI, 600, 25000);

    /* ================================================================
       FIX-06  LOGIN SCREEN POLISH
       Replaces p67's two-card layout with a refined version that
       has better visual hierarchy and smoother styling.
       ================================================================ */
    function _p69polishLogin() {
        var overlay = document.getElementById('login-overlay');
        if (!overlay || overlay.dataset.p69login) return false;
        /* Wait for patches67 to have already run its rebuild */
        var wrap = overlay.querySelector('.p67-login-wrap');
        if (!wrap) return false;
        overlay.dataset.p69login = '1';

        /* Replace the wrapper entirely with a cleaner version */
        wrap.remove();

        var newWrap = document.createElement('div');
        newWrap.className = 'relative z-10 p69-login-wrap';
        newWrap.innerHTML = [
            /* Logo */
            '<div class="p69-login-logo">',
            '  <div class="p69-login-logo-icon">',
            '    <i class="ph-bold ph-student" style="font-size:1.5rem;color:#fff;"></i>',
            '  </div>',
            '  <div class="p69-login-logo-text">',
            '    <div style="font-size:1.3rem;font-weight:800;color:var(--text-main);letter-spacing:-.03em;">Student OS</div>',
            '    <div style="font-size:.74rem;color:var(--text-muted);margin-top:1px;">Your personal study workspace</div>',
            '  </div>',
            '</div>',

            /* Two columns */
            '<div class="p69-login-cols">',

            /* Col 1: Sign In */
            '<div class="p69-login-card p69-card-main">',
            '  <div class="p69-card-tag"><i class="fa-solid fa-cloud"></i> Sign In</div>',
            '  <p class="p69-card-hint">Recommended. Your data syncs across all devices.</p>',

            '  <button onclick="signInWithGoogle()" class="p69-auth-row p69-auth-google">',
            '    <svg width="17" height="17" viewBox="0 0 48 48" style="flex-shrink:0"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.6 4.9C9.7 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.8l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/></svg>',
            '    Continue with Google',
            '  </button>',

            '  <button onclick="window.p67_signInWithGitHub && window.p67_signInWithGitHub()" class="p69-auth-row p69-auth-github">',
            '    <i class="fab fa-github" style="font-size:1rem;"></i> Continue with GitHub',
            '  </button>',

            '  <div class="p69-divider"><span>or use email</span></div>',

            '  <input id="login-email"    type="email"    class="bare-input" placeholder="Email address"',
            '         style="margin-bottom:10px;" onkeypress="if(event.key===\'Enter\')signInWithEmail()">',
            '  <input id="login-password" type="password" class="bare-input" placeholder="Password"',
            '         onkeypress="if(event.key===\'Enter\')signInWithEmail()">',

            '  <div style="display:flex;justify-content:flex-end;margin-top:4px;">',
            '    <button onclick="typeof resetPassword===\'function\'&&resetPassword()" class="p69-link-btn">Forgot password?</button>',
            '  </div>',

            '  <button onclick="signInWithEmail()" class="p69-auth-row p69-auth-primary" style="margin-top:8px;">',
            '    <i class="fa-solid fa-right-to-bracket"></i> Sign In / Create Account',
            '  </button>',

            '  <p class="p69-legal">',
            '    By continuing you agree to the <a href="privacy.html" target="_blank" style="color:var(--accent);">Privacy Policy</a>.',
            '  </p>',
            '</div>',

            /* Col 2: Guest */
            '<div class="p69-login-card p69-card-guest">',
            '  <div class="p69-card-tag p69-tag-muted"><i class="fa-solid fa-user-secret"></i> Guest Mode</div>',
            '  <p class="p69-card-hint">Full access with no account needed. Saves to this device only.</p>',
            '  <ul class="p69-feature-list">',
            '    <li><i class="fa-solid fa-check" style="color:#4ade80;"></i> All features available</li>',
            '    <li><i class="fa-solid fa-check" style="color:#4ade80;"></i> Saves locally</li>',
            '    <li><i class="fa-solid fa-xmark" style="color:#f87171;"></i> No cross-device sync</li>',
            '    <li><i class="fa-solid fa-xmark" style="color:#f87171;"></i> Lost if cache is cleared</li>',
            '  </ul>',
            '  <div style="flex:1;"></div>',
            '  <button onclick="window.p67_guestMode && window.p67_guestMode()" class="p69-auth-row p69-auth-ghost">',
            '    <i class="fa-solid fa-arrow-right-to-bracket"></i> Continue as Guest',
            '  </button>',
            '</div>',

            '</div>', /* /cols */
        ].join('');

        overlay.appendChild(newWrap);
        return true;
    }

    _wait(_p69polishLogin, 800, 25000);

    /* ================================================================
       FIX-07  BRAIN DUMP TOGGLE IN SETTINGS > WIDGETS
       Finds the p10 Settings Widgets page and injects a toggle row.
       ================================================================ */
    _wait(function () {
        var widgetsPage = document.getElementById('p10-page-widgets') ||
                          document.querySelector('[id*="page-widget"]');
        if (!widgetsPage || document.getElementById('p69-bd-settings-row')) return false;

        var section = document.createElement('div');
        section.className = 'p10-section';
        section.innerHTML = [
            '<div class="p10-section-title">Dashboard Extras</div>',
            '<div class="p10-row" id="p69-bd-settings-row">',
            '  <div>',
            '    <div class="p10-row-lbl">Brain Dump Inbox</div>',
            '    <div class="p10-row-sub">Quick text area at the top of the dashboard</div>',
            '  </div>',
            '  <div id="p69-bd-stg-toggle" class="p10-toggle" role="switch"></div>',
            '</div>',
        ].join('');

        widgetsPage.appendChild(section);

        function _syncBDToggle() {
            var vis    = (_db('p9_widget_vis', {})['brain-dump']) !== false;
            var toggle = document.getElementById('p69-bd-stg-toggle');
            if (toggle) { toggle.classList.toggle('on', vis); toggle.setAttribute('aria-checked', String(vis)); }
        }
        _syncBDToggle();

        document.getElementById('p69-bd-stg-toggle').onclick = function () {
            var next   = this.classList.toggle('on');
            this.setAttribute('aria-checked', String(next));
            var store  = _db('p9_widget_vis', {});
            store['brain-dump'] = next;
            _dbSet('p9_widget_vis', store);
            var el = document.getElementById('widget-brain-dump');
            if (el) el.classList.toggle('widget-hidden', !next);
            /* Also sync the widget-modal toggle if it exists */
            var wmTog = document.getElementById('p68-bd-toggle');
            if (wmTog) { wmTog.classList.toggle('on', next); wmTog.setAttribute('aria-checked', String(next)); }
        };

        /* Re-sync whenever settings open */
        _wait(function () {
            if (typeof window.openModal !== 'function') return false;
            if (window._p69bdSettingsHooked) return true;
            window._p69bdSettingsHooked = true;
            var _orig = window.openModal;
            window.openModal = function (id) {
                _orig.apply(this, arguments);
                if (id === 'modal-settings') setTimeout(_syncBDToggle, 250);
            };
            return true;
        }, 200, 10000);

        return true;
    }, 1000, 25000);

    /* ================================================================
       FEATURE-17  CORNELL NOTES TEMPLATE + PRINT BUTTON
       Adds a template picker and print button to the Notes toolbar.
       ================================================================ */
    _wait(function () {
        /* Find the notes toolbar — try several common selectors */
        var toolbar = document.getElementById('note-toolbar')       ||
                      document.getElementById('notes-toolbar')      ||
                      document.querySelector('.note-toolbar')        ||
                      document.querySelector('[id*="note"][id*="toolbar"]') ||
                      document.querySelector('#view-notes .flex:first-child');

        if (!toolbar || document.getElementById('p69-cornell-btn')) return false;

        /* Cornell Notes button */
        var cornellBtn = document.createElement('button');
        cornellBtn.id        = 'p69-cornell-btn';
        cornellBtn.title     = 'Insert Cornell Notes template';
        cornellBtn.className = 'p69-toolbar-btn';
        cornellBtn.innerHTML = '<i class="fa-solid fa-table-columns"></i>';
        cornellBtn.onclick   = _p69insertCornell;

        /* Print button */
        var printBtn = document.createElement('button');
        printBtn.id        = 'p69-print-btn';
        printBtn.title     = 'Print note';
        printBtn.className = 'p69-toolbar-btn';
        printBtn.innerHTML = '<i class="fa-solid fa-print"></i>';
        printBtn.onclick   = function () { window.print(); };

        toolbar.appendChild(cornellBtn);
        toolbar.appendChild(printBtn);

        /* Inject print stylesheet */
        if (!document.getElementById('p69-print-style')) {
            var ps = document.createElement('style');
            ps.id          = 'p69-print-style';
            ps.media       = 'print';
            ps.textContent = [
                '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                'nav, #sidebar, .sidebar, .nav-sidebar, header:not(.note-header),',
                'button:not(.p69-cornell-print-keep), [id*="modal"], [id*="toast"],',
                '[id*="splash"], #p67-onboarding, #p67-whats-new { display:none!important; }',
                '.cornell-layout { width:100%; border-collapse:collapse; }',
                '.cornell-layout td { border:1px solid #ccc; padding:12px; vertical-align:top; }',
                '.cornell-cues { width:30%; background:#f9f9f9; }',
                '.cornell-summary { background:#fffde7; }',
            ].join('\n');
            document.head.appendChild(ps);
        }

        return true;
    }, 1000, 25000);

    function _p69insertCornell() {
        /* Try to find the active note editor */
        var editor = document.getElementById('note-editor')   ||
                     document.getElementById('note-content')  ||
                     document.querySelector('.note-editor-content') ||
                     document.querySelector('[contenteditable="true"][id*="note"]') ||
                     document.querySelector('[contenteditable="true"]');

        if (!editor) { if (window.p67_alert) window.p67_alert('Open a note first, then click the Cornell template button.'); return; }

        var html = [
            '<br>',
            '<div class="p69-cornell">',
            '  <div class="p69-cornell-header">',
            '    <strong>Topic / Title:</strong>&nbsp;',
            '    <span contenteditable="true" class="p69-cornell-title">Enter topic here</span>',
            '  </div>',
            '  <div class="p69-cornell-body">',
            '    <div class="p69-cornell-cues" contenteditable="true">',
            '      <div class="p69-cornell-col-label">Cues &amp; Key Questions</div>',
            '      <p>Write questions here after class.</p>',
            '    </div>',
            '    <div class="p69-cornell-notes" contenteditable="true">',
            '      <div class="p69-cornell-col-label">Notes</div>',
            '      <p>Write notes here during class.</p>',
            '    </div>',
            '  </div>',
            '  <div class="p69-cornell-summary" contenteditable="true">',
            '    <div class="p69-cornell-col-label">Summary</div>',
            '    <p>Summarise the main ideas in your own words.</p>',
            '  </div>',
            '</div>',
            '<br>',
        ].join('');

        if (editor.isContentEditable) {
            /* Insert at cursor or append */
            var sel = window.getSelection();
            if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).startContainer)) {
                var range = sel.getRangeAt(0);
                range.collapse(false);
                var frag = document.createRange().createContextualFragment(html);
                range.insertNode(frag);
            } else {
                editor.innerHTML += html;
            }
        } else if (editor.tagName === 'TEXTAREA') {
            /* Plain text fallback */
            var text = [
                '\n\n--- Cornell Notes ---',
                'Topic: ',
                '\nCUES / KEY QUESTIONS\t|\tNOTES',
                '                    \t|\t',
                '                    \t|\t',
                '                    \t|\t',
                '\n--- SUMMARY ---\n',
                '\n',
            ].join('\n');
            var pos   = editor.selectionEnd;
            editor.value = editor.value.slice(0, pos) + text + editor.value.slice(pos);
        }

        /* Trigger any auto-save listener */
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    console.log('[patches69] loaded — splash, brain dump open, AI label, calc rebuild, login polish, Cornell notes');
}());
