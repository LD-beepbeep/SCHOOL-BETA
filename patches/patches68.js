/* ================================================================
   StudentOS — patches68.js
   Post-testing refinements

   FIX-01  Login flash — suppress old card immediately via early style
   FIX-02  GitHub login — loading state + popup-blocked fallback
   FIX-03  Brain Dump — move into widget grid, draggable, widget-menu toggle
   FIX-04  Brain Dump — correct note format + direct open on toast click
   FIX-05  AI sidebar — compact floating panel (not full-height overlay)
   FIX-06  GeoGebra — side-by-side layout with working close button
   FIX-07  Remove offline indicator (wifi badge)
   FIX-08  UI uniformization (companion: patches68.css)

   INSTALL: add after the patches67 lines in index.html
     <link rel="stylesheet" href="patches/patches68.css">
     <script type="module" src="patches/patches68.js"></script>

   HEAD FIX (add to <head> of index.html to kill the login flash):
     <style id="p68af">#login-overlay>.relative.z-10:not(.p67-login-wrap){visibility:hidden!important}</style>
   ================================================================ */

(function _p68_init() {
    'use strict';

    /* ── Helpers ────────────────────────────────────────────────── */
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
            if (window.DB && typeof window.DB.get === 'function') return window.DB.get(key, def);
            var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def;
        } catch (_) { return def; }
    }
    function _dbSet(key, val) {
        try {
            if (window.DB && typeof window.DB.set === 'function') return window.DB.set(key, val);
            localStorage.setItem(key, JSON.stringify(val));
        } catch (_) {}
    }
    function _toast(msg, onClick) {
        var existing = document.getElementById('p68-toast');
        if (existing) existing.remove();
        var t = document.createElement('div');
        t.id        = 'p68-toast';
        t.className = 'p68-toast' + (onClick ? ' p68-toast-click' : '');
        t.textContent = msg;
        if (onClick) {
            t.title   = 'Click to open';
            t.onclick = function () { onClick(); t.remove(); };
        }
        document.body.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { if (t.parentNode) t.remove(); }, 350);
        }, onClick ? 6000 : 3500);
    }

    /* ================================================================
       FIX-01  LOGIN FLASH
       Inject a blocking style as early as possible so the original
       single-card is never painted after patches67 has rebuilt it.
       Also tell users to add one line to <head> (see INSTALL comment).
       ================================================================ */
    (function _p68antiflash() {
        if (document.getElementById('p68-af')) return;
        var s = document.createElement('style');
        s.id          = 'p68-af';
        s.textContent = '#login-overlay>.relative.z-10:not(.p67-login-wrap){visibility:hidden!important;pointer-events:none!important}';
        (document.head || document.documentElement).insertBefore(s, document.head.firstChild);
    })();

    /* ================================================================
       FIX-02  GITHUB LOGIN UX
       Replace the simple onclick with a version that shows a loading
       state on the button, displays a popup-blocked fallback message,
       and uses signInWithRedirect if signInWithPopup fails.
       ================================================================ */
    _wait(function () {
        var btn = document.querySelector('.p67-btn-github');
        if (!btn || btn.dataset.p68) return false;
        btn.dataset.p68 = '1';

        btn.onclick = async function (e) {
            e.preventDefault();
            var originalHTML = btn.innerHTML;
            btn.innerHTML    = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to GitHub…';
            btn.disabled     = true;
            btn.style.opacity = '.7';

            var restore = function () {
                btn.innerHTML = originalHTML;
                btn.disabled  = false;
                btn.style.opacity = '';
            };

            try {
                /* Try Firebase compat (v8) */
                if (window.firebase && window.firebase.auth) {
                    var p = new window.firebase.auth.GithubAuthProvider();
                    await window.firebase.auth().signInWithPopup(p);
                    restore(); return;
                }
                /* Firebase v9+ modular */
                var mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                var auth = mod.getAuth();
                try {
                    await mod.signInWithPopup(auth, new mod.GithubAuthProvider());
                    restore();
                } catch (popupErr) {
                    if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
                        /* Popup was blocked — fall back to redirect */
                        btn.innerHTML = '<i class="fab fa-github"></i> Redirecting to GitHub…';
                        await mod.signInWithRedirect(auth, new mod.GithubAuthProvider());
                        /* Page will redirect; no need to restore */
                    } else {
                        throw popupErr;
                    }
                }
            } catch (err) {
                restore();
                if (window.p67_alert) {
                    window.p67_alert('GitHub sign-in failed: ' + (err.message || 'Please check your browser allows pop-ups for this site, and that GitHub is enabled as an auth provider in your Firebase Console.'));
                } else {
                    alert('GitHub sign-in error: ' + (err.message || 'unknown'));
                }
            }
        };
        return true;
    }, 400, 20000);

    /* ================================================================
       FIX-03  BRAIN DUMP — MOVE INTO WIDGET GRID + DRAGGABLE
       Removes the patches67 version (which was injected before the
       dashboard header) and re-injects it properly inside #widgets-grid
       so it sits with the other widgets and can be dragged.
       ================================================================ */
    _wait(function () {
        var grid = document.getElementById('widgets-grid');
        if (!grid) return false;

        /* Remove the misplaced patches67 version if it exists */
        var old = document.getElementById('p67-brain-dump');
        if (old) old.remove();

        /* Don't re-inject if already done or user hid it */
        if (document.getElementById('widget-brain-dump')) return true;

        var vis = _db('p9_widget_vis', {});
        if (vis['brain-dump'] === false) return true;

        var widget = document.createElement('div');
        widget.id          = 'widget-brain-dump';
        widget.className   = 'col-span-2 min-card p68-brain-dump widget-item';
        widget.draggable   = true;
        widget.setAttribute('data-widget-id', 'brain-dump');
        widget.innerHTML = [
            '<div class="p68-bd-hdr">',
            '  <div class="p68-bd-label">',
            '    <i class="fa-solid fa-brain"></i>',
            '    <span>Brain Dump</span>',
            '  </div>',
            '</div>',
            '<textarea id="p68-bd-area" class="p68-bd-area" placeholder="Dump it here. You can sort it later."></textarea>',
            '<div class="p68-bd-footer">',
            '  <span id="p68-bd-wc" class="p68-bd-wc">0 words</span>',
            '  <button id="p68-bd-sort" class="p68-bd-sort">',
            '    <i class="fa-solid fa-inbox"></i> Sort Later',
            '  </button>',
            '</div>',
        ].join('');

        /* Insert as first child of the grid */
        grid.insertBefore(widget, grid.firstChild);

        /* Restore draft */
        var area = document.getElementById('p68-bd-area');
        try { if (area) area.value = localStorage.getItem('p67_bd_draft') || ''; } catch (_) {}

        function _wc() {
            var w = (area.value.trim().match(/\S+/g) || []).length;
            var el = document.getElementById('p68-bd-wc');
            if (el) el.textContent = w + ' word' + (w !== 1 ? 's' : '');
        }
        if (area) { area.addEventListener('input', function () { try { localStorage.setItem('p67_bd_draft', area.value); } catch (_) {} _wc(); }); _wc(); }

        /* Sort Later — saves note, shows clickable toast */
        document.getElementById('p68-bd-sort').onclick = function () {
            var text = area ? area.value.trim() : '';
            if (!text) { _toast('Nothing to save — write something first.'); return; }
            var d    = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            var id   = 'bd_' + Date.now().toString(36);
            var note = {
                id: id, title: 'Brain Dump \u2014 ' + d,
                content: text, body: text, text: text,
                created: Date.now(), createdAt: Date.now(), updatedAt: Date.now(),
            };
            var notes = _db('os_notes', []);
            notes.unshift(note);
            _dbSet('os_notes', notes);
            if (area) area.value = '';
            try { localStorage.removeItem('p67_bd_draft'); } catch (_) {}
            _wc();
            if (typeof window.renderNotes === 'function') window.renderNotes();
            _toast('Saved to Notes \u2014 tap to open', function () {
                if (typeof window.switchTab === 'function') window.switchTab('notes');
                setTimeout(function () {
                    var openFn = window.openNote || window.selectNote || window.loadNote;
                    if (typeof openFn === 'function') { openFn(id); return; }
                    /* Fallback: find and click the note in the list */
                    var items = document.querySelectorAll('[data-note-id="' + id + '"], [data-id="' + id + '"]');
                    if (items.length) { items[0].click(); return; }
                    /* Last resort: click the first note item (our note was unshifted to front) */
                    var first = document.querySelector('#notes-list .note-item, #notes-list [class*="note"], .notes-list-item');
                    if (first) first.click();
                }, 350);
            });
        };

        /* Forward drag events to the existing dashboard drag handler */
        widget.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', 'brain-dump');
            widget.classList.add('dragging');
            if (typeof window.wbDragStart === 'function') window.wbDragStart(e);
        });
        widget.addEventListener('dragend', function () { widget.classList.remove('dragging'); });

        return true;
    }, 900, 25000);

    /* ================================================================
       ADD BRAIN DUMP TO THE WIDGETS MODAL
       Whenever #modal-widgets opens, append a Brain Dump row to
       #wp-widget-list so users can toggle it there.
       ================================================================ */
    _wait(function () {
        if (typeof window.openModal !== 'function') return false;
        if (window._p68widgetHooked) return true;
        window._p68widgetHooked = true;

        var _origOM = window.openModal;
        window.openModal = function (id) {
            _origOM.apply(this, arguments);
            if (id !== 'modal-widgets') return;
            setTimeout(function () {
                var list = document.getElementById('wp-widget-list');
                if (!list || list.querySelector('[data-p68bd]')) return;

                var vis  = _db('p9_widget_vis', {});
                var isOn = vis['brain-dump'] !== false;

                var row = document.createElement('div');
                row.setAttribute('data-p68bd', '1');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--glass-panel);border:1px solid rgba(255,255,255,.06);border-radius:14px;gap:10px;';
                row.innerHTML = [
                    '<div style="display:flex;align-items:center;gap:10px;flex:1;">',
                    '  <div style="width:30px;height:30px;border-radius:9px;background:rgba(59,130,246,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
                    '    <i class="fa-solid fa-brain" style="color:var(--accent,#3b82f6);font-size:.9rem;"></i>',
                    '  </div>',
                    '  <label style="font-size:.85rem;cursor:pointer;">Brain Dump</label>',
                    '</div>',
                    '<div id="p68-bd-toggle" class="wp-toggle' + (isOn ? ' on' : '') + '" style="cursor:pointer;" role="switch" aria-checked="' + isOn + '"></div>',
                ].join('');

                list.appendChild(row);

                row.querySelector('#p68-bd-toggle').onclick = function () {
                    var tog  = this;
                    var next = tog.classList.toggle('on');
                    tog.setAttribute('aria-checked', String(next));
                    var store = _db('p9_widget_vis', {});
                    store['brain-dump'] = next;
                    _dbSet('p9_widget_vis', store);
                    var el = document.getElementById('widget-brain-dump');
                    if (el) el.classList.toggle('widget-hidden', !next);
                };
            }, 320);
        };
        return true;
    }, 600, 20000);

    /* ================================================================
       FIX-04  BRAIN DUMP ALSO TOGGLED FROM SETTINGS
       Expose a global so a settings button can toggle it.
       ================================================================ */
    window.p68_toggleBrainDump = function (show) {
        var store          = _db('p9_widget_vis', {});
        store['brain-dump'] = !!show;
        _dbSet('p9_widget_vis', store);
        var el = document.getElementById('widget-brain-dump');
        if (el) el.classList.toggle('widget-hidden', !show);
        if (show && !el) {
            /* Re-inject if it was removed */
            _dbSet('p67_brain_dump_hidden', false);
            location.reload();
        }
    };

    /* ================================================================
       FIX-05  AI SIDEBAR — COMPACT FLOATING PANEL
       Shrinks the patches66 full-height sidebar to a compact
       280×400 px floating panel in the bottom-right of the notes view.
       ================================================================ */
    _wait(function () {
        var panel = document.getElementById('note-groq-chat-panel');
        if (!panel || panel.dataset.p68ai) return false;
        panel.dataset.p68ai = '1';

        /* Override the full-height sidebar styles */
        panel.style.cssText = [
            'position:fixed',
            'right:20px',
            'bottom:80px',
            'top:auto',
            'width:300px',
            'max-height:420px',
            'border-radius:18px',
            'border:1px solid var(--glass-border)',
            'background:var(--bg-color)',
            'box-shadow:0 12px 40px rgba(0,0,0,.3)',
            'display:flex',
            'flex-direction:column',
            'z-index:5000',
            'overflow:hidden',
        ].join(';');

        /* Ensure hidden class properly hides it */
        if (!document.getElementById('p68-ai-style')) {
            var s = document.createElement('style');
            s.id          = 'p68-ai-style';
            s.textContent = '#note-groq-chat-panel.hidden{display:none!important}' +
                            '#note-groq-chat-panel .flex-1{max-height:240px;overflow-y:auto;}';
            document.head.appendChild(s);
        }
        return true;
    }, 600, 20000);

    /* ================================================================
       FIX-06  GEOGEBRA — SIDE-BY-SIDE WITH CLOSE BUTTON
       When the Graphing tab is active, the calc view becomes a two-
       column flex row: existing calculator on the left, GeoGebra on
       the right. A close button on the right panel restores the layout.
       ================================================================ */
    _wait(function () {
        var calcView = document.getElementById('view-calc');
        var ggbBtn   = document.getElementById('p67-ggb-btn');
        var ggbPanel = document.getElementById('p67-ggb-panel');
        if (!calcView || !ggbBtn || !ggbPanel || ggbBtn.dataset.p68) return false;
        ggbBtn.dataset.p68 = '1';

        /* Wrap existing calculator content (everything except our panel) */
        if (!document.getElementById('p68-calc-inner')) {
            var inner = document.createElement('div');
            inner.id  = 'p68-calc-inner';
            inner.style.cssText = 'flex:1;min-width:0;';
            /* Move all existing calc children into the inner wrapper */
            var children = Array.from(calcView.children);
            children.forEach(function (c) {
                if (c.id !== 'p67-ggb-panel') inner.appendChild(c);
            });
            calcView.appendChild(inner);
            /* Re-append our panel */
            calcView.appendChild(ggbPanel);
        }

        /* Rebuild GeoGebra panel with close button */
        ggbPanel.style.cssText = [
            'display:none',
            'flex-direction:column',
            'flex:2',
            'min-width:0',
            'border-radius:16px',
            'overflow:hidden',
            'border:1px solid var(--glass-border)',
            'min-height:500px',
        ].join(';');

        if (!ggbPanel.querySelector('#p68-ggb-close')) {
            var closeBar = document.createElement('div');
            closeBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--glass-panel);border-bottom:1px solid var(--glass-border);flex-shrink:0;';
            closeBar.innerHTML = '<span style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;"><i class="fa-solid fa-chart-line" style="color:var(--accent);margin-right:6px;"></i>GeoGebra Graphing</span>' +
                '<button id="p68-ggb-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.85rem;padding:2px 6px;border-radius:6px;"><i class="fa-solid fa-xmark"></i> Close</button>';

            /* Move existing iframe (if any) after the close bar */
            var existingIframe = ggbPanel.querySelector('iframe');
            ggbPanel.innerHTML = '';
            ggbPanel.appendChild(closeBar);
            if (existingIframe) {
                existingIframe.style.cssText = 'width:100%;flex:1;border:none;';
                ggbPanel.appendChild(existingIframe);
            }
        }

        /* Override the tab button click to use side-by-side */
        ggbBtn.onclick = function () {
            /* Switch to side-by-side layout */
            calcView.style.cssText = 'display:flex;flex-direction:row;gap:14px;align-items:stretch;';

            var inner2 = document.getElementById('p68-calc-inner');
            if (inner2) inner2.style.cssText = 'flex:1;min-width:280px;max-width:420px;overflow-y:auto;';

            ggbPanel.style.display        = 'flex';
            ggbPanel.style.flexDirection  = 'column';

            /* Load iframe if not already loaded */
            if (!ggbPanel.querySelector('iframe')) {
                var iframe     = document.createElement('iframe');
                iframe.src     = 'https://www.geogebra.org/graphing?embed';
                iframe.title   = 'GeoGebra Graphing';
                iframe.allow   = 'fullscreen';
                iframe.loading = 'lazy';
                iframe.style.cssText = 'width:100%;flex:1;border:none;min-height:460px;';
                ggbPanel.appendChild(iframe);
            }

            /* Style active tab */
            var tabBar = calcView.querySelector('#p68-calc-inner .flex, #p68-calc-inner .calc-tabs');
            if (!tabBar) tabBar = document.querySelector('.calc-tabs');
            if (tabBar) {
                tabBar.querySelectorAll('button').forEach(function (b) {
                    b.style.background  = 'var(--glass-panel)';
                    b.style.color       = 'var(--text-muted)';
                    b.style.borderColor = 'var(--glass-border)';
                });
            }
            ggbBtn.style.background  = 'var(--accent,#3b82f6)';
            ggbBtn.style.color       = '#fff';
            ggbBtn.style.borderColor = 'transparent';
        };

        /* Close button */
        _wait(function () {
            var closeBtn = document.getElementById('p68-ggb-close');
            if (!closeBtn || closeBtn.dataset.p68) return false;
            closeBtn.dataset.p68 = '1';
            closeBtn.onclick = function () {
                calcView.style.cssText = '';
                ggbPanel.style.display = 'none';
                var inner2 = document.getElementById('p68-calc-inner');
                if (inner2) inner2.style.cssText = '';
                ggbBtn.style.background  = 'var(--glass-panel)';
                ggbBtn.style.color       = 'var(--text-muted)';
                ggbBtn.style.borderColor = 'var(--glass-border)';
            };
            return true;
        }, 200, 8000);

        return true;
    }, 1000, 25000);

    /* ================================================================
       FIX-07  REMOVE OFFLINE INDICATOR
       Hide the p67 wifi badge and stop the state listeners.
       ================================================================ */
    _wait(function () {
        var badge = document.getElementById('p67-net-badge');
        if (badge) badge.remove();
        /* Prevent re-injection from patches67 if it polls */
        window._p67netBadgeRemoved = true;
        return true;
    }, 300, 10000);

    /* Observe for re-injection and remove again */
    if (typeof MutationObserver !== 'undefined') {
        var _p68netObs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.id === 'p67-net-badge') node.remove();
                });
            });
        });
        _p68netObs.observe(document.body, { childList: true, subtree: false });
    }

    console.log('[patches68] loaded — login flash, GitHub UX, Brain Dump widget, AI compact, GeoGebra split, UI uniformization');
}());
