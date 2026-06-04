/* ================================================================
   StudentOS — patches66.js (Comprehensive Update)
   1. Native Authentication Integration (Original Menu Preserved)
   2. Embedded Glassmorphism Privacy Policy & Terms Modal Engine
   3. Dynamic Multi-List Tasks Filter Layer (School, Hobbies, etc.)
   4. Fully Redesigned AI Dedicated Workspace Panel (No Button Duplication)
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

    /* ── 1. ORIGINAL AUTHENTICATION INTEGRATION ─────────────────── */
    _wait(function() {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return false;
        if (overlay.dataset.p66PrivacyAdded === 'true') return true;

        // Target your original login card container automatically without overwriting it
        const loginBox = overlay.querySelector('div > div') || overlay.querySelector('.rounded-2xl') || overlay.firstElementChild;
        if (!loginBox) return false;

        // Append the privacy framework link cleanly to your original menu box
        if (!document.getElementById('p66-trigger-privacy')) {
            const privacyDiv = document.createElement('div');
            privacyDiv.className = "mt-5 text-center text-xs text-[var(--text-muted)] opacity-80";
            privacyDiv.innerHTML = `
                By entering your workspace, you agree to the 
                <button id="p66-trigger-privacy" class="underline text-[var(--text-main)] hover:text-[var(--accent)] transition ml-0.5">Privacy Framework</button>.
            `;
            loginBox.appendChild(privacyDiv);

            document.getElementById('p66-trigger-privacy').onclick = function(e) {
                e.preventDefault();
                _p66RenderPrivacyModal();
            };
        }

        overlay.dataset.p66PrivacyAdded = 'true';
        return true;
    }, 200, 30000);

    /* ── 2. LEGAL & PRIVACY POLICY COMPONENT ──────────────────────── */
    function _p66RenderPrivacyModal() {
        if (document.getElementById('p66-privacy-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'p66-privacy-modal';
        modal.className = "fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md";
        modal.innerHTML = `
            <div class="p66-glass-box w-full max-w-2xl rounded-2xl border p-6 flex flex-col max-h-[85vh]" style="background: var(--glass-panel); border-color: var(--glass-border);">
                <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color: var(--glass-border);">
                    <h3 class="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-[var(--accent)]"></i> Privacy Framework & Terms
                    </h3>
                    <button id="p66-close-privacy" class="text-[var(--text-muted)] hover:text-[var(--text-main)]"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="overflow-y-auto pr-2 text-sm text-[var(--text-muted)] space-y-4 leading-relaxed">
                    <p class="font-semibold text-[var(--text-main)]">StudentOS Operational Workspace Transparency Statement</p>
                    <p><strong>1. Data Infrastructure:</strong> Your variables, notebooks, layouts, and system metrics are handled via secure Firebase standard operations. Local sessions store variables directly in device client cache loops.</p>
                    <p><strong>2. Keys & API Endpoints:</strong> Conversational access tokens (Groq or Gemini) are dispatched straight from your browser to official cloud endpoints. Tokens are never exposed to external analytical proxy trackers.</p>
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
            <div class="flex items-center gap-2 overflow-x-auto p66-no-scrollbar" id="p66-task-chips"></div>
            <button id="p66-add-task-list" class="text-xs px-3 py-1.5 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] text-[var(--text-main)] transition flex items-center gap-1.5">
                <i class="fa-solid fa-plus text-[var(--accent)]"></i> New List
            </button>
        `;
        taskHeader.insertAdjacentElement('afterend', container);

        if (typeof window.renderTasks === 'function') {
            const originalRenderTasks = window.renderTasks;
            window.renderTasks = function() {
                _p66UpdateTaskChips();
                const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
                const originalGet = window.DB.get;
                
                window.DB.get = function(key, fallback) {
                    if (key === 'os_tasks') {
                        return originalGet.call(window.DB, 'os_tasks', []).filter(t => (t.listId || 'Schoolwork') === activeList);
                    }
                    return originalGet.call(window.DB, key, fallback);
                };
                originalRenderTasks.apply(this, arguments);
                window.DB.get = originalGet;
            };
        }

        if (typeof window.addTask === 'function') {
            const originalAddTask = window.addTask;
            window.addTask = function() {
                const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
                const originalSet = window.DB.set;
                window.DB.set = function(key, value) {
                    if (key === 'os_tasks' && Array.isArray(value)) {
                        value.forEach(t => { if (!t.listId) t.listId = activeList; });
                    }
                    return originalSet.call(window.DB, key, value);
                };
                originalAddTask.apply(this, arguments);
                window.DB.set = originalSet;
            };
        }

        document.getElementById('p66-add-task-list').onclick = function() {
            const name = prompt("Enter new list classification name:");
            if (!name || !name.trim()) return;
            let lists = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_task_lists', ['Schoolwork', 'Hobbies']) : ['Schoolwork', 'Hobbies'];
            if (!lists.includes(name.trim())) {
                lists.push(name.trim());
                window.DB.set('os_task_lists', lists);
                window.DB.set('os_active_task_list', name.trim());
                if (typeof window.renderTasks === 'function') window.renderTasks();
            }
        };

        function _p66UpdateTaskChips() {
            const chipsBox = document.getElementById('p66-task-chips');
            if (!chipsBox) return;
            const lists = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_task_lists', ['Schoolwork', 'Hobbies']) : ['Schoolwork', 'Hobbies'];
            const activeList = (window.DB && typeof window.DB.get === 'function') ? window.DB.get('os_active_task_list', 'Schoolwork') : 'Schoolwork';
            
            chipsBox.innerHTML = lists.map(list => `
                <button class="p66-list-chip text-xs px-3 py-1.5 rounded-lg font-medium transition ${list === activeList ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-muted)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}" data-list="${list}">
                    <i class="fa-solid fa-list-check opacity-70 mr-1"></i> ${list}
                </button>
            `).join('');

            chipsBox.querySelectorAll('.p66-list-chip').forEach(btn => {
                btn.onclick = function() {
                    window.DB.set('os_active_task_list', this.dataset.list);
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

        // Cleanly isolate structural duplicate trigger items
        const triggerBtns = document.querySelectorAll('#note-groq-btn, .groq-trigger-dup');
        if (triggerBtns.length > 1) {
            for (let i = 1; i < triggerBtns.length; i++) triggerBtns[i].remove();
        }

        oldChatPanel.className = "fixed right-0 top-0 bottom-0 w-80 md:w-96 border-l shadow-2xl flex flex-col justify-between z-[5000] hidden backdrop-blur-xl bg-[var(--bg-color)]";
        oldChatPanel.style.borderColor = "var(--glass-border)";
        oldChatPanel.dataset.p66Overhauled = 'true';

        oldChatPanel.innerHTML = `
            <div class="p-4 border-b flex items-center justify-between bg-black/10" style="border-color: var(--glass-border);">
                <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold uppercase tracking-widest text-[var(--text-main)]">Core Intelligence</span>
                </div>
                <button id="p66-close-ai-panel" class="text-[var(--text-muted)] hover:text-[var(--text-main)] transition text-sm"><i class="fa-solid fa-arrow-right-to-bracket"></i></button>
            </div>
            <div id="note-groq-chat-output" class="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
                <div class="text-xs text-[var(--text-muted)] text-center my-6">
                    <i class="fa-solid fa-microchip block text-lg mb-2 text-[var(--accent)]"></i>
                    Workspace core loaded. Query your notes and databases seamlessly.
                </div>
            </div>
            <div class="p-4 border-t bg-black/5" style="border-color: var(--glass-border);">
                <div class="flex items-center gap-2 bg-black/20 rounded-xl border border-[var(--glass-border)] p-1.5 focus-within:border-[var(--accent)] transition">
                    <input type="text" id="note-groq-chat-input" class="flex-1 bg-transparent border-none text-sm text-[var(--text-main)] focus:outline-none pl-2.5" placeholder="Query ecosystem...">
                    <button id="note-groq-chat-send" class="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition"><i class="fa-solid fa-paper-plane text-xs"></i></button>
                </div>
            </div>
        `;

        document.getElementById('p66-close-ai-panel').onclick = () => oldChatPanel.classList.add('hidden');
        
        const originalTrigger = document.getElementById('note-groq-btn');
        if (originalTrigger) {
            originalTrigger.onclick = (e) => { e.preventDefault(); oldChatPanel.classList.toggle('hidden'); };
        }
        return false;
    }, 1000, 25000);

})();
