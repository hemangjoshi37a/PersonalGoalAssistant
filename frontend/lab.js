/**
 * @file lab.js
 * @description Zenith Growth Lab module. Handles 3D mission topology visualization
 * and real-time reasoning stream rendering using Three.js and Chart.js.
 */

export class ZenithLab {
    constructor() {
        this.overlay = document.getElementById('page-lab');
        this.topologyContainer = document.getElementById('topology-container');
        this.reasoningFeed = document.getElementById('reasoning-stream');
        this.statsContainer = document.getElementById('lab-stats');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.nodes = [];
        this.links = [];
        this.chart = null;
        this.isActive = false;

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                window.location.hash = '#/';
            }
        });
    }

    async open() {
        this.isActive = true;

        if (this.reasoningFeed) this.reasoningFeed.innerHTML = '<div style="color:hsla(var(--primary),1)">INITIALIZING NEURAL LINK...</div>';
        if (this.statsContainer) this.statsContainer.innerHTML = '<div style="color:var(--text-dim)">CALIBRATING...</div>';

        setTimeout(() => {
            this.init3DTopology();
            this.initCharts();
            this.clearStream();
            this.loadData();
        }, 100);

        lucide.createIcons();
    }

    /** Dispose GPU/animation resources — called by router when navigating away. */
    dispose() {
        this.isActive = false;
        // Cancel the reasoning stream timeout so it doesn't fire after navigation
        if (this._streamTimeout) {
            clearTimeout(this._streamTimeout);
            this._streamTimeout = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.topologyContainer) this.topologyContainer.innerHTML = '';
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.nodes = [];
        this.links = [];
    }

    /** Refresh data from the lab — exposed to the refresh button in the page header. */
    async refresh() {
        if (!this.isActive) return;
        if (this.statsContainer) this.statsContainer.innerHTML = '<div style="color:var(--text-dim)">RECALIBRATING...</div>';
        await this.loadData();
    }

    init3DTopology() {
        if (!this.topologyContainer) return;
        this.topologyContainer.innerHTML = '';
        this.nodes = [];
        this.links = [];

        const width = this.topologyContainer.clientWidth || 600;
        const height = this.topologyContainer.clientHeight || 500;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.topologyContainer.appendChild(this.renderer.domElement);
        this.camera.position.z = 60;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x00d2ff, 1.5);
        pointLight.position.set(20, 20, 20);
        this.scene.add(pointLight);

        const animate = () => {
            if (!this.isActive) return;
            requestAnimationFrame(animate);
            this.nodes.forEach(n => {
                n.mesh.rotation.x += 0.005;
                n.mesh.rotation.y += 0.01;
            });
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    async loadData() {
        const input = document.getElementById('backend-url');
        let backendUrl = (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');

        try {
            const statsRes = await fetch(`${backendUrl}/analytics/stats`);
            if (!statsRes.ok) throw new Error('Analytics offline');
            const stats = await statsRes.json();

            if (stats.totalMissions === 0) {
                this.renderEmptyState();
                return;
            }
            this.renderStats(stats);
            this.updateCharts(stats);

            const topoRes = await fetch(`${backendUrl}/analytics/topology`);
            if (!topoRes.ok) throw new Error('Topology offline');
            const topo = await topoRes.json();
            this.renderTopology(topo);

        } catch (err) {
            console.warn('Zenith Lab — demo mode:', err.message);
            this.renderEmptyState('SIMULATION MODE: Backend offline. Rendering demo topology.');
            this.renderDemoTopology();
        }
    }

    renderEmptyState(message = 'NO NEURAL DATA detected. Start a mission to generate topology.') {
        if (!this.statsContainer) return;
        this.statsContainer.innerHTML = `
            <div style="grid-column:1/-1;color:var(--text-dim);font-size:0.8rem;border:1px dashed rgba(255,255,255,0.1);padding:1rem;border-radius:12px;text-align:center;">${message}</div>`;
        this.renderDemoTopology();
    }

    renderDemoTopology() {
        const demoNodes = Array.from({ length: 8 }, (_, i) => ({
            id: `demo_${i}`, type: i === 0 ? 'mission' : 'subtask',
            label: i === 0 ? 'Demo Mission' : `Subtask ${i}`, completed: Math.random() > 0.5
        }));
        const demoLinks = demoNodes.slice(1).map(n => ({ source: demoNodes[0].id, target: n.id }));
        this.renderTopology({ nodes: demoNodes, links: demoLinks });
    }

    renderStats(stats) {
        if (!this.statsContainer) return;
        this.statsContainer.innerHTML = `
            <div class="mini-stat"><span class="mini-stat-label">Accuracy</span><span class="mini-stat-val">${stats.successRate}%</span></div>
            <div class="mini-stat"><span class="mini-stat-label">Missions</span><span class="mini-stat-val">${stats.totalMissions}</span></div>
            <div class="mini-stat"><span class="mini-stat-label">Completed</span><span class="mini-stat-val">${stats.completedMissions}</span></div>
            <div class="mini-stat"><span class="mini-stat-label">Link Status</span><span class="mini-stat-val" style="color:hsla(var(--accent),1)">Stable</span></div>`;
    }

    initCharts() {
        const ctx = document.getElementById('growth-chart')?.getContext('2d');
        if (!ctx) return;
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Blitz', 'Balanced', 'Mastery'],
                datasets: [{ data: [33, 33, 34], backgroundColor: ['#2188ff', '#3fb950', '#bf9eff'], borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 10 } } } }
            }
        });
    }

    updateCharts(stats) {
        if (!this.chart) return;
        this.chart.data.datasets[0].data = [stats.distribution.blitz, stats.distribution.balanced, stats.distribution.mastery];
        this.chart.update();
    }

    renderTopology(topo) {
        if (!this.scene) return;
        this.nodes.forEach(n => this.scene.remove(n.mesh));
        this.links.forEach(l => this.scene.remove(l.line));
        this.nodes = [];
        this.links = [];

        topo.nodes.forEach(node => {
            const geometry = node.type === 'mission' ? new THREE.IcosahedronGeometry(2, 0) : new THREE.SphereGeometry(0.8, 8, 8);
            const material = new THREE.MeshPhongMaterial({
                color: node.completed ? 0x3fb950 : (node.type === 'mission' ? 0x2188ff : 0x8b949e),
                emissive: node.completed ? 0x2ea043 : 0x000000,
                emissiveIntensity: 0.5, wireframe: node.type === 'mission'
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20);
            this.scene.add(mesh);
            this.nodes.push({ id: node.id, mesh });
        });

        topo.links.forEach(link => {
            const source = this.nodes.find(n => n.id === link.source);
            const target = this.nodes.find(n => n.id === link.target);
            if (source && target) {
                const geometry = new THREE.BufferGeometry().setFromPoints([source.mesh.position, target.mesh.position]);
                const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
                this.scene.add(line);
                this.links.push({ line });
            }
        });
    }

    clearStream() {
        if (!this.reasoningFeed) return;
        this.reasoningFeed.innerHTML = '';
        if (this._streamTimeout) {
            clearTimeout(this._streamTimeout);
            this._streamTimeout = null;
        }
    }

    appendStreamLog(text, isTask = false) {
        if (!this.reasoningFeed || !this.isActive) return;
        
        const entry = document.createElement('div');
        entry.style.marginBottom = '0.5rem';
        
        if (isTask) {
            entry.innerHTML = `<span style="color:#bf9eff">✦</span> <span style="color:#ffffff">${text}</span>`;
        } else {
            entry.innerHTML = `<span style="color:hsla(var(--primary),1)">>></span> <span style="color:var(--text-dim)">${text}</span>`;
        }
        
        this.reasoningFeed.appendChild(entry);
        this.reasoningFeed.scrollTop = this.reasoningFeed.scrollHeight;
        
        // Keep UI clean, remove oldest if more than 30 lines
        if (this.reasoningFeed.childNodes.length > 30) {
            this.reasoningFeed.removeChild(this.reasoningFeed.firstChild);
        }
    }
}
