/* ================================================================
   StudentOS — patches65.js
   1.  Handwriting Marker Fix — forces the marker to draw on the 
       "behind" canvas layer automatically so it acts like a real 
       highlighter under the text.
   2.  AI Sidebar UI & Cleanup — removes deprecated Mistral/Gemma 
       models, adds Gemini API support, and injects quick-action 
       preset questions into the chat.
   ================================================================ */

(function _p65_init() {
    'use strict';

    function _wait(fn, interval, maxWait) {
        interval = interval || 100;
        maxWait  = maxWait  || 15000;
        var elapsed = 0;
        (function _try() {
            if (fn()) return;
            elapsed += interval;
            if (elapsed < maxWait) setTimeout(_try, interval);
        })();
    }

    /* ================================================================
       1. HANDWRITING MARKER FIX (Auto-Behind)
       ================================================================ */
    _wait(function() {
        var markerBtn = document.getElementById('note-sketch-tool-marker');
        var penBtn = document.getElementById('note-sketch-tool-pen');
        var eraserBtn = document.getElementById('note-sketch-tool-eraser');

        if (markerBtn && !markerBtn.dataset.p65) {
            markerBtn.dataset.p65 = '1';
            markerBtn.addEventListener('click', function() {
                // Force layer mode to 'behind' when highlighter is chosen
                if (typeof window.setNoteSketchLayerMode === 'function') {
                    window.setNoteSketchLayerMode('behind');
                }
            });
        }
        
        // Revert to 'front' or 'auto' for pen and eraser
        [penBtn, eraserBtn].forEach(function(btn) {
            if (btn && !btn.dataset.p65) {
                btn.dataset.p65 = '1';
                btn.addEventListener('click', function() {
                    if (typeof window.setNoteSketchLayerMode === 'function') {
                        window.setNoteSketchLayerMode('auto');
                    }
                });
            }
        });
        return false; // Keep polling in case UI re-renders
    }, 500, 20000);

    /* ================================================================
       2. AI UI: REMOVE MISTRAL/GEMMA & ADD GEMINI SETTINGS
       ================================================================ */
    _wait(function() {
        var modelSelect = document.getElementById('note-groq-model') || document.querySelector('select[name="groqModel"]');
        if (modelSelect) {
            Array.from(modelSelect.options).forEach(function(opt) {
                var val = opt.value.toLowerCase();
                if (val.includes('mistral') || val.includes('gemma')) {
                    opt.remove();
                }
            });
            // Add Gemini if not present
            if (!Array.from(modelSelect.options).some(o => o.value.includes('gemini'))) {
                var geminiOpt = document.createElement('option');
                geminiOpt.value = 'gemini-1.5-flash';
                geminiOpt.textContent = 'Gemini 1.5 Flash (Google)';
                modelSelect.appendChild(geminiOpt);
            }
        }

        // Improve AI settings modal text / UI
        var aiSettingsModal = document.getElementById('modal-notes-groq-cfg');
        if (aiSettingsModal && !aiSettingsModal.dataset.p65setup) {
            aiSettingsModal.dataset.p65setup = '1';
            
            // Insert setup instructions
            var instructions = document.createElement('div');
            instructions.className = 'p65-ai-instructions';
            instructions.innerHTML = `
                <h4><i class="fa-solid fa-wand-magic-sparkles"></i> AI Setup Guide</h4>
                <p>To use the AI assistant, get a free API key from <a href="https://console.groq.com/keys" target="_blank">Groq</a> or <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>. Keys are synced securely to your personal Firestore database.</p>
            `;
            
            var header = aiSettingsModal.querySelector('h3');
            if (header) header.insertAdjacentElement('afterend', instructions);

            // Ensure Gemini Key Input Exists
            if (!document.getElementById('note-gemini-key')) {
                var groqInput = document.getElementById('note-groq-key');
                if (groqInput) {
                    var geminiWrap = document.createElement('div');
                    geminiWrap.innerHTML = `
                        <label class="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mt-3 block">Gemini API Key</label>
                        <input type="password" id="note-gemini-key" class="w-full bare-input mt-1" placeholder="AIzaSy...">
                    `;
                    groqInput.parentNode.insertBefore(geminiWrap, groqInput.nextSibling);
                    
                    // Hydrate existing config
                    if (window.DB && typeof window.DB.get === 'function') {
                        var cfg = window.DB.get('os_notes_groq_cfg', {});
                        document.getElementById('note-gemini-key').value = cfg.geminiApiKey || '';
                    }
                }
            }
        }
        return false; 
    }, 500, 20000);

    /* ================================================================
       3. AI SIDEBAR: INJECT QUICK QUESTIONS
       ================================================================ */
    _wait(function() {
        var chatInputWrap = document.querySelector('.note-chat-bottom') || document.querySelector('.note-chat-panel input')?.parentNode;
        if (chatInputWrap && !document.getElementById('p65-quick-questions')) {
            var quickWrap = document.createElement('div');
            quickWrap.id = 'p65-quick-questions';
            quickWrap.className = 'p65-quick-questions flex gap-2 overflow-x-auto pb-2';
            
            var qs = [
                { i: 'fa-bolt', text: 'Summarize' },
                { i: 'fa-graduation-cap', text: 'Make a Quiz' },
                { i: 'fa-language', text: 'Explain Simply' }
            ];

            qs.forEach(function(q) {
                var btn = document.createElement('button');
                btn.className = 'p65-quick-btn whitespace-nowrap';
                btn.innerHTML = `<i class="fa-solid ${q.i}"></i> ${q.text}`;
                btn.onclick = function() {
                    var inp = document.getElementById('note-groq-chat-input');
                    if (inp) {
                        inp.value = q.text + " my current notes.";
                        // Trigger standard send
                        var sendBtn = document.getElementById('note-groq-chat-send');
                        if (sendBtn) sendBtn.click();
                    }
                };
                quickWrap.appendChild(btn);
            });

            chatInputWrap.parentNode.insertBefore(quickWrap, chatInputWrap);
        }
        return false;
    }, 1000, 20000);

    /* ================================================================
       4. HOOK SAVE CONFIG TO FIRESTORE
       ================================================================ */
    _wait(function() {
        if (typeof window.saveNotesGroqCfg === 'function' && !window._p65_cfgHooked) {
            window._p65_cfgHooked = true;
            var origSave = window.saveNotesGroqCfg;
            window.saveNotesGroqCfg = function() {
                var geminiInp = document.getElementById('note-gemini-key');
                if (geminiInp && window.DB) {
                    var cfg = window.DB.get('os_notes_groq_cfg', {});
                    cfg.geminiApiKey = geminiInp.value.trim();
                    window.DB.set('os_notes_groq_cfg', cfg);
                }
                origSave.apply(this, arguments);
            };
        }
        return true;
    }, 300, 15000);

    console.log('[patches65] loaded — Marker behind-text fix & AI UI Overhaul');
})();
