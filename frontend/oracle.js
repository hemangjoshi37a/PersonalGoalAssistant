/**
 * @file oracle.js
 * @description Oracle Feed module — streams a personalized AI daily briefing via SSE.
 */

export class OracleFeed {
    constructor() {
        this.isActive = false;
        this._es = null;
    }

    open() {
        this.isActive = true;
        this._briefEl = document.getElementById('oracle-brief-content');
        this._statusEl = document.getElementById('oracle-status');
        this._generateBtn = document.getElementById('oracle-generate-btn');
        if (this._generateBtn) {
            this._generateBtn.onclick = () => this.generate();
        }
        // Auto-generate on open
        this.generate();
        lucide.createIcons();
    }

    dispose() {
        this.isActive = false;
        if (this._es) { this._es.close(); this._es = null; }
    }

    async generate() {
        if (!this.isActive) return;
        const input = document.getElementById('backend-url');
        const backendUrl = (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');

        if (this._briefEl) this._briefEl.innerHTML = '';
        if (this._statusEl) {
            this._statusEl.textContent = 'ORACLE INITIALIZING...';
            this._statusEl.style.color = 'hsla(var(--primary), 1)';
        }
        if (this._generateBtn) {
            this._generateBtn.disabled = true;
            this._generateBtn.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;" class="spin"></i> Channeling...';
            lucide.createIcons();
        }

        let fullText = '';

        try {
            const response = await fetch(`${backendUrl}/oracle/brief`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error('Oracle offline');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            if (this._statusEl) {
                this._statusEl.textContent = 'RECEIVING TRANSMISSION...';
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.text) {
                            fullText += parsed.text;
                            this._renderBrief(fullText);
                        }
                        if (parsed.done) {
                            this._onComplete();
                        }
                    } catch (_) { /* partial chunk */ }
                }
            }
            this._onComplete();
        } catch (err) {
            console.warn('Oracle Feed — demo mode:', err.message);
            this._renderDemoBrief();
            this._onComplete();
        }
    }

    _renderBrief(text) {
        if (!this._briefEl || !this.isActive) return;
        // Convert section headers to styled spans
        const html = text
            .replace(/^(DAILY BRIEF — .+)$/m, '<div class="oracle-date">$1</div>')
            .replace(/^(FOCUS DIRECTIVE|TOP 3 ACTIONS|ORACLE INSIGHT)$/mg, '<div class="oracle-section-title">$1</div>')
            .replace(/^(\d+\. .+)$/mg, '<div class="oracle-action-item">$1</div>')
            .replace(/\n/g, '<br>');
        this._briefEl.innerHTML = `<div class="oracle-text">${html}</div>`;
    }

    _renderDemoBrief() {
        const now = new Date();
        const demo = `DAILY BRIEF — ${now.toDateString().toUpperCase()}

FOCUS DIRECTIVE
Your neural systems are primed for deep execution. Today's primary directive is to advance your most critical mission objective with zero context-switching.

TOP 3 ACTIONS
1. Block 90 minutes for uninterrupted deep work on your highest-priority task.
2. Complete your morning habit stack before 09:00 to activate peak performance mode.
3. Review and close out at least 3 pending subtasks before end of cycle.

ORACLE INSIGHT
Consistency compounds. Every action you take today is a vote for the identity you are building. The gap between where you are and where you want to be is closed one deliberate action at a time.`;
        this._renderBrief(demo);
    }

    _onComplete() {
        if (this._statusEl) {
            this._statusEl.textContent = 'TRANSMISSION COMPLETE';
            this._statusEl.style.color = 'hsla(var(--accent), 1)';
        }
        if (this._generateBtn) {
            this._generateBtn.disabled = false;
            this._generateBtn.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> New Brief';
            lucide.createIcons();
        }
    }
}
