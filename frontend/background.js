import * as THREE from 'three';

export class Background3D {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        this.mouseX = 0;
        this.mouseY = 0;
        this.targetX = 0;
        this.targetY = 0;

        this.init();
        this.animate();
        this.addEventListeners();
    }

    init() {
        // Renderer Setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Camera Position
        this.camera.position.z = 3;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x0077ff, 2);
        pointLight.position.set(2, 3, 4);
        this.scene.add(pointLight);

        const pointLight2 = new THREE.PointLight(0x00ccff, 1);
        pointLight2.position.set(-2, -3, -4);
        this.scene.add(pointLight2);

        // Glass Core (Icosahedron)
        const geometry = new THREE.IcosahedronGeometry(1, 1);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.5,
            ior: 1.5,
            envMapIntensity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.core = new THREE.Mesh(geometry, material);
        this.scene.add(this.core);

        // Core Wireframe
        const wireframeGeometry = new THREE.IcosahedronGeometry(1.05, 1);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0077ff,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        this.core.add(wireframe);

        // Particle Field
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 2000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 10;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.005,
            color: 0x00ccff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particles);
    }

    addEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX - window.innerWidth / 2) / 100;
            this.mouseY = (e.clientY - window.innerHeight / 2) / 100;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Target following logic for smooth parallax
        this.targetX += (this.mouseX - this.targetX) * 0.05;
        this.targetY += (this.mouseY - this.targetY) * 0.05;

        // Rotate Core
        this.core.rotation.y += 0.005;
        this.core.rotation.x += 0.003;

        // Floating Effect
        this.core.position.y = Math.sin(Date.now() * 0.001) * 0.1;

        // Parallax Interaction
        this.core.position.x = this.targetX * 0.5;
        this.core.position.z = Math.min(Math.max(-this.targetY * 0.5, -0.5), 0.5);

        this.particles.rotation.y = -this.targetX * 0.1;
        this.particles.rotation.x = -this.targetY * 0.1;

        this.renderer.render(this.scene, this.camera);
    }
}
