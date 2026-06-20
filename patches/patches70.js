/* ================================================================
   StudentOS — patches70.js

   EMERGENCY-01  Login screen broken by patches69.css — fixed inline
   EMERGENCY-02  Splash timeout reduced, hide triggers improved
   FEATURE-26    Flashcard sharing: public decks, community browse,
                 upvotes, share link, QR code
   FEATURE-28    Card image URL support (front + back)
   FEATURE-30    Study modes: Multiple Choice, Written, Timed

   INSTALL — add after patches69 lines in index.html:
     <link rel="stylesheet" href="patches/patches70.css">
     <script type="module" src="patches/patches70.js"></script>
   ================================================================ */

/* ================================================================
   EMERGENCY-01  FIX LOGIN SCREEN
   Inject a blocking style that overrides patches69.css's bad rule
   which set `.p67-login-wrap { display:none !important }`.
   Runs the instant the script is parsed — before anything else.
   ================================================================ */
(function _p70LoginFix() {
    var s = document.createElement('style');
    s.id = 'p70-login-fix';
    s.textContent = [
        /* Un-hide whatever wrapper patches67 or 69 injected */
        '#login-overlay>.p67-login-wrap{display:flex!important;visibility:visible!important}',
        '#login-overlay>.p69-login-wrap{display:flex!important;visibility:visible!important}',
        /* The old single card stays hidden */
        '#login-overlay>.relative.z-10:not(.p67-login-wrap):not(.p69-login-wrap){display:none!important}',
    ].join('');
    (document.head || document.documentElement).insertBefore(s, document.head.firstChild);
})();

/* ================================================================
   EMERGENCY-02  SPLASH IMPROVEMENTS
   Max 2.5 s. Also hides as soon as login overlay or dashboard
   becomes visible, whichever comes first.
   ================================================================ */
(function _p70SplashFix() {
    function _hide() {
        var el = document.getElementById('p69-splash');
        if (!el || el.dataset.gone) return;
        el.dataset.gone = '1';
        el.style.transition = 'opacity .35s';
        el.style.opacity    = '0';
        setTimeout(function () { if (el.parentNode) el.remove(); }, 380);
    }

    /* Poll every 150 ms until something is visible */
    var _iv = setInterval(function () {
        var lo = document.getElementById('login-overlay');
        if (lo && !lo.classList.contains('hidden') &&
            lo.style.display !== 'none' && lo.offsetParent !== null) {
            clearInterval(_iv); _hide(); return;
        }
        var dash = document.querySelector(
            '#view-dashboard:not(.hidden), #main-scroll:not(.hidden), #app:not(.hidden)'
        );
        if (dash) { clearInterval(_iv); _hide(); }
    }, 150);

    /* Hard cap at 2.5 s regardless */
    setTimeout(function () { clearInterval(_iv); _hide(); }, 2500);
})();

(function _p70_init() {
    'use strict';

    /* ── Helpers ────────────────────────────────────────────────── */
    function _wait(fn, iv, mx) {
        iv = iv || 100; mx = mx || 25000;
        var el = 0;
        (function t() { if (fn()) return; el += iv; if (el < mx) setTimeout(t, iv); })();
    }
    function _db(k, d) {
        try {
            if (window.DB && typeof window.DB.get === 'function') return window.DB.get(k, d);
            var v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d;
        } catch (_) { return d; }
    }
    function _dbSet(k, v) {
        try {
            if (window.DB && typeof window.DB.set === 'function') return window.DB.set(k, v);
            localStorage.setItem(k, JSON.stringify(v));
        } catch (_) {}
    }
    function _uid() {
        try {
            if (window.currentUser) return window.currentUser.uid || window.currentUser.id || null;
            return null;
        } catch (_) { return null; }
    }
    function _toast(msg, dur) {
        var t = document.createElement('div');
        t.className   = 'p68-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0'; t.style.transition = 'opacity .35s';
            setTimeout(function () { if (t.parentNode) t.remove(); }, 380);
        }, dur || 3000);
    }

    /* ── Firebase helpers (lazy-loaded) ─────────────────────────── */
    var _fsCache = null;
    async function _fs() {
        if (_fsCache) return _fsCache;
        var mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        _fsCache = { ...mod, db: mod.getFirestore() };
        return _fsCache;
    }

    /* ================================================================
       FEATURE-28  CARD IMAGE URL SUPPORT
       Adds imageUrlFront / imageUrlBack fields to every card editor.
       Renders the image above the card text in all study views.
       ================================================================ */

    /* Patch renderCardList to include image URL inputs */
    _wait(function () {
        if (typeof window.renderCardList !== 'function') return false;
        if (window._p70cardListHooked) return true;
        window._p70cardListHooked = true;

        var _orig = window.renderCardList;
        window.renderCardList = function () {
            _orig.apply(this, arguments);
            _p70addImageInputs();
        };
        return true;
    }, 400, 20000);

    function _p70addImageInputs() {
        var deckId   = window.activeDeckId;
        var decksArr = window.decks || [];
        if (!deckId) return;
        var deck = decksArr.find(function (d) { return d.id === deckId; });
        if (!deck || !deck.cards) return;

        /* Find card editor rows */
        var container = document.getElementById('cards-list-container');
        if (!container) return;

        var rows = Array.from(container.children);
        deck.cards.forEach(function (card, i) {
            var row = rows[i];
            if (!row || row.querySelector('.p70-img-inputs')) return;

            var wrap = document.createElement('div');
            wrap.className = 'p70-img-inputs';

            function _imgInput(label, field) {
                var d  = document.createElement('div');
                d.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:4px;';
                var lbl = document.createElement('span');
                lbl.textContent = label;
                lbl.style.cssText = 'font-size:.65rem;color:var(--text-muted);white-space:nowrap;';
                var inp = document.createElement('input');
                inp.type        = 'url';
                inp.className   = 'bare-input';
                inp.style.cssText = 'flex:1;font-size:.75rem;padding:5px 8px;';
                inp.placeholder = 'https://i.imgur.com/…';
                inp.value       = card[field] || '';
                inp.oninput     = function () {
                    card[field] = inp.value.trim();
                    _dbSet('os_decks', decksArr);
                };
                d.appendChild(lbl);
                d.appendChild(inp);
                return d;
            }

            wrap.appendChild(_imgInput('Front image:', 'imageUrlFront'));
            wrap.appendChild(_imgInput('Back image:',  'imageUrlBack'));
            row.appendChild(wrap);
        });
    }

    /* Patch the card flip display to show images */
    _wait(function () {
        if (typeof window.showStudyCard !== 'function') return false;
        if (window._p70studyCardHooked) return true;
        window._p70studyCardHooked = true;

        var _orig = window.showStudyCard;
        window.showStudyCard = function () {
            _orig.apply(this, arguments);
            setTimeout(_p70injectCardImage, 30);
        };
        return true;
    }, 400, 20000);

    function _p70injectCardImage() {
        var queue = window.studyQueue || [];
        var idx   = window.studyIdx   || 0;
        var card  = queue[idx];
        if (!card) return;

        /* Find front and back faces */
        ['Front', 'Back'].forEach(function (side) {
            var field  = 'imageUrl' + side;
            var url    = card[field];
            var faceEl = document.querySelector(
                '.study-card-' + side.toLowerCase() + ', [class*="card-' + side.toLowerCase() + '"]'
            );
            if (!faceEl) return;
            var existing = faceEl.querySelector('.p70-card-img-wrap');
            if (url) {
                if (!existing) {
                    var wrap = document.createElement('div');
                    wrap.className = 'p70-card-img-wrap';
                    var img = document.createElement('img');
                    img.className = 'p70-card-img';
                    img.loading   = 'lazy';
                    img.onerror   = function () { wrap.style.display = 'none'; };
                    wrap.appendChild(img);
                    faceEl.insertBefore(wrap, faceEl.firstChild);
                    existing = wrap;
                }
                existing.querySelector('img').src = url;
                existing.style.display = '';
            } else if (existing) {
                existing.style.display = 'none';
            }
        });
    }

    /* ================================================================
       FEATURE-30  STUDY MODES
       Intercepts the study-start flow to offer a mode selector.
       Modes: Flashcard (default) · Multiple Choice · Written · Timed
       ================================================================ */

    var _p70studyMode  = 'flashcard';
    var _p70timedSecs  = 20;
    var _p70timerTick  = null;
    var _p70timerLeft  = 0;

    /* Hook startStudy / whatever function launches study view */
    _wait(function () {
        var names = ['startStudy', 'studyDeck', 'openStudy', 'beginStudy'];
        var name  = names.find(function (n) { return typeof window[n] === 'function'; });
        if (!name) return false;
        if (window['_p70' + name + 'H']) return true;
        window['_p70' + name + 'H'] = true;

        var _orig = window[name];
        window[name] = function () {
            var args = arguments;
            _p70showModeSelector(function () { _orig.apply(window, args); });
        };
        return true;
    }, 400, 25000);

    function _p70showModeSelector(onStart) {
        if (document.getElementById('p70-mode-modal')) { onStart(); return; }

        var modal = document.createElement('div');
        modal.id  = 'p70-mode-modal';
        modal.className = 'p70-mode-overlay';
        modal.innerHTML = [
            '<div class="p70-mode-card">',
            '  <div class="p70-mode-title">',
            '    <i class="fa-solid fa-layer-group" style="color:var(--accent);"></i> Choose Study Mode',
            '  </div>',

            '  <div class="p70-mode-grid">',
            '    <button class="p70-mode-opt active" data-mode="flashcard">',
            '      <i class="fa-solid fa-clone"></i>',
            '      <span>Flashcard</span>',
            '      <small>Flip to reveal</small>',
            '    </button>',
            '    <button class="p70-mode-opt" data-mode="mc">',
            '      <i class="fa-solid fa-list-check"></i>',
            '      <span>Multiple Choice</span>',
            '      <small>4 options, pick one</small>',
            '    </button>',
            '    <button class="p70-mode-opt" data-mode="written">',
            '      <i class="fa-solid fa-keyboard"></i>',
            '      <span>Written</span>',
            '      <small>Type the answer</small>',
            '    </button>',
            '    <button class="p70-mode-opt" data-mode="timed">',
            '      <i class="fa-solid fa-stopwatch"></i>',
            '      <span>Timed</span>',
            '      <small>Race the clock</small>',
            '    </button>',
            '  </div>',

            '  <div id="p70-timed-cfg" class="p70-timed-cfg" style="display:none;">',
            '    <label style="font-size:.78rem;color:var(--text-muted);">Seconds per card</label>',
            '    <div style="display:flex;gap:8px;margin-top:6px;">',
            '      <button class="p70-sec-btn active" data-s="10">10 s</button>',
            '      <button class="p70-sec-btn"        data-s="20">20 s</button>',
            '      <button class="p70-sec-btn"        data-s="30">30 s</button>',
            '    </div>',
            '  </div>',

            '  <div class="p70-mode-actions">',
            '    <button id="p70-mode-cancel" class="p70-mode-btn-sec">Cancel</button>',
            '    <button id="p70-mode-start"  class="p70-mode-btn-pri">',
            '      <i class="fa-solid fa-play"></i> Start',
            '    </button>',
            '  </div>',
            '</div>',
        ].join('');

        document.body.appendChild(modal);

        /* Mode option clicks */
        modal.querySelectorAll('.p70-mode-opt').forEach(function (btn) {
            btn.onclick = function () {
                modal.querySelectorAll('.p70-mode-opt').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                _p70studyMode = btn.dataset.mode;
                document.getElementById('p70-timed-cfg').style.display =
                    (_p70studyMode === 'timed') ? '' : 'none';
            };
        });

        /* Timed seconds buttons */
        modal.querySelectorAll('.p70-sec-btn').forEach(function (btn) {
            btn.onclick = function () {
                modal.querySelectorAll('.p70-sec-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                _p70timedSecs = parseInt(btn.dataset.s, 10);
            };
        });

        document.getElementById('p70-mode-cancel').onclick = function () { modal.remove(); };
        document.getElementById('p70-mode-start').onclick  = function () {
            modal.remove();
            onStart();
            /* After the study view opens, override the card renderer */
            setTimeout(function () {
                if (_p70studyMode !== 'flashcard') _p70overrideStudyRenderer();
            }, 300);
        };
    }

    /* ── Multiple Choice ─────────────────────────────────────────── */
    function _p70getWrongAnswers(correctCard) {
        var allCards = window.studyQueue || [];
        var pool     = allCards.filter(function (c) { return c.id !== correctCard.id && c.back; });
        /* Shuffle and take 3 */
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        return pool.slice(0, 3).map(function (c) { return c.back || c.answer || c.definition || ''; });
    }

    function _p70showMcCard(card, container) {
        var correct = card.back || card.answer || card.definition || '';
        var wrongs  = _p70getWrongAnswers(card);
        var options = [correct].concat(wrongs);
        /* Shuffle options */
        for (var i = options.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = options[i]; options[i] = options[j]; options[j] = tmp;
        }

        var html = [
            '<div class="p70-mc-wrap">',
            '  <div class="p70-mc-question">' + (card.front || card.question || card.term || '') + '</div>',
            '  <div class="p70-mc-options">',
        ].concat(options.map(function (opt, idx) {
            return '<button class="p70-mc-opt" data-correct="' + (opt === correct ? '1' : '0') + '">' +
                   '<span class="p70-mc-letter">' + ['A','B','C','D'][idx] + '</span>' +
                   '<span class="p70-mc-text">' + opt + '</span>' +
                   '</button>';
        })).concat(['  </div>', '</div>']).join('');

        container.innerHTML = html;

        container.querySelectorAll('.p70-mc-opt').forEach(function (btn) {
            btn.onclick = function () {
                var isCorrect = btn.dataset.correct === '1';
                /* Show feedback */
                container.querySelectorAll('.p70-mc-opt').forEach(function (b) {
                    if (b.dataset.correct === '1') b.classList.add('correct');
                    else b.classList.add('wrong');
                    b.disabled = true;
                });
                btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
                setTimeout(function () {
                    if (typeof window.showStudyCard === 'function') {
                        window.studyIdx = (window.studyIdx || 0) + 1;
                        window.showStudyCard();
                        setTimeout(function () { _p70overrideStudyRenderer(); }, 80);
                    }
                }, 1000);
            };
        });
    }

    /* ── Written mode ────────────────────────────────────────────── */
    function _p70fuzzyMatch(answer, correct) {
        var a = answer.trim().toLowerCase();
        var b = correct.trim().toLowerCase();
        if (a === b) return true;
        /* Check if answer contains all key words from correct */
        var keywords = b.split(/\s+/).filter(function (w) { return w.length > 3; });
        if (!keywords.length) return a.includes(b) || b.includes(a);
        var matched = keywords.filter(function (w) { return a.includes(w); });
        return matched.length >= Math.ceil(keywords.length * 0.7);
    }

    function _p70showWrittenCard(card, container) {
        var correct = card.back || card.answer || card.definition || '';
        container.innerHTML = [
            '<div class="p70-written-wrap">',
            '  <div class="p70-written-question">' + (card.front || card.question || card.term || '') + '</div>',
            '  <div class="p70-written-input-wrap">',
            '    <input id="p70-written-inp" type="text" class="bare-input p70-written-inp"',
            '           placeholder="Type your answer\u2026" autocomplete="off">',
            '    <button id="p70-written-check" class="p70-written-btn">',
            '      <i class="fa-solid fa-check"></i> Check',
            '    </button>',
            '  </div>',
            '  <div id="p70-written-fb" class="p70-written-fb" style="display:none;"></div>',
            '</div>',
        ].join('');

        var inp    = container.querySelector('#p70-written-inp');
        var checkBtn = container.querySelector('#p70-written-check');
        var fb     = container.querySelector('#p70-written-fb');

        function _check() {
            var answer    = inp.value;
            var isCorrect = _p70fuzzyMatch(answer, correct);
            fb.style.display = '';
            fb.className     = 'p70-written-fb ' + (isCorrect ? 'p70-fb-correct' : 'p70-fb-wrong');
            fb.innerHTML     = (isCorrect
                ? '<i class="fa-solid fa-circle-check"></i> Correct!'
                : '<i class="fa-solid fa-circle-xmark"></i> The answer was: <strong>' + correct + '</strong>');
            checkBtn.disabled = true;
            inp.disabled      = true;
            setTimeout(function () {
                if (typeof window.showStudyCard === 'function') {
                    window.studyIdx = (window.studyIdx || 0) + 1;
                    window.showStudyCard();
                    setTimeout(function () { _p70overrideStudyRenderer(); }, 80);
                }
            }, 1500);
        }

        checkBtn.onclick = _check;
        inp.onkeydown    = function (e) { if (e.key === 'Enter') _check(); };
        setTimeout(function () { if (inp) inp.focus(); }, 100);
    }

    /* ── Timed mode ──────────────────────────────────────────────── */
    function _p70showTimedCard(card, container) {
        /* Build a flashcard with a countdown bar on top */
        var timerHtml = [
            '<div class="p70-timed-bar-wrap">',
            '  <div id="p70-timed-bar" class="p70-timed-bar" style="width:100%;"></div>',
            '  <span id="p70-timed-num" class="p70-timed-num">' + _p70timedSecs + '</span>',
            '</div>',
        ].join('');

        /* Prepend timer bar to the study card area */
        var existingBar = container.querySelector('.p70-timed-bar-wrap');
        if (!existingBar) {
            var barEl = document.createElement('div');
            barEl.innerHTML = timerHtml;
            container.insertBefore(barEl.firstChild, container.firstChild);
        }

        /* Restart countdown */
        clearInterval(_p70timerTick);
        _p70timerLeft = _p70timedSecs;
        var barEl2  = container.querySelector('#p70-timed-bar');
        var numEl   = container.querySelector('#p70-timed-num');
        _p70timerTick = setInterval(function () {
            _p70timerLeft--;
            if (barEl2) barEl2.style.width = ((_p70timerLeft / _p70timedSecs) * 100) + '%';
            if (numEl)  numEl.textContent  = _p70timerLeft;
            if (_p70timerLeft <= 0) {
                clearInterval(_p70timerTick);
                /* Auto-advance */
                if (typeof window.showStudyCard === 'function') {
                    window.studyIdx = (window.studyIdx || 0) + 1;
                    window.showStudyCard();
                    setTimeout(function () { _p70overrideStudyRenderer(); }, 80);
                }
            }
        }, 1000);
    }

    /* ── Override the study card renderer after mode selection ───── */
    function _p70overrideStudyRenderer() {
        if (_p70studyMode === 'flashcard') return; /* Default behaviour */

        var queue = window.studyQueue || [];
        var idx   = window.studyIdx   || 0;
        if (idx >= queue.length) return; /* Session ended */

        var card = queue[idx];
        if (!card) return;

        /* Find the study card container */
        var container = document.querySelector(
            '#cards-study-view, .study-card-container, [id*="study-card"], [class*="study-view"]'
        );
        if (!container) return;

        /* Clear countdown if switching away from timed */
        if (_p70studyMode !== 'timed') clearInterval(_p70timerTick);

        if (_p70studyMode === 'mc')      _p70showMcCard(card, container);
        if (_p70studyMode === 'written') _p70showWrittenCard(card, container);
        if (_p70studyMode === 'timed')   _p70showTimedCard(card, container);
    }

    /* ================================================================
       FEATURE-26  FLASHCARD SHARING
       Public decks · Community browse · Upvotes · Share link · QR
       ================================================================ */

    /* ── Add share controls to deck header ───────────────────────── */
    _wait(function () {
        var decksView = document.getElementById('view-flashcards') ||
                        document.getElementById('view-cards')      ||
                        document.querySelector('[id*="flashcard"]');
        if (!decksView || document.getElementById('p70-community-btn')) return false;

        /* Find the deck list header */
        var header = decksView.querySelector('h2, h3, .section-header, [class*="header"]');
        if (!header) return false;

        var btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin-left:auto;';

        var communityBtn = document.createElement('button');
        communityBtn.id        = 'p70-community-btn';
        communityBtn.className = 'p70-share-btn';
        communityBtn.title     = 'Community Decks';
        communityBtn.innerHTML = '<i class="fa-solid fa-globe"></i> Community';
        communityBtn.onclick   = _p70openCommunity;
        btnWrap.appendChild(communityBtn);

        var parent = header.parentElement || decksView;
        var headerWrap = header.parentElement;
        if (headerWrap) {
            headerWrap.style.cssText += ';display:flex;align-items:center;flex-wrap:wrap;gap:8px;';
            headerWrap.appendChild(btnWrap);
        }
        return true;
    }, 700, 25000);

    /* Add share button to each rendered deck card */
    _wait(function () {
        if (typeof window.renderDecks !== 'function') return false;
        if (window._p70renderDecksHooked) return true;
        window._p70renderDecksHooked = true;

        var _orig = window.renderDecks;
        window.renderDecks = function () {
            _orig.apply(this, arguments);
            setTimeout(_p70injectDeckShareBtns, 150);
        };
        return true;
    }, 400, 20000);

    function _p70injectDeckShareBtns() {
        var decksArr = window.decks || [];
        decksArr.forEach(function (deck) {
            /* Find the deck card element */
            var card = document.querySelector(
                '[data-deck-id="' + deck.id + '"], [data-id="' + deck.id + '"]'
            );
            if (!card || card.querySelector('.p70-deck-share')) return;

            var shareRow = document.createElement('div');
            shareRow.className = 'p70-deck-share';
            shareRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--glass-border);';

            /* Public toggle */
            var isPublic  = !!(deck.isPublic);
            var toggleLbl = document.createElement('span');
            toggleLbl.textContent = 'Public';
            toggleLbl.style.cssText = 'font-size:.72rem;color:var(--text-muted);';

            var toggle = document.createElement('div');
            toggle.className = 'wp-toggle' + (isPublic ? ' on' : '');
            toggle.style.cssText = 'cursor:pointer;flex-shrink:0;';
            toggle.setAttribute('role', 'switch');
            toggle.setAttribute('aria-checked', String(isPublic));
            toggle.onclick = function () {
                var next = toggle.classList.toggle('on');
                toggle.setAttribute('aria-checked', String(next));
                deck.isPublic = next;
                _dbSet('os_decks', decksArr);
                _p70syncPublicDeck(deck, next);
                _toast(next ? 'Deck is now public — anyone can find it.' : 'Deck set to private.');
            };

            /* Share link button */
            var shareBtn = document.createElement('button');
            shareBtn.className = 'p70-share-icon-btn';
            shareBtn.title     = 'Share link & QR code';
            shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
            shareBtn.style.cssText = 'margin-left:auto;';
            shareBtn.onclick = function () { _p70showShareModal(deck); };

            shareRow.appendChild(toggleLbl);
            shareRow.appendChild(toggle);
            shareRow.appendChild(shareBtn);
            card.appendChild(shareRow);
        });
    }

    /* Sync public/private status to Firestore */
    async function _p70syncPublicDeck(deck, makePublic) {
        try {
            var f = await _fs();
            var uid = _uid();
            if (!uid) return;

            var publicRef = f.doc(f.db, 'publicDecks', deck.id);

            if (makePublic) {
                var user = window.currentUser || {};
                await f.setDoc(publicRef, {
                    id:          deck.id,
                    title:       deck.title    || 'Untitled',
                    description: deck.description || '',
                    authorName:  user.displayName  || user.email || 'Student',
                    authorUid:   uid,
                    cardCount:   (deck.cards || []).length,
                    cards:       (deck.cards || []).map(function (c) {
                        return { front: c.front || c.term || c.question || '', back: c.back || c.answer || c.definition || '',
                                 imageUrlFront: c.imageUrlFront || '', imageUrlBack: c.imageUrlBack || '' };
                    }),
                    upvotes:     deck.upvotes || {},
                    upvoteCount: Object.keys(deck.upvotes || {}).length,
                    subject:     deck.subject  || '',
                    createdAt:   deck.created  || Date.now(),
                    updatedAt:   Date.now(),
                }, { merge: true });
            } else {
                await f.deleteDoc(publicRef);
            }
        } catch (e) { console.warn('[p70] syncPublicDeck:', e); }
    }

    /* ── Share Modal (link + QR) ─────────────────────────────────── */
    function _p70showShareModal(deck) {
        if (document.getElementById('p70-share-modal')) document.getElementById('p70-share-modal').remove();

        var shareUrl = window.location.origin + window.location.pathname + '?sharedDeck=' + deck.id;
        var qrUrl    = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(shareUrl);

        var modal = document.createElement('div');
        modal.id  = 'p70-share-modal';
        modal.className = 'p70-share-overlay';
        modal.innerHTML = [
            '<div class="p70-share-card">',
            '  <div class="p70-share-head">',
            '    <span><i class="fa-solid fa-share-nodes" style="color:var(--accent);margin-right:7px;"></i>Share Deck</span>',
            '    <button id="p70-share-close" class="p70-share-close"><i class="fa-solid fa-xmark"></i></button>',
            '  </div>',
            '  <p class="p70-share-deck-name">' + (deck.title || 'Untitled') + '</p>',
            '  <div class="p70-share-body">',
            '    <div class="p70-share-qr-wrap">',
            '      <img src="' + qrUrl + '" alt="QR Code" class="p70-qr-img" loading="lazy">',
            '      <span style="font-size:.68rem;color:var(--text-muted);margin-top:6px;text-align:center;">Scan to open</span>',
            '    </div>',
            '    <div class="p70-share-link-wrap">',
            '      <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);">Share link</label>',
            '      <div class="p70-share-link-row">',
            '        <input id="p70-share-url" type="text" class="bare-input" value="' + shareUrl + '" readonly style="font-size:.75rem;">',
            '        <button id="p70-copy-url" class="p70-copy-btn"><i class="fa-solid fa-copy"></i></button>',
            '      </div>',
            '      <p style="font-size:.75rem;color:var(--text-muted);line-height:1.5;margin-top:10px;">',
            '        Anyone with this link can preview the deck and add it to their library.',
            '        The deck must be set to <strong style="color:var(--text-main);">Public</strong> for the link to work.',
            '      </p>',
            '    </div>',
            '  </div>',
            '</div>',
        ].join('');

        document.body.appendChild(modal);

        document.getElementById('p70-share-close').onclick = function () { modal.remove(); };
        modal.onclick = function (e) { if (e.target === modal) modal.remove(); };

        document.getElementById('p70-copy-url').onclick = function () {
            navigator.clipboard.writeText(shareUrl).then(function () {
                _toast('Link copied to clipboard.');
                document.getElementById('p70-copy-url').innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(function () {
                    var b = document.getElementById('p70-copy-url');
                    if (b) b.innerHTML = '<i class="fa-solid fa-copy"></i>';
                }, 2000);
            }).catch(function () {
                document.getElementById('p70-share-url').select();
            });
        };
    }

    /* ── Community Decks Browser ─────────────────────────────────── */
    async function _p70openCommunity() {
        if (document.getElementById('p70-community-modal')) {
            document.getElementById('p70-community-modal').remove();
        }

        var modal = document.createElement('div');
        modal.id  = 'p70-community-modal';
        modal.className = 'p70-community-overlay';
        modal.innerHTML = [
            '<div class="p70-community-card">',
            '  <div class="p70-community-head">',
            '    <span><i class="fa-solid fa-globe" style="color:var(--accent);margin-right:7px;"></i>Community Decks</span>',
            '    <button id="p70-comm-close"><i class="fa-solid fa-xmark"></i></button>',
            '  </div>',
            '  <div class="p70-community-search-row">',
            '    <i class="fa-solid fa-magnifying-glass" style="color:var(--text-muted);"></i>',
            '    <input id="p70-comm-search" type="text" class="bare-input" placeholder="Search decks\u2026" style="border:none;background:transparent;box-shadow:none;">',
            '  </div>',
            '  <div id="p70-comm-grid" class="p70-comm-grid">',
            '    <div class="p70-comm-loading"><div class="p69-spinner"></div>Loading decks\u2026</div>',
            '  </div>',
            '</div>',
        ].join('');

        document.body.appendChild(modal);

        document.getElementById('p70-comm-close').onclick = function () { modal.remove(); };
        modal.onclick = function (e) { if (e.target === modal) modal.remove(); };

        var allDecks = [];

        /* Load decks from Firestore */
        try {
            var f    = await _fs();
            var snap = await f.getDocs(f.collection(f.db, 'publicDecks'));
            snap.forEach(function (d) { allDecks.push({ id: d.id, ...d.data() }); });
        } catch (e) {
            document.getElementById('p70-comm-grid').innerHTML =
                '<p style="color:var(--text-muted);text-align:center;padding:20px;">Could not load community decks. Make sure Firestore rules allow reading the publicDecks collection.</p>';
            return;
        }

        function _renderDecks(list) {
            var grid = document.getElementById('p70-comm-grid');
            if (!grid) return;
            if (!list.length) {
                grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:24px;">No public decks found yet. Be the first to share one!</p>';
                return;
            }
            grid.innerHTML = list.map(function (deck) {
                var uid        = _uid();
                var upvoted    = uid && deck.upvotes && deck.upvotes[uid];
                var upvoteCnt  = Object.keys(deck.upvotes || {}).length;
                return [
                    '<div class="p70-comm-deck-card" data-deck-id="' + deck.id + '">',
                    '  <div class="p70-comm-deck-title">' + (deck.title || 'Untitled') + '</div>',
                    '  <div class="p70-comm-deck-meta">',
                    '    <span><i class="fa-solid fa-user" style="margin-right:4px;opacity:.6;"></i>' + (deck.authorName || 'Anonymous') + '</span>',
                    '    <span><i class="fa-solid fa-clone" style="margin-right:4px;opacity:.6;"></i>' + (deck.cardCount || 0) + ' cards</span>',
                    '  </div>',
                    '  <div class="p70-comm-deck-actions">',
                    '    <button class="p70-upvote-btn' + (upvoted ? ' upvoted' : '') + '" data-id="' + deck.id + '">',
                    '      <i class="fa-' + (upvoted ? 'solid' : 'regular') + ' fa-heart"></i> ' + upvoteCnt,
                    '    </button>',
                    '    <button class="p70-add-btn" data-id="' + deck.id + '">',
                    '      <i class="fa-solid fa-plus"></i> Add to Library',
                    '    </button>',
                    '  </div>',
                    '</div>',
                ].join('');
            }).join('');

            /* Upvote buttons */
            grid.querySelectorAll('.p70-upvote-btn').forEach(function (btn) {
                btn.onclick = async function () {
                    var uid2 = _uid();
                    if (!uid2) { _toast('Sign in to upvote decks.'); return; }
                    var deckId  = btn.dataset.id;
                    var deckObj = allDecks.find(function (d) { return d.id === deckId; });
                    if (!deckObj) return;
                    deckObj.upvotes = deckObj.upvotes || {};
                    var wasUpvoted = !!deckObj.upvotes[uid2];
                    if (wasUpvoted) delete deckObj.upvotes[uid2];
                    else deckObj.upvotes[uid2] = true;
                    var newCount = Object.keys(deckObj.upvotes).length;
                    btn.innerHTML = '<i class="fa-' + (!wasUpvoted ? 'solid' : 'regular') + ' fa-heart"></i> ' + newCount;
                    btn.classList.toggle('upvoted', !wasUpvoted);
                    /* Persist to Firestore */
                    try {
                        var f2 = await _fs();
                        await f2.updateDoc(f2.doc(f2.db, 'publicDecks', deckId), {
                            ['upvotes.' + uid2]: wasUpvoted ? f2.deleteField() : true,
                            upvoteCount: newCount,
                        });
                    } catch (e2) { console.warn('[p70] upvote:', e2); }
                };
            });

            /* Add to Library buttons */
            grid.querySelectorAll('.p70-add-btn').forEach(function (btn) {
                btn.onclick = function () {
                    var deckId  = btn.dataset.id;
                    var deckObj = allDecks.find(function (d) { return d.id === deckId; });
                    if (!deckObj) return;
                    _p70addToLibrary(deckObj);
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
                    btn.disabled  = true;
                };
            });
        }

        _renderDecks(allDecks);

        /* Search */
        document.getElementById('p70-comm-search').oninput = function () {
            var q = this.value.trim().toLowerCase();
            _renderDecks(q ? allDecks.filter(function (d) {
                return (d.title || '').toLowerCase().includes(q) ||
                       (d.authorName || '').toLowerCase().includes(q) ||
                       (d.subject || '').toLowerCase().includes(q);
            }) : allDecks);
        };
    }

    function _p70addToLibrary(publicDeck) {
        var myDecks = window.decks || _db('os_decks', []);
        /* Avoid duplicates */
        if (myDecks.some(function (d) { return d.id === publicDeck.id || d.title === publicDeck.title; })) {
            _toast('You already have a deck with this name in your library.');
            return;
        }
        var newDeck = {
            id:          'copy_' + publicDeck.id + '_' + Date.now().toString(36),
            title:       publicDeck.title + ' (from community)',
            description: publicDeck.description || '',
            cards:       (publicDeck.cards || []).map(function (c) {
                return { id: Math.random().toString(36).slice(2), front: c.front, back: c.back,
                         imageUrlFront: c.imageUrlFront || '', imageUrlBack: c.imageUrlBack || '' };
            }),
            created:     Date.now(),
            isPublic:    false,
        };
        myDecks.push(newDeck);
        window.decks = myDecks;
        _dbSet('os_decks', myDecks);
        if (typeof window.renderDecks === 'function') window.renderDecks();
        _toast('"' + publicDeck.title + '" added to your library.');
    }

    /* ── Handle ?sharedDeck= URL param on page load ──────────────── */
    _wait(function () {
        var params  = new URLSearchParams(window.location.search);
        var deckId  = params.get('sharedDeck');
        if (!deckId) return true; /* Nothing to do */

        /* Load the shared deck from publicDecks */
        (async function () {
            try {
                var f    = await _fs();
                var snap = await f.getDoc(f.doc(f.db, 'publicDecks', deckId));
                if (!snap.exists()) { _toast('This shared deck could not be found.'); return; }
                var deck = { id: snap.id, ...snap.data() };

                var modal = document.createElement('div');
                modal.id  = 'p70-shared-deck-modal';
                modal.className = 'p70-share-overlay';
                modal.innerHTML = [
                    '<div class="p70-share-card">',
                    '  <div class="p70-share-head">',
                    '    <span><i class="fa-solid fa-link" style="color:var(--accent);margin-right:7px;"></i>Shared Deck</span>',
                    '    <button id="p70-sd-close"><i class="fa-solid fa-xmark"></i></button>',
                    '  </div>',
                    '  <p class="p70-share-deck-name">' + (deck.title || 'Untitled') + '</p>',
                    '  <p style="font-size:.82rem;color:var(--text-muted);">',
                    '    Shared by <strong style="color:var(--text-main);">' + (deck.authorName || 'a fellow student') + '</strong>',
                    '    &middot; ' + (deck.cardCount || (deck.cards || []).length) + ' cards',
                    '  </p>',
                    '  <div style="margin-top:12px;display:flex;gap:10px;justify-content:flex-end;">',
                    '    <button id="p70-sd-cancel" class="p70-mode-btn-sec">Maybe later</button>',
                    '    <button id="p70-sd-add"    class="p70-mode-btn-pri">',
                    '      <i class="fa-solid fa-plus"></i> Add to my Library',
                    '    </button>',
                    '  </div>',
                    '</div>',
                ].join('');

                document.body.appendChild(modal);
                document.getElementById('p70-sd-close').onclick  = function () { modal.remove(); };
                document.getElementById('p70-sd-cancel').onclick = function () { modal.remove(); };
                document.getElementById('p70-sd-add').onclick    = function () {
                    _p70addToLibrary(deck);
                    modal.remove();
                    /* Clean URL */
                    window.history.replaceState({}, '', window.location.pathname);
                };
            } catch (e) { console.warn('[p70] sharedDeck load:', e); }
        })();
        return true;
    }, 2000, 20000);

    console.log('[patches70] loaded — Emergency login fix, splash fix, Flashcard sharing, Image URLs, Study modes');
}());
