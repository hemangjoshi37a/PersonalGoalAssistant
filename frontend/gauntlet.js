/**
 * @file gauntlet.js
 * @description Gauntlet Protocol module — generates and tracks multi-day AI challenges.
 */

export class GauntletProtocol {
    constructor() {
        this.isActive = false;
        this._activeGauntlet = null;
    }

    open() {
        this.isActive = true;
        this._form = document.getElementById('gauntlet-form');
        this._timeline = document.getElementById('gauntlet-timeline');
        this._listEl = document.getElementById('gauntlet-list');
        this._statusEl = document.getElementById('gauntlet-status');

        if (this._form) {
            this._form.onsubmit = (e) => { e.preventDefault(); this.generate(); };
        }
        this.loadExisting();
        lucide.createIcons();
    }

    dispose() {
        this.isActive = false;
    }

    _getBackendUrl() {
        const input = document.getElementById('backend-url');
        return (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');
    }

    async generate() {
        const goalInput = document.getElementById('gauntlet-goal');
        const durationInput = document.querySelector('input[name="gauntlet-duration"]:checked');
        const goal = goalInput?.value?.trim();
        const duration = parseInt(durationInput?.value || '7');
        if (!goal) return;

        const submitBtn = document.getElementById('gauntlet-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader-2" style="width:14px" class="spin"></i> FORGING GAUNTLET...';
            lucide.createIcons();
        }
        if (this._statusEl) {
            this._statusEl.textContent = `Generating ${duration}-Day Protocol...`;
            this._statusEl.style.color = 'hsla(var(--primary), 1)';
        }
        if (this._timeline) this._timeline.innerHTML = '';

        try {
            const res = await fetch(`${this._getBackendUrl()}/gauntlet/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, duration })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Generation failed');

            if (this._statusEl) {
                this._statusEl.textContent = `${duration}-Day Protocol Forged ✓`;
                this._statusEl.style.color = 'hsla(var(--accent), 1)';
            }
            this._activeGauntlet = data.gauntlet;
            this.renderGauntlet(data.gauntlet);
            await this.loadExisting();
        } catch (err) {
            console.warn('Gauntlet generation fallback:', err.message);
            if (this._statusEl) {
                this._statusEl.textContent = err.message;
                this._statusEl.style.color = '#f85149';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="zap" style="width:14px"></i> FORGE GAUNTLET';
                lucide.createIcons();
            }
        }
    }

    async loadExisting() {
        if (!this.isActive) return;
        try {
            const res = await fetch(`${this._getBackendUrl()}/gauntlet/list`);
            if (!res.ok) return;
            const gauntlets = await res.json();
            this._renderList(gauntlets);
            // Show most recent active one in timeline
            if (gauntlets.length > 0 && !this._activeGauntlet) {
                this._activeGauntlet = gauntlets[0];
                this.renderGauntlet(gauntlets[0]);
            }
        } catch (_) { /* no gauntlets yet */ }
    }

    _renderList(gauntlets) {
        if (!this._listEl) return;
        if (gauntlets.length === 0) {
            this._listEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.8rem;">No active protocols.</div>';
            return;
        }
        this._listEl.innerHTML = gauntlets.map(g => `
            <div class="gauntlet-list-item ${g.id === this._activeGauntlet?.id ? 'active' : ''}"
                 data-id="${g.id}" style="cursor:pointer;">
                <div class="gli-title">${g.goal}</div>
                <div class="gli-meta">${g.duration} Days · ${g.completedDays}/${g.duration} Complete</div>
                <div class="gli-bar"><div style="width:${Math.round(g.completedDays/g.duration*100)}%"></div></div>
            </div>
        `).join('');
        this._listEl.querySelectorAll('.gauntlet-list-item').forEach(el => {
            el.addEventListener('click', () => {
                const g = gauntlets.find(g => g.id === parseInt(el.dataset.id));
                if (g) { this._activeGauntlet = g; this.renderGauntlet(g); }
            });
        });
    }

    renderGauntlet(gauntlet) {
        if (!this._timeline || !this.isActive) return;
        const pct = Math.round(gauntlet.completedDays / gauntlet.duration * 100);
        this._timeline.innerHTML = `
            <div class="gauntlet-header-strip">
                <div>
                    <div class="gauntlet-title-text">${gauntlet.goal}</div>
                    <div class="gauntlet-meta-text">${gauntlet.duration}-Day Protocol · ${gauntlet.completedDays} of ${gauntlet.duration} days complete</div>
                </div>
                <div class="gauntlet-ring-pct">${pct}%</div>
            </div>
            <div class="gauntlet-progress-bar"><div style="width:${pct}%"></div></div>
            <div class="gauntlet-days-grid" id="gauntlet-days-grid"></div>
        `;
        const grid = document.getElementById('gauntlet-days-grid');
        if (!grid) return;

        gauntlet.days.forEach(day => {
            const card = document.createElement('div');
            card.className = `gauntlet-day-card ${day.isCompleted ? 'done' : ''}`;
            card.innerHTML = `
                <div class="gdc-day-num">Day ${day.dayNumber}</div>
                <div class="gdc-task">${day.taskText}</div>
                ${!day.isCompleted ? `<button class="gdc-complete-btn" data-day-id="${day.id}" data-gauntlet-id="${gauntlet.id}">
                    <i data-lucide="check" style="width:12px;height:12px;"></i> Mark Done
                </button>` : '<div class="gdc-done-badge">✓ Complete</div>'}
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();

        grid.querySelectorAll('.gdc-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.completeDay(
                parseInt(btn.dataset.gauntletId),
                parseInt(btn.dataset.dayId)
            ));
        });
    }

    async completeDay(gauntletId, dayId) {
        try {
            const res = await fetch(`${this._getBackendUrl()}/gauntlet/${gauntletId}/day/${dayId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                this._activeGauntlet = data.gauntlet;
                this.renderGauntlet(data.gauntlet);
                await this.loadExisting();
                // Update mastery if available
                if (data.userStats && window.app) window.app.updateMasteryUI(data.userStats);
            }
        } catch (err) {
            console.error('Failed to complete day:', err);
        }
    }
}
