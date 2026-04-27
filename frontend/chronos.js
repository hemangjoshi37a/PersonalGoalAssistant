/**
 * @file chronos.js
 * @description Chronos Engine module. Visualizes the daily schedule as a 3D Temporal Vortex.
 */

const DEMO_SCHEDULE = [
    { time: '08:00', task: 'Neural Priming',        intensity: 0.3, status: 'completed' },
    { time: '09:30', task: 'Deep Mission Execution', intensity: 0.9, status: 'active'    },
    { time: '13:00', task: 'Bio-Recovery',           intensity: 0.2, status: 'pending'   },
    { time: '15:00', task: 'Skill Engraving',        intensity: 0.7, status: 'pending'   },
    { time: '18:00', task: 'Progress Consolidation', intensity: 0.5, status: 'pending'   },
    { time: '21:00', task: 'Rest State Sync',        intensity: 0.1, status: 'pending'   }
];

export class ChronosEngine {
    constructor() {
        this.overlay = document.getElementById('page-chronos');
        this.canvasContainer = document.getElementById('chronos-canvas-container');
        this.scheduleList = document.getElementById('chronos-schedule-list');

        this.isActive = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.vortex = null;
        this.schedule = [];

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) window.location.hash = '#/';
        });
    }

    async open() {
        this.isActive = true;
        setTimeout(async () => {
            await this.sync();
            lucide.createIcons();
            
            // Auto-refresh schedule every 60 seconds to keep timeline blocks in sync
            this.syncInterval = setInterval(() => {
                if (this.isActive) this.sync();
            }, 60000);
            
        }, 100);
    }

    /** Dispose GPU/animation resources — called by router when navigating away. */
    dispose() {
        this.isActive = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.canvasContainer) this.canvasContainer.innerHTML = '';
        this.schedule = [];
        this.vortex = null;
    }

    /** Refresh schedule — exposed to the sync button in the page header. */
    async sync() {
        if (!this.isActive) return;
        if (this.scheduleList) this.scheduleList.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;padding:1rem;">Syncing schedule...</div>`;
        // Dispose old renderer to prevent GPU memory leak before reinitialising
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.canvasContainer) this.canvasContainer.innerHTML = '';
        await this.loadData();
        this.init3DVortex();
    }

    async loadData() {
        const input = document.getElementById('backend-url');
        const backendUrl = (input ? input.value : 'http://localhost:5000').replace(/\/$/, '');
        try {
            const res = await fetch(`${backendUrl}/chronos/schedule`);
            if (!res.ok) throw new Error('Chronos endpoint offline');
            const data = await res.json();
            this.schedule = data.schedule;
        } catch (err) {
            console.warn('Chronos — backend offline, using demo schedule:', err.message);
            this.schedule = DEMO_SCHEDULE;
        }
        this.renderSchedule();
    }

    init3DVortex() {
        if (!this.canvasContainer) return;
        this.canvasContainer.innerHTML = '';

        const width = this.canvasContainer.clientWidth || 600;
        const height = this.canvasContainer.clientHeight || 600;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.canvasContainer.appendChild(this.renderer.domElement);
        this.camera.position.set(0, 5, 12);
        this.camera.lookAt(0, 5, 0);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pl = new THREE.PointLight(0x00d2ff, 2);
        pl.position.set(0, 5, 5);
        this.scene.add(pl);

        // Spiral vortex
        const curvePoints = Array.from({ length: 100 }, (_, i) => {
            const t = i / 10;
            return new THREE.Vector3(Math.cos(t) * (t / 2), t, Math.sin(t) * (t / 2));
        });
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        this.vortex = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 100, 0.08, 8, false),
            new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.6, wireframe: true })
        );
        this.scene.add(this.vortex);

        // Task particles
        this.schedule.forEach((task, i) => {
            const t = (i / Math.max(this.schedule.length, 1)) * 10;
            const color = task.status === 'completed' ? 0x3fb950 : (task.status === 'active' ? 0xff6600 : 0xbf9eff);
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 16, 16),
                new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
            );
            particle.position.set(Math.cos(t) * (t / 2), t, Math.sin(t) * (t / 2));
            this.scene.add(particle);
        });

        const animate = () => {
            if (!this.isActive) return;
            requestAnimationFrame(animate);
            if (this.vortex) this.vortex.rotation.y += 0.01;
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    toggleComplete(index) {
        if (!this.schedule[index]) return;
        const cur = this.schedule[index].status;
        this.schedule[index].status = cur === 'completed' ? 'pending' : 'completed';
        this.renderSchedule();
    }

    renderSchedule() {
        if (!this.scheduleList) return;
        const statusColor = { completed: '#3fb950', active: '#ff6600', pending: 'var(--text-dim)' };
        const statusIcon  = { completed: 'check-circle', active: 'play-circle', pending: 'circle' };
        this.scheduleList.innerHTML = this.schedule.map((s, i) => `
            <div class="chronos-item ${s.status}" style="cursor:pointer;" onclick="window.chronosEngine.toggleComplete(${i})" title="Click to toggle complete">
                <div class="time" style="color:${statusColor[s.status] || 'var(--text-dim)'}">${s.time}</div>
                <div class="details">
                    <h6 style="font-weight:700;font-size:0.9rem;color:white;${s.status === 'completed' ? 'text-decoration:line-through;opacity:0.6;' : ''}">${s.task}</h6>
                    <div class="intensity-bar">
                        <div style="width:${s.intensity * 100}%;background:${statusColor[s.status] || '#bf9eff'};"></div>
                    </div>
                </div>
                <div style="color:${statusColor[s.status] || 'var(--text-dim)'}">
                    <i data-lucide="${statusIcon[s.status] || 'circle'}" style="width:18px;height:18px;"></i>
                </div>
            </div>`).join('');
        lucide.createIcons();
    }
}
