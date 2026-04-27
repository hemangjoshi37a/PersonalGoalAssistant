/**
 * @file archive.js
 * @description Neural Archive module. Visualizes the Expert Knowledge Base as a 3D interactive graph.
 */

export class NeuralArchive {
    constructor() {
        this.overlay = document.getElementById('page-archive');
        this.canvasContainer = document.getElementById('archive-canvas-container');
        this.detailPanel = document.getElementById('knowledge-detail-content');

        this.isActive = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.nodes = [];
        this.links = [];
        this.data = null;

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) window.location.hash = '#/';
        });
    }

    async open() {
        this.isActive = true;
        if (this.detailPanel) {
            this.detailPanel.innerHTML = `
                <div class="knowledge-intro">
                    <h5 style="color:#bf9eff">Loading Archive...</h5>
                    <p style="color:var(--text-dim);margin-top:1rem;">Syncing expert knowledge graph...</p>
                </div>`;
        }
        setTimeout(async () => {
            await this.loadData();
            this.init3DGraph();
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
        this.nodes = [];
        this.links = [];
    }

    async loadData() {
        try {
            const data = await window.app.api.get('/analytics/knowledge');
            this.data = data;
        } catch (err) {
            console.warn('Archive — backend offline, using demo data:', err.message);
            this.data = {
                nodes: [
                    { id: 'EKB', label: 'Expert Knowledge', type: 'root', color: '#00d2ff' },
                    { id: 'cat_health', label: 'HEALTH', type: 'category', color: '#bf9eff' },
                    { id: 'cat_skills', label: 'SKILLS', type: 'category', color: '#bf9eff' },
                    { id: 'cat_productivity', label: 'PRODUCTIVITY', type: 'category', color: '#bf9eff' },
                    { id: 'sub_fitness', label: 'Fitness', type: 'subcategory', color: '#00d2ff' },
                    { id: 'sub_coding', label: 'Coding', type: 'subcategory', color: '#00d2ff' },
                    { id: 'sub_focus', label: 'Deep Focus', type: 'subcategory', color: '#00d2ff' },
                    { id: 'step_h1', label: 'Step 1', type: 'step', color: '#ffffff', full_text: 'Start with 30 mins of cardio daily to build baseline endurance.' },
                    { id: 'step_h2', label: 'Step 2', type: 'step', color: '#ffffff', full_text: 'Apply progressive overload in strength training each week.' },
                    { id: 'step_s1', label: 'Step 1', type: 'step', color: '#ffffff', full_text: 'Build one project per concept to solidify understanding.' },
                    { id: 'step_p1', label: 'Step 1', type: 'step', color: '#ffffff', full_text: 'Block 90-minute deep work sessions with zero interruptions.' }
                ],
                links: [
                    { source: 'EKB', target: 'cat_health' }, { source: 'EKB', target: 'cat_skills' }, { source: 'EKB', target: 'cat_productivity' },
                    { source: 'cat_health', target: 'sub_fitness' }, { source: 'cat_skills', target: 'sub_coding' }, { source: 'cat_productivity', target: 'sub_focus' },
                    { source: 'sub_fitness', target: 'step_h1' }, { source: 'sub_fitness', target: 'step_h2' },
                    { source: 'sub_coding', target: 'step_s1' }, { source: 'sub_focus', target: 'step_p1' }
                ]
            };
            if (this.detailPanel) {
                this.detailPanel.innerHTML = `
                    <div class="knowledge-intro">
                        <h5 style="color:#bf9eff">Demo Mode</h5>
                        <p style="color:var(--text-dim);margin-top:0.5rem;">Backend offline. Showing sample knowledge graph.</p>
                        <p style="color:var(--text-dim);font-size:0.8rem;margin-top:1rem;">Click any sphere to explore pathways.</p>
                    </div>`;
            }
        }
    }

    init3DGraph() {
        if (!this.data || !this.canvasContainer) return;
        this.canvasContainer.innerHTML = '';
        this.nodes = [];
        this.links = [];

        const width = this.canvasContainer.clientWidth || 600;
        const height = this.canvasContainer.clientHeight || 600;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.canvasContainer.appendChild(this.renderer.domElement);
        this.camera.position.z = 35;

        // Add OrbitControls for interactivity
        const controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Handle Window Resizing
        window.addEventListener('resize', () => {
            if (!this.isActive || !this.canvasContainer) return;
            const newW = this.canvasContainer.clientWidth;
            const newH = this.canvasContainer.clientHeight;
            this.camera.aspect = newW / newH;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(newW, newH);
        });

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const pl = new THREE.PointLight(0xffffff, 1);
        pl.position.set(10, 10, 10);
        this.scene.add(pl);

        const sizeMap = { root: 1.5, category: 1.0, subcategory: 0.7, step: 0.4 };
        this.data.nodes.forEach(nodeData => {
            const size = sizeMap[nodeData.type] || 0.5;
            const node = new THREE.Mesh(
                new THREE.SphereGeometry(size, 16, 16),
                new THREE.MeshStandardMaterial({ color: nodeData.color, emissive: nodeData.color, emissiveIntensity: 0.2 })
            );
            node.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
            node.userData = nodeData;
            this.scene.add(node);
            this.nodes.push(node);
        });

        const linkMat = new THREE.LineBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.4 });
        this.data.links.forEach(linkData => {
            const source = this.nodes.find(n => n.userData.id === linkData.source);
            const target = this.nodes.find(n => n.userData.id === linkData.target);
            if (source && target) {
                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([source.position.clone(), target.position.clone()]),
                    linkMat
                );
                this.scene.add(line);
                this.links.push({ line, source, target });
            }
        });

        const animate = () => {
            if (!this.isActive) return;
            requestAnimationFrame(animate);
            this.nodes.forEach(n => {
                n.rotation.y += 0.005;
                n.position.y += Math.sin(Date.now() * 0.001 + n.position.x) * 0.002;
            });
            this.links.forEach(l => {
                const p = l.line.geometry.attributes.position.array;
                p[0] = l.source.position.x; p[1] = l.source.position.y; p[2] = l.source.position.z;
                p[3] = l.target.position.x; p[4] = l.target.position.y; p[5] = l.target.position.z;
                l.line.geometry.attributes.position.needsUpdate = true;
            });
            controls.update(); // Required for damping
            this.renderer.render(this.scene, this.camera);
        };
        animate();

        // Click interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        this.canvasContainer.addEventListener('click', (e) => {
            const rect = this.canvasContainer.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.camera);
            const hits = raycaster.intersectObjects(this.nodes);
            if (hits.length > 0) this.showNodeDetails(hits[0].object.userData);
        });
    }

    showNodeDetails(node) {
        if (!this.detailPanel) return;
        if (node.type === 'step') {
            this.detailPanel.innerHTML = `
                <div class="knowledge-step">
                    <div class="step-body">
                        <div style="font-size:0.7rem;letter-spacing:2px;color:#bf9eff;margin-bottom:0.5rem;">KNOWLEDGE STEP</div>
                        <h6 style="font-size:1rem;margin-bottom:0.75rem;">${node.label}</h6>
                        <p style="color:var(--text-dim);line-height:1.7;">${node.full_text}</p>
                    </div>
                </div>`;
        } else {
            this.detailPanel.innerHTML = `
                <div class="knowledge-intro">
                    <h5 style="color:#bf9eff">${node.label}</h5>
                    <p style="color:var(--text-dim);margin-top:0.5rem;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">${node.type}</p>
                    <p style="color:var(--text-dim);font-size:0.85rem;margin-top:1rem;line-height:1.7;">Select a <span style="color:#bf9eff">white sphere</span> (Step node) to view detailed mission requirements.</p>
                </div>`;
        }
        lucide.createIcons();
    }
}
