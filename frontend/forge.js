/**
 * @file forge.js
 * @description Quantum Forge module. Habit tracking with D3 constellation visualization.
 */

export class QuantumForge {
    constructor() {
        this.overlay = document.getElementById('page-forge');
        this.form = document.getElementById('new-habit-form');
        this.habitList = document.getElementById('habit-active-list');
        this.predictionContainer = document.getElementById('forge-prediction');
        this.constellationContainer = document.getElementById('constellation-container');

        this.isActive = false;
        this.habits = [];
        this.init();
    }

    init() {
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createHabit();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) window.location.hash = '#/';
        });
    }

    async open() {
        this.isActive = true;
        setTimeout(async () => {
            await this.loadData();
            lucide.createIcons();
        }, 100);
    }

    /** Dispose resources — called by router when navigating away. */
    dispose() {
        this.isActive = false;
        if (this.constellationContainer) this.constellationContainer.innerHTML = '';
    }

    getBackendUrl() {
        const input = document.getElementById('backend-url');
        return (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');
    }

    async loadData() {
        try {
            const data = await window.app.api.get('/forge/habits');
            this.habits = data;
            this.renderHabits();
            this.renderConstellation();
        } catch (err) {
            console.error('Failed to load habits:', err);
            this.habitList.innerHTML = `<div style="color:#f85149;font-size:0.85rem;padding:1rem;">Error loading data.</div>`;
        }

        try {
            const data = await window.app.api.get('/forge/predict');
            this.renderPredictions(data);
        } catch (err) {
            console.error('Failed to load predictions:', err);
        }
    }

    async createHabit() {
        const name = document.getElementById('habit-name')?.value.trim();
        const cue = document.getElementById('habit-cue')?.value.trim();
        if (!name) return;
        try {
            await window.app.api.post('/forge/habits', { name, cue });
            this.form.reset();
            await this.loadData();
        } catch (err) {
            console.error('Failed to create habit:', err);
            alert(err.message || 'Failed to create habit');
        }
    }

    async logHabit(habitId) {
        // Optimistic feedback: flash the button
        const btn = document.querySelector(`[data-log-btn="${habitId}"]`);
        if (btn) { btn.textContent = '...'; btn.disabled = true; }
        try {
            await window.app.api.post('/forge/log', { habit_id: habitId, status: 'completed' });
            await this.loadData();
        } catch (err) { console.error('Failed to log habit:', err); }
        if (btn) { btn.textContent = 'LOG ✓'; btn.disabled = false; }
    }

    async deleteHabit(habitId) {
        if (!confirm('Delete this habit and all its logs?')) return;
        const backendUrl = this.getBackendUrl();
        try {
            await window.app.api.delete(`/forge/habits/${habitId}`);
            await this.loadData();
        } catch (err) { console.error('Failed to delete habit:', err); }
    }

    /**
     * Calculates the current consecutive-day streak from an array of log objects.
     * A streak counts backwards from today; any gap of >1 day breaks it.
     * @param {Array} logs - Array of log objects with a `timestamp` field.
     * @returns {number}
     */
    calcStreak(logs) {
        if (!logs || logs.length === 0) return 0;
        // Collect unique calendar dates (YYYY-MM-DD) that have a log
        const dateSet = new Set(
            logs.map(l => new Date(l.timestamp).toISOString().slice(0, 10))
        );
        const dates = Array.from(dateSet).sort().reverse(); // newest first
        let streak = 0;
        let cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        for (const dateStr of dates) {
            const d = new Date(dateStr);
            const diff = Math.round((cursor - d) / 86400000);
            if (diff <= 1) {
                streak++;
                cursor = d;
            } else {
                break; // gap found — streak is broken
            }
        }
        return streak;
    }

    renderHabits() {
        if (!this.habitList) return;
        if (!this.habits || this.habits.length === 0) {
            this.habitList.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;padding:1rem 0;">No habits forged yet. Create one below.</div>`;
            return;
        }
        this.habitList.innerHTML = this.habits.map(h => {
            const streak = this.calcStreak(h.logs);
            return `
            <div class="habit-item">
                <div style="flex:1">
                    <div style="font-weight:700;font-size:0.9rem;color:white;">${h.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-dim);margin-top:0.2rem;">Cue: ${h.cue || '—'} &bull; <span style="color:#bf9eff;font-weight:700;">🔥 ${streak} day streak</span></div>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                    <button data-log-btn="${h.id}" onclick="window.quantumForge.logHabit(${h.id})"
                        style="padding:0.4rem 0.9rem;background:hsla(var(--accent),0.15);border:1px solid hsla(var(--accent),0.4);color:hsla(var(--accent),1);border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;transition:all 0.2s;">
                        LOG ✓
                    </button>
                    <button onclick="window.quantumForge.deleteHabit(${h.id})"
                        style="padding:0.4rem 0.6rem;background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.3);color:#f85149;border-radius:8px;cursor:pointer;font-size:0.75rem;transition:all 0.2s;" title="Delete habit">
                        ✕
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    renderPredictions(data) {
        if (!this.predictionContainer) return;
        if (!data.projections || data.projections.length === 0) {
            this.predictionContainer.innerHTML = `<div style="color:var(--text-dim);">Forge at least one habit to begin neural simulation...</div>`;
            return;
        }
        this.predictionContainer.innerHTML = data.projections.map(p => `
            <div style="padding:1rem;border-radius:12px;background:rgba(191,158,255,0.05);border:1px solid rgba(191,158,255,0.15);margin-bottom:0.75rem;">
                <div style="font-weight:700;color:#bf9eff;margin-bottom:0.5rem;">${p.habit} <span style="font-size:0.7rem;opacity:0.6;">${p.persona}</span></div>
                <p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:0.25rem;"><b style="color:white;">30 Days:</b> ${p.prediction30Days}</p>
                <p style="font-size:0.8rem;color:var(--text-dim);"><b style="color:white;">1 Year:</b> ${p.prediction365Days}</p>
                <div style="margin-top:0.75rem;height:4px;background:rgba(255,255,255,0.05);border-radius:10px;overflow:hidden;">
                    <div style="width:${p.consistency}%;height:100%;background:#bf9eff;box-shadow:0 0 8px #bf9eff;"></div>
                </div>
            </div>`).join('');
    }

    renderConstellation() {
        const container = this.constellationContainer;
        if (!container) return;
        container.innerHTML = '';
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 500;

        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

        // Stellar dust
        svg.selectAll('.dust').data(Array.from({ length: 80 })).enter().append('circle')
            .attr('cx', () => Math.random() * width).attr('cy', () => Math.random() * height)
            .attr('r', () => Math.random() * 1.5).attr('fill', '#bf9eff').attr('opacity', 0.15);

        if (!this.habits || this.habits.length === 0) {
            svg.append('text').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle')
                .attr('fill', '#8b949e').attr('font-size', '13px').attr('font-family', 'Fira Code')
                .text('Create habits to see your constellation...');
            return;
        }

        const nodes = this.habits.map(h => ({
            ...h, x: Math.random() * (width - 100) + 50, y: Math.random() * (height - 100) + 50,
            radius: 6 + ((h.logs ? h.logs.length : 0) * 2)
        }));
        const links = [];
        for (let i = 0; i < nodes.length; i++)
            for (let j = i + 1; j < nodes.length; j++)
                links.push({ source: i, target: j });

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).distance(120))
            .force('charge', d3.forceManyBody().strength(-150))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('transform', d => `translate(${d.x},${d.y})`);
            });

        const link = svg.append('g').selectAll('line').data(links).enter().append('line')
            .attr('stroke', '#bf9eff').attr('stroke-opacity', 0.15).attr('stroke-width', 1);
        const node = svg.append('g').selectAll('.constellation-node').data(nodes).enter().append('g').attr('class', 'constellation-node');
        node.append('circle').attr('r', d => d.radius).attr('fill', '#bf9eff').attr('opacity', 0.85);
        node.append('circle').attr('r', d => d.radius * 2).attr('fill', 'none').attr('stroke', '#bf9eff').attr('stroke-width', 0.5).attr('opacity', 0.2);
        node.append('text').attr('dy', d => d.radius + 14).attr('text-anchor', 'middle').attr('fill', 'white').attr('font-size', '10px').attr('font-family', 'Outfit').text(d => d.name);
        simulation.alpha(1).restart();
    }
}
