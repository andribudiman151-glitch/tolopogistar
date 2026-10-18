/**
 * js/topology3d.js
 * Manajemen Three.js Scene, GLTFLoader, OrbitControls, Smooth Camera, dan Hierarchical Raycaster
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_NODE_NAMES, DEVICE_INFO } from './config.js';

/**
 * Class visual untuk merepresentasikan aliran paket data (packet flow)
 * yang meluncur sepanjang kurva 3D kabel UTP dari node perangkat menuju Switch pusat
 */
class CablePacketStream {
    constructor(parentGroup, curveData, onPacketArriveCallback) {
        this.parentGroup = parentGroup;
        this.curve = curveData.curve;
        this.switchPortPos = curveData.switchPortPos;
        this.devicePos = curveData.devicePos;
        this.portIndex = curveData.portIndex !== undefined ? curveData.portIndex : 0;
        this.color = curveData.color || 0x00FFFF;
        this.onPacketArrive = onPacketArriveCallback;

        this.group = new THREE.Group();
        this.group.name = `PacketStream_${curveData.deviceId || 'node'}`;
        this.parentGroup.add(this.group);

        // Buat 3 paket data bercahaya (Ethernet Frame) yang meluncur bergantian
        this.packets = [];
        const packetCount = 3;

        for (let i = 0; i < packetCount; i++) {
            const pGroup = new THREE.Group();

            // 1. Inti paket putih bersinar terang
            const coreMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
            );
            pGroup.add(coreMesh);

            // 2. Aura cahaya paket berwarna cyan terang
            const glowMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.32, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.65
                })
            );
            pGroup.add(glowMesh);

            // 3. Ekor partikel 1 (jejak kecepatan komet)
            const tail1Mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: 0x00D9FF,
                    transparent: true,
                    opacity: 0.55
                })
            );
            pGroup.add(tail1Mesh);

            // 4. Ekor partikel 2
            const tail2Mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 10, 10),
                new THREE.MeshBasicMaterial({
                    color: 0x0D6EFD,
                    transparent: true,
                    opacity: 0.35
                })
            );
            pGroup.add(tail2Mesh);

            // 5. PointLight pada paket utama untuk menerangi kabel dan lantai lab
            if (i === 0) {
                const light = new THREE.PointLight(0x00FFFF, 2.2, 4.0);
                pGroup.add(light);
            }

            this.group.add(pGroup);

            this.packets.push({
                group: pGroup,
                core: coreMesh,
                glow: glowMesh,
                tail1: tail1Mesh,
                tail2: tail2Mesh,
                progress: i / packetCount // Spacing jeda antar paket
            });
        }

        // Cincin gelombang ripple di sisi port Switch saat paket data tiba
        const ringGeo = new THREE.RingGeometry(0.1, 0.45, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0
        });
        this.rippleRing = new THREE.Mesh(ringGeo, ringMat);
        if (this.switchPortPos) {
            this.rippleRing.position.copy(this.switchPortPos).add(new THREE.Vector3(0, 0, -0.05));
            this.rippleRing.lookAt(this.switchPortPos.clone().add(new THREE.Vector3(0, 0, -1)));
        }
        this.group.add(this.rippleRing);
        this.rippleTime = 0;
    }

    update(delta) {
        if (!this.curve) return;

        // Kecepatan alur transmisi (siklus penuh ~2.2 detik)
        const speed = 0.45;

        for (const p of this.packets) {
            p.progress += delta * speed;

            // Deteksi saat paket melewati batas dan masuk ke port Switch (t=1 ke t=0)
            if (p.progress >= 1.0) {
                p.progress -= 1.0;
                if (this.onPacketArrive) {
                    this.onPacketArrive(this.portIndex);
                }
                this.rippleTime = 1.0;
            }

            // Pergerakan data: dari PC Client (t=1.0) menuju Switch Pusat (t=0.0)
            const t = Math.max(0, Math.min(1, 1.0 - p.progress));
            const pos = this.curve.getPointAt(t);
            p.group.position.copy(pos);

            // Ekor partikel berada sedikit di belakang arah laju paket (pada parameter t lebih besar)
            const tTail1 = Math.min(1.0, t + 0.035);
            const posTail1 = this.curve.getPointAt(tTail1);
            p.tail1.position.copy(posTail1).sub(pos);

            const tTail2 = Math.min(1.0, t + 0.07);
            const posTail2 = this.curve.getPointAt(tTail2);
            p.tail2.position.copy(posTail2).sub(pos);

            // Efek denyut aura (pulsing glow)
            const pulse = 1.0 + 0.15 * Math.sin(performance.now() * 0.01 + p.progress * 6.28);
            p.glow.scale.set(pulse, pulse, pulse);
        }

        // Animasi pembesaran dan fade-out cincin ripple di port Switch
        if (this.rippleTime > 0) {
            this.rippleTime -= delta * 3.2;
            const r = Math.max(0, this.rippleTime);
            this.rippleRing.material.opacity = r * 0.85;
            const s = 1.0 + (1.0 - r) * 2.2;
            this.rippleRing.scale.set(s, s, s);
        } else {
            this.rippleRing.material.opacity = 0;
        }
    }

    destroy() {
        if (this.group && this.group.parent) {
            this.group.parent.remove(this.group);
        }
        this.group.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}

class Topology3D {
    constructor() {
        this.container = document.getElementById('three-canvas-container');
        this.fallbackEl = document.getElementById('model-fallback');
        this.loaderEl = document.getElementById('canvas-loader');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.modelRoot = null;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line = { threshold: 0.6 };
        this.raycaster.params.Points = { threshold: 0.6 };
        this.mouse = new THREE.Vector2();
        this.selectableObjects = [];
        this.discoveredDevices = new Set();

        // Highlight state
        this.currentHighlighted = null;
        this.selectedDeviceId = null;
        this.originalMaterials = new Map();

        // Packet flow state (Aliran transmisi data pada jalur kabel)
        this.clock = new THREE.Clock();
        this.cableCurves = new Map();
        this.activePacketStreams = [];
        this.switchLEDs = [];
        this.packetStreamGroup = null;

        // Camera target animation
        this.defaultCameraPos = new THREE.Vector3(16, 14, 18);
        this.defaultLookAt = new THREE.Vector3(0, 1.2, 0);
        this.targetCameraPos = null;
        this.targetLookAt = null;
        this.isCameraAnimating = false;

        this.init();
    }

    init() {
        if (!this.container) return;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x07111F);

        // 2. Camera
        const aspect = this.container.clientWidth / (this.container.clientHeight || 500);
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.copy(this.defaultCameraPos);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight || 500);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 45;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
        this.controls.target.copy(this.defaultLookAt);

        // 5. Lighting
        this.setupLights();

        // 6. Grid & Room Helpers
        this.setupEnvironment();

        // 7. Group khusus visual transmisi paket data
        this.packetStreamGroup = new THREE.Group();
        this.packetStreamGroup.name = "PacketStreams";
        this.scene.add(this.packetStreamGroup);

        // 8. Load GLB Model (or create interactive procedural model fallback)
        this.loadModel();

        // 9. Event Listeners
        this.bindEvents();

        // 10. Render Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xddeeff, 1.1);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(12, 22, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);

        const cyanLight = new THREE.PointLight(0x00d9ff, 1.5, 30);
        cyanLight.position.set(0, 2.5, 0);
        this.scene.add(cyanLight);

        const blueLight = new THREE.PointLight(0x0d6efd, 1.2, 35);
        blueLight.position.set(-10, 8, -10);
        this.scene.add(blueLight);
    }

    setupEnvironment() {
        const grid = new THREE.GridHelper(36, 36, 0x00d9ff, 0x112744);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    loadModel() {
        const loader = new GLTFLoader();
        const modelPath = 'models/topologi-star.glb';

        loader.load(
            modelPath,
            (gltf) => {
                this.modelRoot = gltf.scene;
                this.modelRoot.position.set(0, 0, 0);
                this.scene.add(this.modelRoot);

                this.inspectAndRegisterNodes(this.modelRoot);
                this.setupGLBCableCurves();

                if (this.loaderEl) this.loaderEl.style.display = 'none';
                if (this.fallbackEl) this.fallbackEl.classList.remove('active');

                window.dispatchEvent(new CustomEvent('model-loaded', {
                    detail: { discoveredDevices: Array.from(this.discoveredDevices) }
                }));
            },
            undefined,
            (error) => {
                console.info('[3D Topologi] Model GLB eksternal tidak ditemukan, mengaktifkan model 3D interaktif terintegrasi.');
                // Build procedural model matching exact blender structure
                this.buildProceduralModel();

                if (this.loaderEl) this.loaderEl.style.display = 'none';
                if (this.fallbackEl) this.fallbackEl.classList.remove('active');

                window.dispatchEvent(new CustomEvent('model-loaded', {
                    detail: { discoveredDevices: Array.from(this.discoveredDevices) }
                }));
            }
        );
    }

    /**
     * Membangun model 3D lengkap sesuai struktur node Blender jika file GLB belum diunggah.
     * Mengatur Printer di stasiun meja tersendiri agar terpisah jelas,
     * serta membuat kabel UTP tebal dengan konektor RJ-45 di setiap port perangkat.
     */
    buildProceduralModel() {
        const root = new THREE.Group();
        root.name = "TopologyStarScene";

        const createMat = (color, metal = 0.2, rough = 0.35, emissive = 0x000000) => {
            return new THREE.MeshStandardMaterial({
                color: color,
                metalness: metal,
                roughness: rough,
                emissive: emissive
            });
        };

        const mats = {
            base: createMat(0x131f2d, 0.4, 0.4),
            base2: createMat(0x0c1622, 0.5, 0.3),
            desk: createMat(0x1c2b38, 0.3, 0.4),
            deskMetal: createMat(0x8a99a8, 0.7, 0.25),
            pcw: createMat(0xc4cedb, 0.15, 0.3),
            pcd: createMat(0x101820, 0.4, 0.3),
            screen: createMat(0x0055aa, 0.2, 0.2, 0x002244),
            switch: createMat(0x0a2240, 0.5, 0.25),
            cyan: createMat(0x00d9ff, 0.3, 0.2, 0x006680),
            green: createMat(0x00ff66, 0.2, 0.1, 0x008822),
            router: createMat(0x0d47a1, 0.3, 0.3),
            printer: createMat(0xd8e0ea, 0.15, 0.3),
            printerGlass: createMat(0x081b29, 0.6, 0.15),
            paper: createMat(0xffffff, 0.05, 0.8),
            rj45Clear: new THREE.MeshStandardMaterial({
                color: 0xe0f4ff,
                transparent: true,
                opacity: 0.82,
                roughness: 0.18,
                metalness: 0.1
            }),
            rj45Gold: new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                metalness: 0.85,
                roughness: 0.2
            }),
            cable: [
                0x0d6efd, // PC01 - Blue
                0x00cc66, // PC02 - Green
                0xffb703, // PC03 - Yellow
                0xe63946, // PC04 - Red
                0xdfe7f0, // PC05 - White/Gray
                0xfb8500  // PC06 - Orange
            ],
            cableRouter: 0x1f2937,
            cablePrinter: 0x00b4d8
        };

        // Material collider transparan khusus untuk raycast hitbox
        const colliderMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.0001,
            depthWrite: false
        });

        // 1. Base Lab Table
        const base = new THREE.Mesh(new THREE.BoxGeometry(19, 0.5, 19), mats.base);
        base.position.set(0, 0, 0);
        base.name = "Base";
        root.add(base);

        const baseAccent = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.15, 18.2), mats.base2);
        baseAccent.position.set(0, 0.3, 0);
        baseAccent.name = "BaseAccent";
        root.add(baseAccent);

        // 2. Switch (Perangkat Pusat Konsentrator)
        const switchGroup = new THREE.Group();
        switchGroup.name = "Switch";
        switchGroup.userData = { deviceId: 'switch' };

        // Stand Switch
        const switchStand = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.6, 24), mats.pcd);
        switchStand.position.set(0, 0.6, 0);
        switchStand.name = "SwitchStand";
        switchStand.userData = { deviceId: 'switch' };
        switchGroup.add(switchStand);

        const switchBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.78, 2.8), mats.switch);
        switchBody.position.set(0, 1.25, 0);
        switchBody.name = "SwitchBody";
        switchBody.userData = { deviceId: 'switch' };
        switchGroup.add(switchBody);

        // Label Switch
        const switchBadge = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.04), mats.cyan);
        switchBadge.position.set(0, 1.5, 1.41);
        switchBadge.name = "SwitchBadge";
        switchBadge.userData = { deviceId: 'switch' };
        switchGroup.add(switchBadge);

        // 8 Port LAN pada Switch (6 PC + 1 Router + 1 Printer)
        this.switchLEDs = [];
        this.cableCurves.clear();

        for (let j = 0; j < 6; j++) {
            const px = -1.5 + j * 0.6;
            const port = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.14), mats.pcd);
            port.position.set(px, 1.28, -1.41);
            port.name = `LAN Port ${j + 1}`;
            port.userData = { deviceId: 'switch' };
            switchGroup.add(port);

            const led = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mats.green.clone());
            led.position.set(px, 1.38, -1.48);
            led.name = `LED ${j + 1}`;
            led.userData = { deviceId: 'switch', portIndex: j };
            switchGroup.add(led);
            this.switchLEDs[j] = led;
        }

        // Port Router & Printer di sisi Switch
        const portRouter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.14), mats.pcd);
        portRouter.position.set(-1.5, 1.28, 1.41);
        portRouter.name = "LAN Port Router";
        portRouter.userData = { deviceId: 'switch' };
        switchGroup.add(portRouter);

        const ledRouter = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mats.green.clone());
        ledRouter.position.set(-1.5, 1.38, 1.48);
        ledRouter.name = "LED Router";
        ledRouter.userData = { deviceId: 'switch', portIndex: 6 };
        switchGroup.add(ledRouter);
        this.switchLEDs[6] = ledRouter;

        const portPrinter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.14), mats.pcd);
        portPrinter.position.set(1.5, 1.28, 1.41);
        portPrinter.name = "LAN Port Printer";
        portPrinter.userData = { deviceId: 'switch' };
        switchGroup.add(portPrinter);

        const ledPrinter = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mats.green.clone());
        ledPrinter.position.set(1.5, 1.38, 1.48);
        ledPrinter.name = "LED Printer";
        ledPrinter.userData = { deviceId: 'switch', portIndex: 7 };
        switchGroup.add(ledPrinter);
        this.switchLEDs[7] = ledPrinter;

        root.add(switchGroup);

        // 3. Kabel Group
        const cableGroup = new THREE.Group();
        cableGroup.name = "Cable";
        cableGroup.userData = { deviceId: 'cable' };

        // Helper pembuat konektor RJ-45
        const makeRJ45 = (bootColorMat, nameSuffix = "") => {
            const rjGroup = new THREE.Group();
            rjGroup.name = `RJ45_${nameSuffix}`;
            rjGroup.userData = { deviceId: 'cable' };

            const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.32), mats.rj45Clear);
            body.name = `RJ45_Body_${nameSuffix}`;
            body.userData = { deviceId: 'cable' };
            rjGroup.add(body);

            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.22), bootColorMat);
            boot.position.set(0, 0, 0.22);
            boot.name = `RJ45_Boot_${nameSuffix}`;
            boot.userData = { deviceId: 'cable' };
            rjGroup.add(boot);

            const clip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.22), mats.rj45Clear);
            clip.position.set(0, 0.11, 0.02);
            clip.rotation.x = -0.25;
            clip.name = `RJ45_Clip_${nameSuffix}`;
            clip.userData = { deviceId: 'cable' };
            rjGroup.add(clip);

            const pins = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.08), mats.rj45Gold);
            pins.position.set(0, -0.06, -0.12);
            pins.name = `RJ45_Pins_${nameSuffix}`;
            pins.userData = { deviceId: 'cable' };
            rjGroup.add(pins);

            // Hitbox collider konektor RJ-45 yang lebar agar sangat mudah diklik
            const rjCollider = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), colliderMat);
            rjCollider.name = `Collider_RJ45_${nameSuffix}`;
            rjCollider.userData = { deviceId: 'cable', isCollider: true };
            rjGroup.add(rjCollider);

            return rjGroup;
        };

        // 4. 6 PC Client (Diletakkan melingkar simetris)
        const angles = [0, 60, 120, 180, 240, 300].map(deg => (deg * Math.PI) / 180);
        angles.forEach((ang, i) => {
            const pcNum = i + 1;
            const cx = 6.8 * Math.cos(ang);
            const cz = 6.8 * Math.sin(ang);

            const pcGroup = new THREE.Group();
            pcGroup.name = `PC0${pcNum}`;
            pcGroup.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.position.set(cx, 0, cz);
            pcGroup.lookAt(0, 0, 0);

            // Meja Workstation Client
            const desk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.8), mats.desk);
            desk.position.set(0, 0.8, 0);
            desk.name = `Desk PC0${pcNum}`;
            desk.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(desk);

            // Kaki Meja
            [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].forEach(([lx, lz], k) => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mats.deskMetal);
                leg.position.set(lx, 0.4, lz);
                leg.name = `Leg_${k}_PC0${pcNum}`;
                leg.userData = { deviceId: `pc0${pcNum}` };
                pcGroup.add(leg);
            });

            // CPU Tower
            const cpu = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 1.4), mats.pcd);
            cpu.position.set(1.2, 1.4, 0);
            cpu.name = `Client ${pcNum} CPU`;
            cpu.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(cpu);

            // Monitor
            const monitor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 0.2), mats.pcw);
            monitor.position.set(0, 2.2, 0);
            monitor.name = `Client ${pcNum} Monitor`;
            monitor.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(monitor);

            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.8, 12), mats.pcd);
            stand.position.set(0, 1.15, 0);
            stand.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(stand);

            const screen = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.15, 0.05), mats.screen);
            screen.position.set(0, 2.2, 0.1);
            screen.name = `Client ${pcNum} Screen`;
            screen.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(screen);

            // Keyboard
            const kb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.65), mats.pcw);
            kb.position.set(0, 0.9, 0.6);
            kb.name = `Client ${pcNum} Keyboard`;
            kb.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(kb);

            // Mouse
            const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.35), mats.pcd);
            mouse.position.set(1.0, 0.9, 0.6);
            mouse.name = `Client ${pcNum} Mouse`;
            mouse.userData = { deviceId: `pc0${pcNum}` };
            pcGroup.add(mouse);

            root.add(pcGroup);

            // KABEL UTP (PC -> Switch)
            const cMat = createMat(mats.cable[i], 0.1, 0.3);
            const switchPortPos = new THREE.Vector3(-1.5 + i * 0.6, 1.28, -1.41);
            const pcNICPos = new THREE.Vector3(cx, 1.0, cz);

            const curve = new THREE.CatmullRomCurve3([
                switchPortPos.clone().add(new THREE.Vector3(0, 0, -0.2)),
                new THREE.Vector3(switchPortPos.x * 1.3, 0.45, -2.1),
                new THREE.Vector3(cx * 0.65, 0.45, cz * 0.65),
                pcNICPos.clone().add(new THREE.Vector3(0, -0.15, 0))
            ]);

            // Visual Tube Tebal (radius 0.13)
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 10, false), cMat);
            tube.name = `UTP Cable PC0${pcNum}`;
            tube.userData = { deviceId: 'cable' };
            cableGroup.add(tube);

            // Simpan data kurva untuk animasi transmisi paket data
            this.cableCurves.set(`pc0${pcNum}`, {
                curve: curve,
                switchPortPos: switchPortPos,
                devicePos: pcNICPos,
                portIndex: i,
                color: mats.cable[i],
                deviceId: `pc0${pcNum}`
            });

            // Hitbox Collider Tebal (radius 0.36) agar mudah di-click dari sudut mana pun
            const colliderTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.36, 8, false), colliderMat);
            colliderTube.name = `Collider_Cable_PC0${pcNum}`;
            colliderTube.userData = { deviceId: 'cable', isCollider: true };
            cableGroup.add(colliderTube);

            // Konektor RJ-45 di sisi Switch
            const rjSwitch = makeRJ45(cMat, `Switch_Port_${pcNum}`);
            rjSwitch.position.copy(switchPortPos).add(new THREE.Vector3(0, 0, -0.18));
            cableGroup.add(rjSwitch);

            // Konektor RJ-45 di sisi PC NIC
            const rjPC = makeRJ45(cMat, `PC0${pcNum}`);
            rjPC.position.copy(pcNICPos);
            rjPC.lookAt(0, 1.0, 0);
            cableGroup.add(rjPC);
        });

        // 5. Router (Diletakkan di area belakang pada stand terpisah)
        const routerGroup = new THREE.Group();
        routerGroup.name = "Router";
        routerGroup.userData = { deviceId: 'router' };
        routerGroup.position.set(0, 0, -6.6);

        // Stand Rak Router
        const routerStand = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 1.6), mats.pcd);
        routerStand.position.set(0, 0.9, 0);
        routerStand.name = "RouterRack";
        routerStand.userData = { deviceId: 'router' };
        routerGroup.add(routerStand);

        const routerBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 1.4), mats.router);
        routerBody.position.set(0, 2.1, 0);
        routerBody.name = "RouterBody";
        routerBody.userData = { deviceId: 'router' };
        routerGroup.add(routerBody);

        const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10), mats.pcd);
        ant1.position.set(-0.9, 2.8, -0.5);
        ant1.name = "RouterAntenna1";
        ant1.userData = { deviceId: 'router' };
        routerGroup.add(ant1);

        const ant2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10), mats.pcd);
        ant2.position.set(0.9, 2.8, -0.5);
        ant2.name = "RouterAntenna2";
        ant2.userData = { deviceId: 'router' };
        routerGroup.add(ant2);

        root.add(routerGroup);

        // Kabel UTP Router ke Switch
        const routerPortPos = new THREE.Vector3(-1.5, 1.28, 1.41);
        const routerCurve = new THREE.CatmullRomCurve3([
            routerPortPos.clone().add(new THREE.Vector3(0, 0, 0.2)),
            new THREE.Vector3(-1.0, 0.45, 2.2),
            new THREE.Vector3(-0.6, 0.45, -3.8),
            new THREE.Vector3(0, 1.8, -6.0)
        ]);
        const routerCableMat = createMat(mats.cableRouter, 0.1, 0.4);
        const routerCable = new THREE.Mesh(new THREE.TubeGeometry(routerCurve, 20, 0.13, 8, false), routerCableMat);
        routerCable.name = "UTP Router";
        routerCable.userData = { deviceId: 'cable' };
        cableGroup.add(routerCable);

        this.cableCurves.set('router', {
            curve: routerCurve,
            switchPortPos: routerPortPos,
            devicePos: new THREE.Vector3(0, 1.8, -6.0),
            portIndex: 6,
            color: mats.cableRouter,
            deviceId: 'router'
        });

        const colliderRouter = new THREE.Mesh(new THREE.TubeGeometry(routerCurve, 16, 0.36, 8, false), colliderMat);
        colliderRouter.userData = { deviceId: 'cable', isCollider: true };
        cableGroup.add(colliderRouter);

        const rjRouter1 = makeRJ45(routerCableMat, "Router_Switch");
        rjRouter1.position.copy(routerPortPos).add(new THREE.Vector3(0, 0, 0.18));
        cableGroup.add(rjRouter1);

        const rjRouter2 = makeRJ45(routerCableMat, "Router_Dev");
        rjRouter2.position.set(0, 2.0, -5.9);
        cableGroup.add(rjRouter2);

        // 6. Network Printer (PISAHKAN SECARA EKSPLISIT PADA MEJA TERPISAH DI AREA TERBUKA)
        // Posisi baru: (-6.4, 0, 4.2) di antara PC03 dan PC04, berdiri di meja kerja printer sendiri
        const printerGroup = new THREE.Group();
        printerGroup.name = "Printer";
        printerGroup.userData = { deviceId: 'printer' };
        printerGroup.position.set(-6.4, 0, 4.2);
        printerGroup.rotation.y = 0.5;

        // Meja Printer Tersendiri
        const printerDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.8), mats.desk);
        printerDesk.position.set(0, 0.82, 0);
        printerDesk.name = "PrinterDesk";
        printerDesk.userData = { deviceId: 'printer' };
        printerGroup.add(printerDesk);

        // 4 Kaki Meja Printer
        [[-1.0, -0.7], [1.0, -0.7], [-1.0, 0.7], [1.0, 0.7]].forEach(([lx, lz], pk) => {
            const pLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.82), mats.deskMetal);
            pLeg.position.set(lx, 0.41, lz);
            pLeg.name = `PrinterLeg_${pk}`;
            pLeg.userData = { deviceId: 'printer' };
            printerGroup.add(pLeg);
        });

        // Rak Bawah Meja Printer (tempat kertas cadangan)
        const printerShelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.4), mats.pcd);
        printerShelf.position.set(0, 0.35, 0);
        printerShelf.name = "PrinterShelf";
        printerShelf.userData = { deviceId: 'printer' };
        printerGroup.add(printerShelf);

        // Kertas cadangan di rak bawah
        const paperStock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.9), mats.paper);
        paperStock.position.set(0, 0.48, 0);
        paperStock.name = "PaperStock";
        paperStock.userData = { deviceId: 'printer' };
        printerGroup.add(paperStock);

        // Label Meja: "PRINTER JARINGAN"
        const printerBadge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.04), mats.cyan);
        printerBadge.position.set(0, 0.82, 0.92);
        printerBadge.name = "PrinterBadge";
        printerBadge.userData = { deviceId: 'printer' };
        printerGroup.add(printerBadge);

        // Badan Utama Printer
        const printerBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.72, 1.4), mats.printer);
        printerBody.position.set(0, 1.25, 0);
        printerBody.name = "PrinterBody";
        printerBody.userData = { deviceId: 'printer' };
        printerGroup.add(printerBody);

        // Scanner Flatbed Top
        const scannerTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 1.35), mats.pcd);
        scannerTop.position.set(0, 1.66, 0);
        scannerTop.name = "ScannerTop";
        scannerTop.userData = { deviceId: 'printer' };
        printerGroup.add(scannerTop);

        const scannerGlass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 1.0), mats.printerGlass);
        scannerGlass.position.set(0, 1.73, 0);
        scannerGlass.name = "ScannerGlass";
        scannerGlass.userData = { deviceId: 'printer' };
        printerGroup.add(scannerGlass);

        // Baki Kertas Atas (Input Tray)
        const inputTray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.08), mats.pcd);
        inputTray.position.set(0, 1.85, -0.6);
        inputTray.rotation.x = -0.35;
        inputTray.name = "PrinterInputTray";
        inputTray.userData = { deviceId: 'printer' };
        printerGroup.add(inputTray);

        const inputPaper = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.04), mats.paper);
        inputPaper.position.set(0, 1.88, -0.58);
        inputPaper.rotation.x = -0.35;
        inputPaper.name = "PrinterInputPaper";
        inputPaper.userData = { deviceId: 'printer' };
        printerGroup.add(inputPaper);

        // Baki Keluaran Kertas (Output Tray)
        const outputTray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.65), mats.pcd);
        outputTray.position.set(0, 1.02, 0.85);
        outputTray.name = "PrinterOutputTray";
        outputTray.userData = { deviceId: 'printer' };
        printerGroup.add(outputTray);

        const printedDoc = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.5), mats.paper);
        printedDoc.position.set(0, 1.05, 0.8);
        printedDoc.name = "PrintedDoc";
        printedDoc.userData = { deviceId: 'printer' };
        printerGroup.add(printedDoc);

        // Panel Layar & Tombol Kontrol Printer
        const lcdPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.04), mats.cyan);
        lcdPanel.position.set(0.5, 1.45, 0.72);
        lcdPanel.rotation.x = -0.25;
        lcdPanel.name = "PrinterLCD";
        lcdPanel.userData = { deviceId: 'printer' };
        printerGroup.add(lcdPanel);

        const powerLed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), mats.green);
        powerLed.position.set(0.15, 1.45, 0.72);
        powerLed.name = "PrinterPowerLED";
        powerLed.userData = { deviceId: 'printer' };
        printerGroup.add(powerLed);

        // Hitbox klik untuk printer (melingkupi seluruh printer dan mejanya agar sangat mudah diklik)
        const printerHitbox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 2.2), colliderMat);
        printerHitbox.position.set(0, 1.1, 0);
        printerHitbox.name = "PrinterHitbox";
        printerHitbox.userData = { deviceId: 'printer', isCollider: true };
        printerGroup.add(printerHitbox);

        root.add(printerGroup);

        // Kabel UTP Printer ke Switch (dihubungkan ke port belakang meja printer)
        const printerPortPos = new THREE.Vector3(1.5, 1.28, 1.41);
        const printerDestPos = new THREE.Vector3(-6.7, 0.85, 3.6);

        const printerCurve = new THREE.CatmullRomCurve3([
            printerPortPos.clone().add(new THREE.Vector3(0, 0, 0.2)),
            new THREE.Vector3(1.8, 0.45, 2.5),
            new THREE.Vector3(-2.0, 0.45, 3.8),
            printerDestPos
        ]);
        const printerCableMat = createMat(mats.cablePrinter, 0.1, 0.3);
        const printerCable = new THREE.Mesh(new THREE.TubeGeometry(printerCurve, 22, 0.13, 8, false), printerCableMat);
        printerCable.name = "UTP Printer";
        printerCable.userData = { deviceId: 'cable' };
        cableGroup.add(printerCable);

        this.cableCurves.set('printer', {
            curve: printerCurve,
            switchPortPos: printerPortPos,
            devicePos: printerDestPos,
            portIndex: 7,
            color: mats.cablePrinter,
            deviceId: 'printer'
        });

        const colliderPrinter = new THREE.Mesh(new THREE.TubeGeometry(printerCurve, 18, 0.36, 8, false), colliderMat);
        colliderPrinter.userData = { deviceId: 'cable', isCollider: true };
        cableGroup.add(colliderPrinter);

        const rjPrinter1 = makeRJ45(printerCableMat, "Printer_Switch");
        rjPrinter1.position.copy(printerPortPos).add(new THREE.Vector3(0, 0, 0.18));
        cableGroup.add(rjPrinter1);

        const rjPrinter2 = makeRJ45(printerCableMat, "Printer_Dev");
        rjPrinter2.position.copy(printerDestPos);
        cableGroup.add(rjPrinter2);

        root.add(cableGroup);

        this.modelRoot = root;
        this.scene.add(this.modelRoot);

        this.inspectAndRegisterNodes(this.modelRoot);
    }

    inspectAndRegisterNodes(root) {
        console.log('%c[3D TOPOLOGY] Scene dimuat. Memulai inspeksi node objek...', 'color:#00D9FF; font-weight:bold;');
        this.selectableObjects = [];

        root.traverse((child) => {
            if (child.isMesh) {
                // Jangan masukkan mesh lantai/meja dasar ke selectableObjects
                // agar klik pada kabel atau perangkat tidak terhalang oleh background
                if (child.name !== 'Base' && child.name !== 'BaseAccent') {
                    if (!child.userData.isCollider) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    this.selectableObjects.push(child);
                }
            }

            // Normalisasi identifikasi node perangkat untuk GLB dan procedural
            const nm = child.name ? child.name.trim() : '';
            if (/printer/i.test(nm)) {
                if (!child.userData.deviceId) child.userData.deviceId = 'printer';
            } else if (/switch|hub/i.test(nm)) {
                if (!child.userData.deviceId) child.userData.deviceId = 'switch';
            } else if (/router/i.test(nm)) {
                if (!child.userData.deviceId) child.userData.deviceId = 'router';
            } else if (/cable|kabel|utp|rj\s*45|rj-?45/i.test(nm)) {
                if (!child.userData.deviceId) child.userData.deviceId = 'cable';
            } else {
                for (let i = 1; i <= 6; i++) {
                    const reg = new RegExp(`(pc|client)\\s*0?${i}`, 'i');
                    if (reg.test(nm)) {
                        if (!child.userData.deviceId) child.userData.deviceId = `pc0${i}`;
                        break;
                    }
                }
            }
        });

        for (const [key, dev] of Object.entries(DEVICE_INFO)) {
            const node = this.findDeviceNode(key);
            if (node) {
                this.discoveredDevices.add(key);
                console.log(`%c[FOUND] ${dev.name} -> Node: "${node.name}"`, 'color:#2ECC71;');
            } else {
                console.log(`%c[NOT FOUND] ${dev.name} (ID: ${key})`, 'color:#E67E22;');
            }
        }

        console.log(`[3D TOPOLOGY] Total mesh interaktif terdaftar: ${this.selectableObjects.length}`);
    }

    findDeviceNode(deviceId) {
        if (!this.modelRoot) return null;

        const configName = MODEL_NODE_NAMES[deviceId] || deviceId;
        let matched = null;

        // Tahap 1: Cocokkan root group/empty dengan nama exact atau userData (bukan sub-mesh individual)
        this.modelRoot.traverse((obj) => {
            if (matched) return;

            if (obj.isMesh) return;

            if (obj.userData && obj.userData.deviceId === deviceId) {
                matched = obj;
                return;
            }

            const nm = obj.name ? obj.name.trim() : '';

            if (nm.toLowerCase() === configName.toLowerCase()) {
                matched = obj;
                return;
            }

            if (deviceId === 'printer' && /^printer$/i.test(nm)) matched = obj;
            else if (deviceId === 'switch' && /^switch$/i.test(nm)) matched = obj;
            else if (deviceId === 'router' && /^router$/i.test(nm)) matched = obj;
            else if (deviceId === 'cable' && /^(cable|kabel)$/i.test(nm)) matched = obj;
            else if (/^pc0[1-6]$/i.test(deviceId)) {
                const num = deviceId.replace(/\D/g, '');
                if (new RegExp(`^(pc|client)\\s*0?${num}$`, 'i').test(nm)) matched = obj;
            }
        });

        if (matched) return matched;

        // Tahap 2: Fallback pencarian lebih longgar jika root tidak berupa Group/Empty khusus
        this.modelRoot.traverse((obj) => {
            if (matched) return;
            const nm = obj.name ? obj.name.trim() : '';
            if (deviceId === 'printer' && /printer/i.test(nm)) matched = obj;
            else if (deviceId === 'switch' && /switch|hub/i.test(nm)) matched = obj;
            else if (deviceId === 'router' && /router/i.test(nm)) matched = obj;
            else if (deviceId === 'cable' && /(cable|kabel|utp|rj45)/i.test(nm)) matched = obj;
        });

        return matched;
    }

    getDeviceRootNode(deviceId) {
        if (!this.modelRoot) return null;
        if (deviceId === 'cable') {
            return this.modelRoot.getObjectByName('Cable') || this.findDeviceNode('cable');
        }
        return this.findDeviceNode(deviceId);
    }

    resolveDeviceFromObject(mesh) {
        if (!mesh) return null;

        let current = mesh;
        while (current && current !== this.scene) {
            // 1. Cek userData.deviceId
            if (current.userData && current.userData.deviceId) {
                const id = current.userData.deviceId;
                if (DEVICE_INFO[id]) {
                    const rootNode = this.getDeviceRootNode(id) || current;
                    return { id, rootNode, info: DEVICE_INFO[id] };
                }
            }

            // 2. Cek nama node
            const currentName = current.name ? current.name.trim() : '';

            // Cek kabel & RJ-45
            if (/cable|kabel|utp|rj\s*45|rj-?45/i.test(currentName)) {
                const rootNode = this.getDeviceRootNode('cable') || current;
                return { id: 'cable', rootNode, info: DEVICE_INFO.cable };
            }

            // Cek printer
            if (/printer/i.test(currentName)) {
                const rootNode = this.getDeviceRootNode('printer') || current;
                return { id: 'printer', rootNode, info: DEVICE_INFO.printer };
            }

            // Cek switch
            if (/switch|hub/i.test(currentName)) {
                const rootNode = this.getDeviceRootNode('switch') || current;
                return { id: 'switch', rootNode, info: DEVICE_INFO.switch };
            }

            // Cek router
            if (/router/i.test(currentName)) {
                const rootNode = this.getDeviceRootNode('router') || current;
                return { id: 'router', rootNode, info: DEVICE_INFO.router };
            }

            // Cek PC01 - PC06
            for (let i = 1; i <= 6; i++) {
                const pcId = `pc0${i}`;
                const reg = new RegExp(`(pc|client)\\s*0?${i}`, 'i');
                if (reg.test(currentName)) {
                    const rootNode = this.getDeviceRootNode(pcId) || current;
                    return { id: pcId, rootNode, info: DEVICE_INFO[pcId] };
                }
            }

            if (current === this.modelRoot) break;
            current = current.parent;
        }

        return null;
    }

    onPointerDown(event) {
        if (event.target.closest('#info-panel') || event.target.closest('#progress-panel') || event.target.closest('.zoom-controls') || event.target.closest('.top-bar')) {
            return;
        }

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const deviceData = this.resolveDeviceFromObject(hitMesh);

            if (deviceData && deviceData.info) {
                // TOGGLE ZOOM: Jika perangkat yang sedang aktif diklik lagi -> ZOOM OUT kembali ke sudut awal!
                if (this.selectedDeviceId === deviceData.id) {
                    this.deselectDevice(true);
                } else {
                    this.selectDevice(deviceData);
                }
            } else {
                this.deselectDevice(true);
            }
        } else {
            // Klik pada area kosong -> ZOOM OUT ke tampilan umum
            this.deselectDevice(true);
        }
    }

    selectDevice(deviceData) {
        const { id, rootNode, info } = deviceData;

        this.resetHighlight();
        this.selectedDeviceId = id;
        this.currentHighlighted = rootNode;

        // Beri efek highlight cyan glow pada seluruh sub-mesh visual perangkat
        rootNode.traverse((child) => {
            if (child.isMesh && child.material && !child.userData.isCollider) {
                if (!this.originalMaterials.has(child)) {
                    this.originalMaterials.set(child, {
                        material: child.material,
                        emissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000),
                        emissiveIntensity: child.material.emissiveIntensity !== undefined ? child.material.emissiveIntensity : 0
                    });
                }

                child.material = child.material.clone();
                if (child.material.emissive) {
                    child.material.emissive = new THREE.Color(0x00D9FF);
                    child.material.emissiveIntensity = 0.65;
                }
            }
        });

        // ZOOM IN dinamis & dramatis ke perangkat yang diklik (termasuk Network Printer)
        this.focusCameraToDevice(id, rootNode);

        // Aktifkan animasi aliran paket data (packet flow) sepanjang jalur kabel 3D
        this.startPacketFlow(id);

        window.dispatchEvent(new CustomEvent('device-clicked', { detail: { device: info, rootNode } }));
    }

    focusCameraToDevice(id, rootNode) {
        if (!rootNode) return;

        // Hitung bounding box dunia nyata dari seluruh mesh visual (abaikan collider transparan)
        const box = new THREE.Box3();
        rootNode.traverse((c) => {
            if (c.isMesh && !c.userData.isCollider) {
                box.expandByObject(c);
            }
        });

        if (box.isEmpty()) {
            box.setFromObject(rootNode);
        }

        const center = new THREE.Vector3();
        box.getCenter(center);

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 1.0);

        if (id === 'printer') {
            // ZOOM IN dekat ke Network Printer di mejanya
            const dist = Math.max(maxDim * 1.5, 3.8);
            this.targetLookAt = center.clone();
            this.targetLookAt.y = Math.max(center.y, 1.1);

            // Arahkan kamera dari sudut depan meja printer agar seluruh unit terlihat jelas
            const offsetX = center.x <= 0 ? 2.5 : -2.5;
            const offsetZ = center.z <= 0 ? 2.5 : -2.5;
            this.targetCameraPos = new THREE.Vector3(
                center.x + offsetX,
                center.y + 1.8,
                center.z + offsetZ
            );
            this.isCameraAnimating = true;
        } else if (id === 'switch') {
            // ZOOM IN ke Switch pusat
            this.targetLookAt = center.clone();
            this.targetCameraPos = new THREE.Vector3(center.x + 3.2, center.y + 2.5, center.z + 3.2);
            this.isCameraAnimating = true;
        } else if (id === 'router') {
            // ZOOM IN ke Router gateway
            this.targetLookAt = center.clone();
            const offsetZ = center.z < 0 ? 3.0 : -3.0;
            this.targetCameraPos = new THREE.Vector3(center.x + 2.4, center.y + 1.9, center.z + offsetZ);
            this.isCameraAnimating = true;
        } else if (id === 'cable') {
            // ZOOM IN fokus ke jalur kabel UTP dan konektor RJ-45
            this.targetLookAt = new THREE.Vector3(1.2, 1.25, -1.2);
            this.targetCameraPos = new THREE.Vector3(4.2, 3.2, 2.0);
            this.isCameraAnimating = true;
        } else {
            // ZOOM IN ke PC Client
            const dist = Math.max(maxDim * 1.5, 3.8);
            const dir = new THREE.Vector3().subVectors(this.camera.position, center).normalize();
            this.targetLookAt = center.clone();
            this.targetCameraPos = center.clone().add(dir.multiplyScalar(dist));
            this.targetCameraPos.y = Math.max(this.targetCameraPos.y, center.y + 1.3);
            this.isCameraAnimating = true;
        }
    }

    deselectDevice(zoomOut = true) {
        this.resetHighlight();
        this.selectedDeviceId = null;
        this.stopPacketFlow(); // Hentikan aliran paket data saat tidak ada perangkat yang dipilih

        if (zoomOut) {
            // ZOOM OUT kembali ke sudut pandang overview default
            this.targetLookAt = this.defaultLookAt.clone();
            this.targetCameraPos = this.defaultCameraPos.clone();
            this.isCameraAnimating = true;
        }
        window.dispatchEvent(new CustomEvent('device-unselected'));
    }

    /**
     * Memulai animasi visual aliran paket data (packet flow) sepanjang kabel 3D
     * Merepresentasikan komunikasi client ke Switch konsentrator pusat
     */
    startPacketFlow(deviceId) {
        this.stopPacketFlow();

        if (!this.packetStreamGroup) return;

        if (deviceId && deviceId.startsWith('pc')) {
            // Transmisi paket data dari PC yang diklik menuju Switch Pusat
            const curveData = this.cableCurves.get(deviceId);
            if (curveData) {
                const stream = new CablePacketStream(this.packetStreamGroup, curveData, (portIdx) => this.flashSwitchLED(portIdx));
                this.activePacketStreams.push(stream);
            }
        } else if (deviceId === 'cable') {
            // Klik pada kabel -> demonstrasikan aliran paket data di SELURUH jalur kabel PC ke Switch Pusat
            for (let i = 1; i <= 6; i++) {
                const curveData = this.cableCurves.get(`pc0${i}`);
                if (curveData) {
                    const stream = new CablePacketStream(this.packetStreamGroup, curveData, (portIdx) => this.flashSwitchLED(portIdx));
                    this.activePacketStreams.push(stream);
                }
            }
        } else if (deviceId === 'printer' || deviceId === 'router') {
            const curveData = this.cableCurves.get(deviceId);
            if (curveData) {
                const stream = new CablePacketStream(this.packetStreamGroup, curveData, (portIdx) => this.flashSwitchLED(portIdx));
                this.activePacketStreams.push(stream);
            }
        } else if (deviceId === 'switch') {
            // Switch pusat: tunjukkan penerimaan aliran paket dari seluruh PC
            for (let i = 1; i <= 6; i++) {
                const curveData = this.cableCurves.get(`pc0${i}`);
                if (curveData) {
                    const stream = new CablePacketStream(this.packetStreamGroup, curveData, (portIdx) => this.flashSwitchLED(portIdx));
                    this.activePacketStreams.push(stream);
                }
            }
        }
    }

    /**
     * Menghentikan seluruh animasi aliran paket data dan membersihkan objek 3D-nya
     */
    stopPacketFlow() {
        for (const stream of this.activePacketStreams) {
            stream.destroy();
        }
        this.activePacketStreams = [];
    }

    /**
     * Efek lampu indikator LED port Switch menyala/berkedip saat menerima paket data
     */
    flashSwitchLED(portIndex) {
        if (!this.switchLEDs || this.switchLEDs.length === 0) return;
        const led = this.switchLEDs[portIndex];
        if (led && led.material) {
            led.material.emissive = new THREE.Color(0x00FF88);
            led.material.emissiveIntensity = 2.8;
            led.scale.set(1.5, 1.5, 1.5);
        }
    }

    /**
     * Menyiapkan kurva kabel secara dinamis jika memuat model GLB eksternal
     */
    setupGLBCableCurves() {
        if (this.cableCurves.size > 0) return;

        const switchNode = this.findDeviceNode('switch');
        if (!switchNode) return;

        const switchPos = new THREE.Vector3();
        switchNode.getWorldPosition(switchPos);

        for (let i = 1; i <= 6; i++) {
            const pcId = `pc0${i}`;
            const pcNode = this.findDeviceNode(pcId);
            if (pcNode) {
                const pcPos = new THREE.Vector3();
                pcNode.getWorldPosition(pcPos);

                const switchPort = new THREE.Vector3(-1.5 + (i - 1) * 0.6, switchPos.y + 0.1, switchPos.z - 1.4);
                const curve = new THREE.CatmullRomCurve3([
                    switchPort.clone().add(new THREE.Vector3(0, 0, -0.2)),
                    new THREE.Vector3(switchPort.x * 1.3, 0.45, -2.1),
                    new THREE.Vector3(pcPos.x * 0.65, 0.45, pcPos.z * 0.65),
                    pcPos.clone().add(new THREE.Vector3(0, 0.2, 0))
                ]);

                this.cableCurves.set(pcId, {
                    curve: curve,
                    switchPortPos: switchPort,
                    devicePos: pcPos,
                    portIndex: i - 1,
                    color: 0x00D9FF,
                    deviceId: pcId
                });
            }
        }
    }

    resetHighlight() {
        if (!this.currentHighlighted) return;

        this.currentHighlighted.traverse((child) => {
            if (child.isMesh && this.originalMaterials.has(child)) {
                const orig = this.originalMaterials.get(child);
                child.material.dispose();
                child.material = orig.material;
                if (child.material.emissive) {
                    child.material.emissive.copy(orig.emissive);
                    child.material.emissiveIntensity = orig.emissiveIntensity;
                }
            }
        });

        this.currentHighlighted = null;
    }

    zoom(delta) {
        const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        const newDist = this.camera.position.distanceTo(this.controls.target) + delta;

        if (newDist >= this.controls.minDistance && newDist <= this.controls.maxDistance) {
            this.camera.position.addScaledVector(dir, delta);
        }
    }

    resetView() {
        this.deselectDevice(true);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            if (!this.container || !this.camera || !this.renderer) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight || 500;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });

        const dom = this.renderer.domElement;
        let pointerDownTime = 0;
        let pointerDownPos = { x: 0, y: 0 };

        dom.addEventListener('pointerdown', (e) => {
            pointerDownTime = performance.now();
            pointerDownPos = { x: e.clientX, y: e.clientY };
        });

        dom.addEventListener('pointerup', (e) => {
            const timeDiff = performance.now() - pointerDownTime;
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);

            // Toleransi klik hingga 650ms dan pergeseran kecil hingga 16px (sangat nyaman untuk trackpad/layar sentuh/kabel tipis)
            if (timeDiff < 650 && dist < 16) {
                this.onPointerDown(e);
            }
        });

        // Kursor pointer saat mouse mengarah ke perangkat, kabel UTP, atau konektor RJ-45
        dom.addEventListener('pointermove', (e) => {
            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);

            if (intersects.length > 0) {
                const deviceData = this.resolveDeviceFromObject(intersects[0].object);
                if (deviceData && deviceData.info) {
                    dom.style.cursor = 'pointer';
                    return;
                }
            }
            dom.style.cursor = 'default';
        });

        window.addEventListener('device-unselected', () => {
            this.resetHighlight();
            this.selectedDeviceId = null;
            this.targetLookAt = this.defaultLookAt.clone();
            this.targetCameraPos = this.defaultCameraPos.clone();
            this.isCameraAnimating = true;
        });
    }

    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);

        // Update animasi aliran paket data pada kabel yang aktif
        if (this.activePacketStreams.length > 0) {
            for (const stream of this.activePacketStreams) {
                stream.update(delta);
            }
        }

        // Efek peredupan alami lampu LED Switch setelah berkedip
        if (this.switchLEDs && this.switchLEDs.length > 0) {
            for (const led of this.switchLEDs) {
                if (led && led.material && led.material.emissiveIntensity > 0.2) {
                    led.material.emissiveIntensity = THREE.MathUtils.lerp(led.material.emissiveIntensity, 0.15, 0.08);
                    led.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
                }
            }
        }

        if (this.isCameraAnimating && this.targetCameraPos && this.targetLookAt) {
            this.camera.position.lerp(this.targetCameraPos, 0.08);
            this.controls.target.lerp(this.targetLookAt, 0.08);

            if (this.camera.position.distanceTo(this.targetCameraPos) < 0.08 &&
                this.controls.target.distanceTo(this.targetLookAt) < 0.08) {
                this.camera.position.copy(this.targetCameraPos);
                this.controls.target.copy(this.targetLookAt);
                this.isCameraAnimating = false;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const topologyApp = new Topology3D();
window.topologyApp = topologyApp;
export default topologyApp;
