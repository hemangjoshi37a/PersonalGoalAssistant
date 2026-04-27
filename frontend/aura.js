/**
 * @file aura.js
 * @description Aura Nexus module. Visualizes the user's personality aura using 3D generative geometry.
 */

export class AuraNexus {
    constructor() {
        this.overlay = document.getElementById('page-aura');
        this.canvasContainer = document.getElementById('aura-canvas-container');
        this.auraTypeEl = document.getElementById('aura-type-label');
        this.auraInfoEl = document.getElementById('aura-info-text');

        this.isActive = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.auraMesh = null;
        this.auraColor = '#00d2ff';

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
            this.init3DAura();
            await this.loadAuraData();
            lucide.createIcons();
        }, 100);
    }

    /** Dispose GPU/animation resources — called by router when navigating away. */
    dispose() {
        this.isActive = false;
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.canvasContainer) this.canvasContainer.innerHTML = '';
        this.auraMesh = null;
    }

    /** Rescan aura from fresh data — exposed to the rescan button in the page header. */
    async rescan() {
        if (!this.isActive) return;
        if (this.auraInfoEl) this.auraInfoEl.textContent = 'Rescanning neural patterns...';
        await this.loadAuraData();
    }

    init3DAura() {
        if (!this.canvasContainer) return;
        this.canvasContainer.innerHTML = '';

        const width = this.canvasContainer.clientWidth || 500;
        const height = this.canvasContainer.clientHeight || 500;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.canvasContainer.appendChild(this.renderer.domElement);
        this.camera.position.z = 5;

        // Handle Window Resizing
        window.addEventListener('resize', () => {
            if (!this.isActive || !this.canvasContainer) return;
            const newW = this.canvasContainer.clientWidth;
            const newH = this.canvasContainer.clientHeight;
            this.camera.aspect = newW / newH;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(newW, newH);
        });

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pl = new THREE.PointLight(0xffffff, 1);
        pl.position.set(5, 5, 5);
        this.scene.add(pl);

        const geometry = new THREE.IcosahedronGeometry(2, 4);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.auraColor), wireframe: true,
            transparent: true, opacity: 0.8,
            emissive: new THREE.Color(this.auraColor), emissiveIntensity: 0.5
        });
        this.auraMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.auraMesh);

        // Snapshot original vertex positions BEFORE animation starts
        // so the noise each frame is applied to the rest state, not accumulated
        const originalPos = geometry.getAttribute('position').array.slice();

        const animate = () => {
            if (!this.isActive) return;
            requestAnimationFrame(animate);
            this.auraMesh.rotation.y += 0.01;
            this.auraMesh.rotation.z += 0.005;
            const time = Date.now() * 0.001;
            const pos = this.auraMesh.geometry.getAttribute('position');
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                // Restore original position first, then apply noise on top
                v.set(originalPos[i * 3], originalPos[i * 3 + 1], originalPos[i * 3 + 2]);
                const noise = Math.sin(v.x * 2 + time) * 0.05;
                v.normalize().multiplyScalar(2 + noise);
                pos.setXYZ(i, v.x, v.y, v.z);
            }
            pos.needsUpdate = true;
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    async loadAuraData() {
        try {
            const data = await window.app.api.get('/analytics/aura');
            if (this.auraTypeEl) this.auraTypeEl.textContent = data.type;
            if (this.auraInfoEl) this.auraInfoEl.textContent = data.description;
            this.auraColor = data.color;
            if (this.auraMesh) {
                this.auraMesh.material.color.set(new THREE.Color(data.color));
                this.auraMesh.material.emissive.set(new THREE.Color(data.color));
            }
            this.renderAuraStats(data.stats);
        } catch (err) {
            console.warn('Aura Sync — backend offline:', err.message);
            if (this.auraTypeEl) this.auraTypeEl.textContent = 'Neutral Entity';
            if (this.auraInfoEl) this.auraInfoEl.textContent = 'Neural connection intermittent. Start a mission to crystallize your aura.';
            this.renderAuraStats({ blitz: 33, balanced: 33, mastery: 34 });
        }
    }

    renderAuraStats(stats) {
        const container = document.getElementById('aura-stats-grid');
        if (!container || !stats) return;
        container.innerHTML = `
            <div class="aura-stat-card">
                <span class="label">Blitz Velocity</span>
                <div class="progress-mini"><div style="width:${stats.blitz}%"></div></div>
                <span class="val">${stats.blitz}%</span>
            </div>
            <div class="aura-stat-card">
                <span class="label">Balance Index</span>
                <div class="progress-mini"><div style="width:${stats.balanced}%"></div></div>
                <span class="val">${stats.balanced}%</span>
            </div>
            <div class="aura-stat-card">
                <span class="label">Mastery Depth</span>
                <div class="progress-mini"><div style="width:${stats.mastery}%"></div></div>
                <span class="val">${stats.mastery}%</span>
            </div>`;
    }
}
