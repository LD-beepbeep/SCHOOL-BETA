/* ================================================================
   StudentOS — patches66.js (Comprehensive Update)
   1. Premium Login & Authentication UI Grid Layout
   2. Offline Local Storage Guest Workspace Controller
   3. Dynamic Multi-List Tasks Filter Layer (School, Hobbies, etc.)
   4. Fully Redesigned AI Dedicated Workspace Panel (No Button Duplication)
   5. Embedded Glassmorphism Privacy Policy & Terms Modal Engine
   ================================================================ */

(function _p66_comprehensive_init() {
    'use strict';

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

    // Default Fallback Storage Structure
    function _p66DefaultDoc() {
        return {
            os_tasks: [], os_notes: [], os_decks: [], os_goals: [], os_events: {},
            os_subjects: [], os_links: [], os_note_groups: [], os_deck_groups: [],
            os_card_stats: {}, os_streak: { count: 0, lastDate: '' }, os_quick_note: '',
            os_theme: 'dark', os_lang: 'en', os_accent: '#3b82f6', os_font_scale: 1,
            os_task_lists: ['Schoolwork', 'Hobbies', 'Personal'],
            os_active_task_list: 'Schoolwork',
            _createdAt: new Date().toISOString()
        };
    }

    /* ── 1. AUTHENTICATION GRID & PRIVACY COMPONENT ──────────────── */
    _wait(function() {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return false;
        if (overlay.classList.contains('hidden') || overlay.dataset.p66Active === 'true') return false;

        overlay.className = "fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-y-auto p-4 md:p-8 transition-all duration-300";
        overlay.style.backgroundColor = "var(--bg-color)";
        overlay.style.backgroundImage = "radial-gradient(circle at 50% -20%, rgba(59,130,246,0.08), transparent 50%)";

        overlay.innerHTML = `
            <div class="p66-login-wrap w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch my-auto">
                <div class="p66-glass-box flex flex-col justify-between p-6 md:p-8 rounded-2xl border relative overflow-hidden">
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                <i class="fa-solid fa-cloud-arrow-up text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-lg md:text-xl font-bold text-[var(--text-main)]">Cloud Workspace</h3>
                                <p class="text-xs text-[var(--text-muted)]">Highly recommended for data sync</p>
                            </div>
                        </div>
                        <p class="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                            Securely back up your tasks, class notebooks, flashcards, and metrics safely to the cloud. Access your synchronized dashboard on any machine instantly.
                        </p>
                        <div class="space-y-4">
                            <div>
                                <label class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Email Address</label>
                                <input type="email" id="login-email" class="w-full p-3 rounded-xl border bg-black/20 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition" style="border-color: var(--glass-border);" placeholder="student@university.edu">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Password</label>
                                <input type="password" id="login-password" class="w-full p-3 rounded-xl border bg-black/20 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition" style="border-color: var(--glass-border);" placeholder="••••••••">
                            </div>
                        </div>
                        <div id="login-error" class="hidden text-xs mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"></div>
                    </div>
                    <div class="mt-8 space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <button id="p66-action-login" class="py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 font-semibold text-white transition flex items-center justify-center gap-2 shadow-sm"><i class="fa-solid fa-right-to-bracket text-xs"></i> Sign In</button>
                            <button id="p66-action-signup" class="py-3 px-4 rounded-xl border font-semibold text-[var(--text-main)] hover:bg-[var(--glass-hover)] transition flex items-center justify-center gap-2" style="border-color: var(--glass-border);"><i class="fa-solid fa-user-plus text-xs"></i> Register</button>
                        </div>
                        <div class="text-center">
                            <button id="p66-action-forgot" class="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition underline">Forgot credentials?</button>
                        </div>
                        <div class="relative flex py-2 items-center">
                            <div class="flex-grow border-t" style="border-color: var(--glass-border);"></div>
                            <span class="flex-shrink mx-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium">Single Sign-On</span>
                            <div class="flex-grow border-t" style="border-color: var(--glass-border);"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <button id="p66-action-google" class="py-2.5 px-4 rounded-xl border font-medium text-xs text-[var(--text-main)] hover:bg-[var(--glass-hover)] transition flex items-center justify-center gap-2" style="border-color: var(--glass-border);"><i class="fa-brands fa-google text-red-400"></i> Google</button>
                            <button id="p66-action-github" class="py-2.5 px-4 rounded-xl border font-medium text-xs text-[var(--text-main)] hover:bg-[var(--glass-hover)] transition flex items-center justify-center gap-2" style="border-color: var(--glass-border);"><i class="fa-brands fa-github text-purple-400"></i> GitHub</button>
                        </div>
                    </div>
                </div>

                <div class="p66-glass-box flex flex-col justify-between p-6 md:p-8 rounded-2xl border relative overflow-hidden">
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500 text-white shadow-lg shadow-purple-500/20">
                                <i class="fa-solid fa-box-archive text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-lg md:text-xl font-bold text-[var(--text-main)]">Guest Mode</h3>
                                <p class="text-xs text-[var(--text-muted)]">100% Offline Local Session</p>
                            </div>
                        </div>
                        <p class="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                            Skip database setup. Running locally creates a fully private workspace that commits actions straight into your immediate device cache.
                        </p>
                        <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400/90 space-y-2 leading-relaxed">
                            <div class="font-bold flex items-center gap-1.5 text-amber-400"><i class="fa-solid fa-triangle-exclamation"></i> Storage Constraint Details</div>
                            <p>Data remains exclusively locked to this current browser instance. Purging system cookies, upgrading hardware setups, or shifting workspace windows will lose local data permanently.</p>
                        </div>
                    </div>
                    <div class="mt-8">
                        <button id="p66-action-guest" class="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 font-bold text-white shadow-md shadow-indigo-500/10 transition flex items-center justify-center gap-2"><i class="fa-solid fa-laptop text-sm"></i> Launch Guest Workspace</button>
                    </div>
                </div>
            </div>

            <div class="mt-6 text-center text-xs text-[var(--text-muted)]">
                By entering this system, you agree to the 
                <button id="p66-trigger-privacy" class="underline text-[var(--text-main)] hover:text-[var(--accent)] ml-0.5 transition">Privacy Framework</button>.
            </div>
        `;

        overlay.dataset.p66Active = 'true';

        // Action Bindings
        document.getElementById('p66-action-login').onclick  = function() { if (typeof window.signInWithEmail === 'function') window.signInWithEmail(); };
        document.getElementById('p66-action-signup').onclick = function() { if (typeof window.signUpWithEmail === 'function') window.signUpWithEmail(); };
        document.getElementById('p66-action-forgot').onclick = function() { if (typeof window.resetPassword === 'function') window.resetPassword(); };
        document.getElementById('p66-action-google').onclick = function() { if (typeof window.signInWithGoogle === 'function') window.signInWithGoogle(); };

        document.getElementById('p66-trigger-privacy').onclick = function(e) {
            e.preventDefault();
            _p66RenderPrivacyModal();
        };

        document.getElementById('p66-action-github').onclick = async function() {
            try {
                const appMod  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
                const authMod = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
                const authInstance = authMod.getAuth(appMod.getApp());
                const githubProvider = new authMod.GithubAuthProvider();
                await authMod.signInWithPopup(authInstance, githubProvider);
            } catch(err) {
                console.error("GitHub Login Exception:", err);
                const errorBox = document.getElementById('login-error');
                if (errorBox) { errorBox.textContent = err.message; errorBox.classList.remove('hidden'); }
            }
        };

        document.getElementById('p66-action-guest').onclick = function() {
            window.isGuestMode = true;
            overlay.classList.add('hidden');
            if (window.DB && typeof window.DB._hydrate === 'function') {
                window.DB._hydrate(_p66DefaultDoc());
                if (typeof window.initApp === 'function') window.initApp();
            }
        };
        return false;
    }, 200, 30000);

    /* ── 2. LEGAL & PRIVACY POLICY COMPONENT ──────────────────────── */
    function _p66RenderPrivacyModal() {
        if (document.getElementById('p66-privacy-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'p66-privacy-modal';
        modal.className = "fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in";
        modal.innerHTML = `
            <div class="p66-glass-box w-full max-w-2xl rounded-2xl border p-6 flex flex-col max-h-[85vh]">
                <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color: var(--glass-border);">
                    <h3 class="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-[var(--accent)]"></i> Privacy Framework & Terms
                    </h3>
                    <button id="p66-close-privacy" class="text-[var(--text-muted)] hover:text-[var(--text-main)]"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="overflow-y-auto pr-2 text-sm text-[var(--text-muted)] space-y-4 leading-relaxed">
                    <p class="font-semibold text-[var(--text-main)]">StudentOS Operational Workspace Transparency Statement</p>
                    <p><strong>1. Data Infrastructure:</strong> When using Cloud Sync, your variables, notebooks, layouts, and system metrics are handled via highly secure Firebase standard operations. When operating in Guest Mode, 100% of your configurations are written directly into local device client storage loops.</p>
                    <p><strong>2. Keys & API Endpoints:</strong> Your conversational access keys (such as Groq or Gemini AI tokens) are dispatched directly from your browser engine to the official endpoints. These tokens are saved locally or in your encrypted private document trees, completely safe from external interceptor mirrors.</p>
                    <p><strong>3. Telemetry & Identity:</strong> This setup does not sell, track, analyze, or process your individual workflows. It serves purely as an organic execution container for student productivity optimization.</p>
                </div>
                <div class="mt-6 pt-3 border-t text-right" style="border-color: var(--glass-border);">
                    <button id="p66-confirm-privacy" class="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition">Acknowledge</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const close = () => modal.remove();
        document.getElementById('p66-close-privacy').onclick = close;
        document.getElementById('p66-confirm-privacy').onclick = close;
    }

    /* ── 3. DYNAMIC MULTI-LIST TASKS LAYER ───────────────────────── */
    _wait(function() {
        const taskHeader = document.getElementById('tasks-section') || document.querySelector('.tasks-container h2')?.parentNode;
        if (!taskHeader || document.getElementById('p66-task-list-nav')) return false;

        const container = document.createElement('div');
        container.id = 'p66-task-list-nav';
        container.className = "w-full mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[var(--glass-border)] bg-black/10";
        container.innerHTML = `
            <div class="flex items-center gap-2 overflow-x-auto p66-no-scrollbar" id="p66-task-chips">
                </div>
            <button id="p66-add-task-list" class="text-xs px-3 py-1.5 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] text-[var(--text-main)] transition flex items-center gap-1.5">
                <i class="fa-solid fa-plus text-[var(--accent)]"></i> New List
            </button>
        `;
        taskHeader.insertAdjacentElement('afterend', container);

        // Intercept rendering to filter tasks natively
        if (typeof window.renderTasks === 'function') {
            const originalRenderTasks = window.renderTasks;
            window.renderTasks = function() {
                _p66UpdateTaskChips();
                
                // Temporarily swap DB.get array filter to keep existing elements untouched
                const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
                const originalGet = window.DB.get;
                
                window.DB.get = function(key, fallback) {
                    if (key === 'os_tasks') {
                        const allTasks = originalGet.call(window.DB, 'os_tasks', []);
                        return allTasks.filter(t => (t.listId || 'Schoolwork') === activeList);
                    }
                    return originalGet.call(window.DB, key, fallback);
                };

                originalRenderTasks.apply(this, arguments);
                window.DB.get = originalGet; // Restore Immediately
            };
        }

        // Intercept task saving to append category tagging
        if (typeof window.addTask === 'function') {
            const originalAddTask = window.addTask;
            window.addTask = function() {
                const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
                
                // Hook into array manipulation before save triggers
                const originalSet = window.DB.set;
                window.DB.set = function(key, value) {
                    if (key === 'os_tasks' && Array.isArray(value)) {
                        value.forEach(t => { if (!t.listId) t.listId = activeList; });
                    }
                    return originalSet.call(window.DB, key, value);
                };
                
                originalAddTask.apply(this, arguments);
                window.DB.set = originalSet; // Restore Immediately
            };
        }

        document.getElementById('p66-add-task-list').onclick = function() {
            const name = prompt("Enter new list classification name (e.g. Hobbies, Work):");
            if (!name || !name.trim()) return;
            let lists = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_task_lists', ['Schoolwork', 'Hobbies']) : ['Schoolwork', 'Hobbies'];
            if (!lists.includes(name.trim())) {
                lists.push(name.trim());
                if (window.DB) {
                    window.DB.set('os_task_lists', lists);
                    window.DB.set('os_active_task_list', name.trim());
                }
                if (typeof window.renderTasks === 'function') window.renderTasks();
            }
        };

        function _p66UpdateTaskChips() {
            const chipsBox = document.getElementById('p66-task-chips');
            if (!chipsBox) return;
            const lists = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_task_lists', ['Schoolwork', 'Hobbies']) : ['Schoolwork', 'Hobbies'];
            const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
            
            chipsBox.innerHTML = lists.map(list => `
                <button class="p66-list-chip text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${list === activeList ? 'p66-chip-active bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}" data-list="${list}">
                    <i class="fa-solid fa-list-check opacity-70 mr-1"></i> ${list}
                </button>
            `).join('');

            chipsBox.querySelectorAll('.p66-list-chip').forEach(btn => {
                btn.onclick = function() {
                    const selected = this.dataset.list;
                    if (window.DB) window.DB.set('os_active_task_list', selected);
                    if (typeof window.renderTasks === 'function') window.renderTasks();
                };
            });
        }

        _p66UpdateTaskChips();
        return false;
    }, 1000, 25000);

    /* ── 4. PREMIUM AI INTEGRATED PANEL OVERHAUL ────────────────── */
    _wait(function() {
        const oldChatPanel = document.getElementById('note-groq-chat-panel') || document.querySelector('.note-chat-panel');
        if (!oldChatPanel || oldChatPanel.dataset.p66Overhauled === 'true') return false;

        // Strip duplicate triggers or button duplicates cleanly
        const triggerBtns = document.querySelectorAll('#note-groq-btn, .groq-trigger-dup');
        if (triggerBtns.length > 1) {
            for (let i = 1; i < triggerBtns.length; i++) triggerBtns[i].remove();
        }

        oldChatPanel.className = "p66-ai-sidebar-container fixed right-0 top-0 bottom-0 w-80 md:w-96 border-l shadow-2xl flex flex-col justify-between z-[5000] hidden animate-slide-in";
        oldChatPanel.style.backgroundColor = "var(--bg-color)";
        oldChatPanel.style.borderColor = "var(--glass-border)";
        oldChatPanel.dataset.p66Overhauled = 'true';

        // Re-engineer inner layout structurally for deep focus
        oldChatPanel.innerHTML = `
            <div class="p-4 border-b flex items-center justify-between bg-black/10" style="border-color: var(--glass-border);">
                <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold uppercase tracking-widest text-[var(--text-main)]">Integrated Core Intelligence</span>
                </div>
                <button id="p66-close-ai-panel" class="text-[var(--text-muted)] hover:text-[var(--text-main)] transition text-sm">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                </button>
            </div>
            
            <div id="note-groq-chat-output" class="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
                <div class="text-xs text-[var(--text-muted)] text-center my-6">
                    <i class="fa-solid fa-microchip block text-lg mb-2 text-[var(--accent)]"></i>
                    Workspace engine loaded. Ask questions directly against your active workspace or flashcard data matrices.
                </div>
            </div>

            <div class="p-4 border-t bg-black/5" style="border-color: var(--glass-border);">
                <div class="flex gap-2 overflow-x-auto pb-3 p66-no-scrollbar" id="p66-ai-presets">
                    <button class="p66-preset-btn text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-[var(--glass-panel)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition" data-prompt="Summarize my notebook collection cleanly.">Summarize</button>
                    <button class="p66-preset-btn text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-[var(--glass-panel)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition" data-prompt="Extract the core formulas and generate a study guide.">Formulas</button>
                    <button class="p66-preset-btn text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-[var(--glass-panel)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition" data-prompt="Generate 5 random test definitions from my notes.">Quiz Me</button>
                </div>
                <div class="flex items-center gap-2 bg-black/20 rounded-xl border border-[var(--glass-border)] p-1.5 focus-within:border-[var(--accent)] transition">
                    <input type="text" id="note-groq-chat-input" class="flex-1 bg-transparent border-none text-sm text-[var(--text-main)] focus:outline-none pl-2.5" placeholder="Query ecosystem...">
                    <button id="note-groq-chat-send" class="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>
        `;

        // Safe panel close proxy mapping
        document.getElementById('p66-close-ai-panel').onclick = function() {
            oldChatPanel.classList.add('hidden');
        };

        // Preset Prompt Action Controller
        oldChatPanel.querySelectorAll('.p66-preset-btn').forEach(btn => {
            btn.onclick = function() {
                const promptVal = this.dataset.prompt;
                const inputElement = document.getElementById('note-groq-chat-input');
                if (inputElement) {
                    inputElement.value = promptVal;
                    document.getElementById('note-groq-chat-send').click();
                }
            };
        });

        // Wire up custom trigger override button cleanly so it reveals our gorgeous interface
        const originalTrigger = document.getElementById('note-groq-btn');
        if (originalTrigger) {
            originalTrigger.onclick = function(e) {
                e.preventDefault();
                oldChatPanel.classList.toggle('hidden');
            };
        }
        return false;
    }, 1000, 25000);

})();
