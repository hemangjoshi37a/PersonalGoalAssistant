/**
 * @file momentum.js
 * @description Momentum Matrix module — D3.js GitHub-style heatmap of daily activity.
 */

export class MomentumMatrix {
    constructor() {
        this.isActive = false;
        this.container = document.getElementById('momentum-heatmap');
        this.statsEl = document.getElementById('momentum-stats');
        this.tooltipEl = document.getElementById('momentum-tooltip');
    }

    async open() {
        this.isActive = true;
        this.container = document.getElementById('momentum-heatmap');
        this.statsEl = document.getElementById('momentum-stats');
        this.tooltipEl = document.getElementById('momentum-tooltip');
        if (this.container) this.container.innerHTML = '<div style="color:var(--text-dim);font-size:0.8rem;padding:2rem;text-align:center;">LOADING NEURAL ACTIVITY...</div>';
        await this.loadData();
        lucide.createIcons();
    }

    dispose() {
        this.isActive = false;
        if (this.container) this.container.innerHTML = '';
    }

    async loadData() {
        const input = document.getElementById('backend-url');
        const backendUrl = (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');
        try {
            const res = await fetch(`${backendUrl}/analytics/heatmap`);
            if (!res.ok) throw new Error('Heatmap offline');
            const data = await res.json();
            this.render(data);
        } catch (err) {
            console.warn('Momentum Matrix demo mode:', err.message);
            // Generate demo data
            const demo = Array.from({ length: 90 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (89 - i));
                return { date: d.toISOString().split('T')[0], count: Math.random() > 0.4 ? Math.floor(Math.random() * 8) : 0 };
            });
            this.render(demo);
        }
    }

    render(data) {
        if (!this.container || !this.isActive) return;
        this.container.innerHTML = '';

        const totalActivity = data.reduce((s, d) => s + d.count, 0);
        const activeDays = data.filter(d => d.count > 0).length;
        const maxStreak = this._calcStreak(data);

        // Update stats
        if (this.statsEl) {
            this.statsEl.innerHTML = `
                <div class="momentum-stat"><span class="m-val">${totalActivity}</span><span class="m-label">Total Actions</span></div>
                <div class="momentum-stat"><span class="m-val">${activeDays}</span><span class="m-label">Active Days</span></div>
                <div class="momentum-stat"><span class="m-val">${maxStreak}</span><span class="m-label">Best Streak</span></div>
                <div class="momentum-stat"><span class="m-val">${Math.round(activeDays / 90 * 100)}%</span><span class="m-label">Consistency</span></div>
            `;
        }

        const weeks = 13; // ~90 days = 13 weeks
        const days = 7;
        const cellSize = 14;
        const cellGap = 3;
        const totalW = weeks * (cellSize + cellGap);
        const totalH = days * (cellSize + cellGap) + 30;

        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', totalW + 60)
            .attr('height', totalH)
            .style('overflow', 'visible');

        const maxCount = Math.max(...data.map(d => d.count), 1);

        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(t => {
                if (t === 0) return 'rgba(255,255,255,0.04)';
                return d3.interpolateRgb('#1a3a5c', '#00d2ff')(t);
            });

        // Day labels (Mon, Wed, Fri)
        ['Mon', 'Wed', 'Fri'].forEach((label, i) => {
            svg.append('text')
                .attr('x', 0)
                .attr('y', 24 + [1, 3, 5][i] * (cellSize + cellGap))
                .attr('font-size', '9px')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'Fira Code, monospace')
                .text(label);
        });

        const tooltip = this.tooltipEl;

        data.forEach((item, i) => {
            const week = Math.floor(i / 7);
            const day = i % 7;
            const x = 36 + week * (cellSize + cellGap);
            const y = 8 + day * (cellSize + cellGap);

            const rect = svg.append('rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('fill', colorScale(item.count))
                .style('cursor', 'pointer')
                .style('transition', 'transform 0.15s ease');

            rect.on('mouseover', function (event) {
                d3.select(this).attr('transform', `translate(0,-2)`);
                if (tooltip) {
                    tooltip.style.display = 'block';
                    tooltip.innerHTML = `<strong>${item.date}</strong><br>${item.count} action${item.count !== 1 ? 's' : ''}`;
                    tooltip.style.left = (event.pageX + 10) + 'px';
                    tooltip.style.top = (event.pageY - 30) + 'px';
                }
            }).on('mousemove', function (event) {
                if (tooltip) {
                    tooltip.style.left = (event.pageX + 10) + 'px';
                    tooltip.style.top = (event.pageY - 30) + 'px';
                }
            }).on('mouseout', function () {
                d3.select(this).attr('transform', '');
                if (tooltip) tooltip.style.display = 'none';
            });
        });

        // Legend
        const legendX = 36;
        const legendY = totalH - 16;
        svg.append('text').attr('x', legendX).attr('y', legendY).attr('font-size', '9px').attr('fill', 'rgba(255,255,255,0.3)').attr('font-family', 'Fira Code, monospace').text('Less');
        [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => {
            svg.append('rect')
                .attr('x', legendX + 30 + i * (cellSize + 2))
                .attr('y', legendY - 10)
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('rx', 3)
                .attr('fill', colorScale(t * maxCount));
        });
        svg.append('text').attr('x', legendX + 30 + 5 * (cellSize + 2) + 4).attr('y', legendY).attr('font-size', '9px').attr('fill', 'rgba(255,255,255,0.3)').attr('font-family', 'Fira Code, monospace').text('More');
    }

    _calcStreak(data) {
        let best = 0, current = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].count > 0) { current++; best = Math.max(best, current); }
            else { current = 0; }
        }
        return best;
    }
}
