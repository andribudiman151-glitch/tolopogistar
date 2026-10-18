/**
 * js/hardware-3d-viewer.js
 * Visualisator Model 3D Interaktif Spesifikasi Perangkat Keras Topologi Star
 * Fitur:
 * - Rotasi 360° interaktif (Mouse Drag & Touch Swipe) dengan inersia halus (damping)
 * - Auto-Rotate (Putar Otomatis) dengan toggle ON/OFF
 * - Kontrol Zoom In (+), Zoom Out (-), dan Reset Sudut Kamera
 * - Mode Tampilan Realistis PBR & Mode Hologram/Wireframe Futuristik
 * - Model 3D Prosedural Detail Tinggi:
 *     1. Switch Sentral 24-Port (LED indikator berkedip, kabel Cat6 RJ-45 terpasang, rack ears)
 *     2. PC Workstation Client (Monitor widescreen + Live GUI Star Topology, CPU RGB fan, keyboard, mouse)
 *     3. Router Gateway (4 Antena eksternal terartikulasi, strip LED WAN/LAN/WiFi)
 *     4. Network Printer (Flatbed scanner, LCD touch display, baki kertas, dokumen uji cetak)
 * - Platform silinder holografik bercahaya di bawah perangkat
 */

import * as THREE from 'three';
import { soundManager } from './sound.js';

export class Hardware3DViewer {
    constructor() {
        this.container = document.getElementById('hw-3d-canvas-container');
        this.badgeTextEl = document.getElementById('hw-3d-node-badge-text');
        this.hintOverlayEl = document.getElementById('hw-3d-hint-overlay');
        this.btnAutoRotate = document.getElementById('hw-3d-btn-autorotate');
        this.btnReset = document.getElementById('hw-3d-btn-reset');
        this.btnWireframe = document.getElementById('hw-3d-btn-wireframe');
        this.btnZoomIn = document.getElementById('hw-3d-btn-zoom-in');
        this.btnZoomOut = document.getElementById('hw-3d-btn-zoom-out');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentModelGroup = null;
        this.pedestalGroup = null;
        this.accentLights = [];
        this.animatedElements = [];

        // State interaksi rotasi & zoom
        this.isDragging = false;
        this.prevPointerPos = { x: 0, y: 0 };
        this.targetRotation = { x: 0.28, y: -0.65 };
        this.currentRotation = { x: 0.28, y: -0.65 };
        this.rotationVelocity = { x: 0, y: 0 };

        this.autoRotate = true;
        this.autoRotateSpeed = 0.007;
        this.isWireframe = false;
        this.hasInteracted = false;

        // Jarak kamera & zoom
        this.targetDistance = 6.2;
        this.currentDistance = 6.2;
        this.minDistance = 3.6;
        this.maxDistance = 10.5;

        // Reset default view
        this.defaultRot = { x: 0.28, y: -0.65 };
        this.defaultDist = 6.2;

        this.currentHardwareId = null;
        this.clock = new THREE.Clock();
        this.animationFrameId = null;
        this.isRunning = false;

        this.init();
    }

    init() {
        if (!this.container) return;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06101E);

        // 2. Camera
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 280;
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.updateCameraPosition();

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Sisipkan canvas ke container
        this.container.appendChild(this.renderer.domElement);

        // 4. Pencahayaan Studio Interaktif
        this.setupLighting();

        // 5. Platform Pedestal Holografik Futuristik
        this.setupPedestal();

        // 6. Bind Event Listeners (Drag, Touch, Buttons, Window Resize)
        this.bindEvents();
    }

    setupLighting() {
        // Ambient Light lembut kebiruan
        const ambient = new THREE.AmbientLight(0xd9e8f5, 1.4);
        this.scene.add(ambient);

        // Directional Key Light dengan shadow
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(6, 9, 7);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);

        // Fill Light di sisi kiri bawah
        const fillLight = new THREE.DirectionalLight(0x7090b0, 1.1);
        fillLight.position.set(-6, -2, -5);
        this.scene.add(fillLight);

        // Accent Point Light dinamis (disesuaikan dengan warna kategori perangkat)
        const accent1 = new THREE.PointLight(0x00d9ff, 2.0, 15);
        accent1.position.set(0, 3.2, 2.5);
        this.scene.add(accent1);
        this.accentLights.push(accent1);

        const accent2 = new THREE.PointLight(0x0d6efd, 1.5, 12);
        accent2.position.set(-3.5, 1.5, -2);
        this.scene.add(accent2);
        this.accentLights.push(accent2);
    }

    setupPedestal() {
        this.pedestalGroup = new THREE.Group();
        this.pedestalGroup.position.y = -1.15;

        // 1. Piringan silinder atas gelap
        const discGeo = new THREE.CylinderGeometry(2.35, 2.5, 0.15, 48);
        const discMat = new THREE.MeshStandardMaterial({
            color: 0x0a1626,
            roughness: 0.35,
            metalness: 0.8
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        discMesh.receiveShadow = true;
        this.pedestalGroup.add(discMesh);

        // 2. Cincin luar neon bercahaya
        const ringGeo = new THREE.RingGeometry(2.38, 2.48, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00d9ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.08;
        this.pedestalGroup.add(ringMesh);

        // 3. Grid holografik halus di atas disc
        const gridHelper = new THREE.GridHelper(4.2, 14, 0x00d9ff, 0x112d4e);
        gridHelper.position.y = 0.09;
        this.pedestalGroup.add(gridHelper);

        // 4. Cincin partikel dekoratif yang berputar
        const innerRingGeo = new THREE.RingGeometry(1.6, 1.66, 32);
        const innerRingMat = new THREE.MeshBasicMaterial({
            color: 0x00d9ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4
        });
        const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRingMesh.rotation.x = -Math.PI / 2;
        innerRingMesh.position.y = 0.095;
        this.pedestalGroup.add(innerRingMesh);
        this.pedestalInnerRing = innerRingMesh;

        this.scene.add(this.pedestalGroup);
    }

    bindEvents() {
        const dom = this.renderer.domElement;

        // --- Mouse Drag Events ---
        dom.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.prevPointerPos = { x: e.clientX, y: e.clientY };
            this.rotationVelocity = { x: 0, y: 0 };
            this.hideHint();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.prevPointerPos.x;
            const deltaY = e.clientY - this.prevPointerPos.y;

            this.rotationVelocity = {
                x: deltaY * 0.005,
                y: deltaX * 0.005
            };

            this.targetRotation.y += this.rotationVelocity.y;
            this.targetRotation.x += this.rotationVelocity.x;

            // Batasi sudut elevasi vertikal agar model tidak terbalik
            this.targetRotation.x = Math.max(-0.4, Math.min(1.1, this.targetRotation.x));

            this.prevPointerPos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // --- Touch Drag Events (Ponsel & Tablet) ---
        let initialPinchDist = null;

        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                this.rotationVelocity = { x: 0, y: 0 };
                this.hideHint();
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDist = Math.hypot(dx, dy);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - this.prevPointerPos.x;
                const deltaY = e.touches[0].clientY - this.prevPointerPos.y;

                this.rotationVelocity = {
                    x: deltaY * 0.006,
                    y: deltaX * 0.006
                };

                this.targetRotation.y += this.rotationVelocity.y;
                this.targetRotation.x += this.rotationVelocity.x;
                this.targetRotation.x = Math.max(-0.4, Math.min(1.1, this.targetRotation.x));

                this.prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2 && initialPinchDist) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const pinchDelta = (initialPinchDist - dist) * 0.012;
                this.zoom(pinchDelta);
                initialPinchDist = dist;
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            initialPinchDist = null;
        });

        // --- Mouse Wheel Zoom ---
        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.hideHint();
            const delta = e.deltaY * 0.0035;
            this.zoom(delta);
        }, { passive: false });

        // --- Toolbar Button Controls ---
        if (this.btnAutoRotate) {
            this.btnAutoRotate.addEventListener('click', () => {
                this.autoRotate = !this.autoRotate;
                this.btnAutoRotate.classList.toggle('active', this.autoRotate);
                soundManager.playClick();
            });
            this.btnAutoRotate.classList.toggle('active', this.autoRotate);
        }

        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                this.resetView();
                soundManager.playClick();
            });
        }

        if (this.btnWireframe) {
            this.btnWireframe.addEventListener('click', () => {
                this.toggleWireframe();
                soundManager.playClick();
            });
        }

        if (this.btnZoomIn) {
            this.btnZoomIn.addEventListener('click', () => {
                this.zoom(-0.7);
                soundManager.playClick();
            });
        }

        if (this.btnZoomOut) {
            this.btnZoomOut.addEventListener('click', () => {
                this.zoom(0.7);
                soundManager.playClick();
            });
        }

        // Window resize
        window.addEventListener('resize', () => {
            if (this.isRunning) this.resize();
        });
    }

    zoom(delta) {
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance + delta));
    }

    resetView() {
        this.targetRotation = { ...this.defaultRot };
        this.targetDistance = this.defaultDist;
        this.rotationVelocity = { x: 0, y: 0 };
    }

    toggleWireframe() {
        this.isWireframe = !this.isWireframe;
        if (this.btnWireframe) {
            this.btnWireframe.classList.toggle('active', this.isWireframe);
            const label = this.btnWireframe.querySelector('.hw-3d-tool-text');
            if (label) label.textContent = this.isWireframe ? 'Realistis' : 'Hologram';
        }

        if (!this.currentModelGroup) return;

        this.currentModelGroup.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        m.wireframe = this.isWireframe;
                    });
                } else {
                    child.material.wireframe = this.isWireframe;
                }
            }
        });
    }

    hideHint() {
        if (!this.hasInteracted && this.hintOverlayEl) {
            this.hasInteracted = true;
            this.hintOverlayEl.classList.add('fade-out');
            setTimeout(() => {
                if (this.hintOverlayEl) this.hintOverlayEl.style.display = 'none';
            }, 600);
        }
    }

    updateCameraPosition() {
        // Orbit camera around center target (0, 0, 0)
        const dist = this.currentDistance;
        const rx = this.currentRotation.x;
        const ry = this.currentRotation.y;

        const cy = Math.cos(rx) * dist;
        const y = Math.sin(rx) * dist;
        const x = Math.sin(ry) * cy;
        const z = Math.cos(ry) * cy;

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    resize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // =========================================================================
    // PEMBUATAN MODEL 3D SPESIFIKASI PERANGKAT KERAS LENGKAP
    // =========================================================================

    loadHardware(nodeId) {
        this.currentHardwareId = nodeId;
        this.animatedElements = [];

        // Buang model lama jika ada
        if (this.currentModelGroup) {
            this.scene.remove(this.currentModelGroup);
            this.disposeGroup(this.currentModelGroup);
            this.currentModelGroup = null;
        }

        // Tentukan model berdasarkan kategori
        let modelGroup = null;
        let badgeColor = 0x00d9ff;
        let badgeLabel = 'PERANGKAT 3D';

        if (nodeId === 'switch') {
            modelGroup = this.createSwitchModel();
            badgeColor = 0x00d9ff;
            badgeLabel = 'SWITCH GIGABIT 24-PORT SENTRAL';
            this.defaultDist = 6.0;
        } else if (nodeId.startsWith('pc')) {
            const pcNumber = nodeId.replace('pc', '');
            modelGroup = this.createWorkstationModel(nodeId, pcNumber);
            badgeColor = 0x0d6efd;
            badgeLabel = `WORKSTATION CLIENT PC-${pcNumber}`;
            this.defaultDist = 5.8;
        } else if (nodeId === 'router') {
            modelGroup = this.createRouterModel();
            badgeColor = 0xffc15e;
            badgeLabel = 'GATEWAY ROUTER BROADBAND';
            this.defaultDist = 5.4;
        } else if (nodeId === 'printer') {
            modelGroup = this.createPrinterModel();
            badgeColor = 0x00ff88;
            badgeLabel = 'SHARED NETWORK LASER PRINTER';
            this.defaultDist = 5.6;
        }

        if (modelGroup) {
            this.currentModelGroup = modelGroup;
            this.scene.add(modelGroup);

            // Perbarui warna aksen lampu
            if (this.accentLights[0]) {
                this.accentLights[0].color.setHex(badgeColor);
            }

            // Terapkan wireframe jika mode wireframe sedang aktif
            if (this.isWireframe) {
                modelGroup.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.wireframe = true;
                    }
                });
            }
        }

        if (this.badgeTextEl) {
            this.badgeTextEl.textContent = badgeLabel;
        }

        // Reset sudut dan jarak pandang optimal
        this.resetView();

        // Pastikan render loop aktif
        this.start();
        setTimeout(() => this.resize(), 60);
    }

    /**
     * MODEL 1: SWITCH JARINGAN SENTRAL GIGABIT
     * Dilengkapi 24 Port LAN RJ-45, LED aktivitas berkelip acak, rackmount ears, kabel UTP terpasang
     */
    createSwitchModel() {
        const group = new THREE.Group();
        group.name = "SwitchHardware";

        // Material Palette PBR
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x111c2a,
            metalness: 0.85,
            roughness: 0.28
        });
        const frontPanelMat = new THREE.MeshStandardMaterial({
            color: 0x0c131c,
            metalness: 0.9,
            roughness: 0.22
        });
        const rackEarMat = new THREE.MeshStandardMaterial({
            color: 0x22354a,
            metalness: 0.9,
            roughness: 0.25
        });
        const portMetalMat = new THREE.MeshStandardMaterial({
            color: 0x98a8ba,
            metalness: 0.8,
            roughness: 0.3
        });
        const portInnerMat = new THREE.MeshStandardMaterial({
            color: 0x070b10,
            metalness: 0.2,
            roughness: 0.8
        });
        const goldPinsMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            metalness: 0.9,
            roughness: 0.15
        });
        const brandBadgeMat = new THREE.MeshStandardMaterial({
            color: 0x00d9ff,
            emissive: 0x006680,
            metalness: 0.5,
            roughness: 0.2
        });

        // 1. Sasis Utama Switch (1U Rackmount Format)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.72, 2.4), chassisMat);
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        group.add(chassis);

        // 2. Plat Muka Depan (Front Bezel)
        const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(4.16, 0.68, 0.08), frontPanelMat);
        frontPanel.position.set(0, 0, 1.22);
        group.add(frontPanel);

        // 3. Kuping Rackmount Kiri & Kanan (Rack Ears)
        [-2.2, 2.2].forEach((x, idx) => {
            const ear = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.4), rackEarMat);
            ear.position.set(x, 0, 1.05);
            group.add(ear);

            // Lubang sekrup pada rack ear
            const screwHole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 16), portInnerMat);
            screwHole1.rotation.z = Math.PI / 2;
            screwHole1.position.set(x, 0.2, 1.15);
            group.add(screwHole1);

            const screwHole2 = screwHole1.clone();
            screwHole2.position.set(x, -0.2, 1.15);
            group.add(screwHole2);
        });

        // 4. Logo / Seri Switch Silkscreen
        const brandBadge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.02), brandBadgeMat);
        brandBadge.position.set(-1.45, 0.16, 1.27);
        group.add(brandBadge);

        // Power LED (Hijau Terang)
        const pwrLed = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x00ff66 })
        );
        pwrLed.position.set(-1.45, -0.12, 1.27);
        group.add(pwrLed);

        // 5. Array 24 Port RJ-45 (2 Baris x 12 Port)
        const portsGroup = new THREE.Group();
        portsGroup.position.set(0.2, 0, 1.25);
        const leds = [];

        const cols = 12;
        const portW = 0.22;
        const portH = 0.20;
        const gapX = 0.25;

        for (let row = 0; row < 2; row++) {
            const y = row === 0 ? 0.12 : -0.14;
            const ledY = row === 0 ? 0.24 : -0.25;

            for (let c = 0; c < cols; c++) {
                const x = (c - (cols - 1) / 2) * gapX;

                // Bingkai Port Logam
                const portFrame = new THREE.Mesh(new THREE.BoxGeometry(portW, portH, 0.12), portMetalMat);
                portFrame.position.set(x, y, 0);
                portsGroup.add(portFrame);

                // Rongga Dalam Port RJ-45
                const portHole = new THREE.Mesh(new THREE.BoxGeometry(portW - 0.05, portH - 0.05, 0.13), portInnerMat);
                portHole.position.set(x, y, 0.01);
                portsGroup.add(portHole);

                // Pin Tembaga Emas
                const goldPin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.08), goldPinsMat);
                goldPin.position.set(x, y + 0.04, 0.03);
                portsGroup.add(goldPin);

                // LED Status Aktivitas (Hijau / Amber yang berkedip)
                const isAmber = (c + row) % 5 === 0;
                const ledColor = isAmber ? 0xffb703 : 0x00ff88;
                const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
                const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), ledMat);
                ledMesh.position.set(x, ledY, 0.02);
                portsGroup.add(ledMesh);

                leds.push({
                    mesh: ledMesh,
                    baseColor: ledColor,
                    isOff: false,
                    phase: Math.random() * Math.PI * 2,
                    speed: 2 + Math.random() * 5
                });
            }
        }
        group.add(portsGroup);

        // Simpan LED untuk animasi kedip procedural di loop animasi
        this.animatedElements.push({
            type: 'switch-leds',
            leds: leds
        });

        // 6. Kabel UTP Biru Terpasang di Port 1 (Menunjukkan transmisi data fisik)
        const cableGroup = this.createPluggedCable(0x0d6efd);
        cableGroup.position.set(-1.18, 0.12, 1.28);
        group.add(cableGroup);

        // 7. Ventilasi Samping (Cooling Louvers)
        [-2.08, 2.08].forEach(x => {
            for (let v = -0.6; v <= 0.6; v += 0.2) {
                const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.2), portInnerMat);
                vent.position.set(x, v * 0.3, 0);
                group.add(vent);
            }
        });

        return group;
    }

    /**
     * Membuat kabel UTP Cat6 dengan konektor modular RJ-45 transparan yang tercolok
     */
    createPluggedCable(colorHex = 0x0d6efd) {
        const cableGroup = new THREE.Group();

        // Modular Jack RJ-45 Transparan
        const rjMat = new THREE.MeshStandardMaterial({
            color: 0xd6f0ff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.2,
            metalness: 0.1
        });
        const rjHead = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.35), rjMat);
        rjHead.position.z = 0.16;
        cableGroup.add(rjHead);

        // Boot Karet Pelindung Kabel (Rubber Snagless Boot)
        const bootMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.4
        });
        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.25, 16), bootMat);
        boot.rotation.x = Math.PI / 2;
        boot.position.z = 0.42;
        cableGroup.add(boot);

        // Kurva Kabel UTP melengkung ke bawah meja
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 0, 0.52),
            new THREE.Vector3(0, -0.3, 0.95),
            new THREE.Vector3(-0.4, -0.9, 1.3),
            new THREE.Vector3(-0.8, -1.2, 1.6)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.065, 12, false);
        const cableTube = new THREE.Mesh(tubeGeo, bootMat);
        cableGroup.add(cableTube);

        return cableGroup;
    }

    /**
     * MODEL 2: PC WORKSTATION CLIENT (PC01 - PC06)
     * Monitor Widescreen + Live Terminal GUI Topologi Star, Casing CPU Tower dengan kipas RGB berputar,
     * Keyboard mekanik, dan Mouse ergonomis.
     */
    createWorkstationModel(nodeId, pcNumber) {
        const group = new THREE.Group();
        group.name = `Workstation_${nodeId}`;

        // Material Palette
        const plasticMat = new THREE.MeshStandardMaterial({
            color: 0x131a24,
            metalness: 0.3,
            roughness: 0.4
        });
        const metalSilver = new THREE.MeshStandardMaterial({
            color: 0x90a2b4,
            metalness: 0.85,
            roughness: 0.2
        });
        const towerCaseMat = new THREE.MeshStandardMaterial({
            color: 0x0c1117,
            metalness: 0.6,
            roughness: 0.35
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x1a3350,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            metalness: 0.9
        });

        // 1. Meja Dudukan Minimalis
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e2c3c, roughness: 0.5 });
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 2.5), deskMat);
        deskTop.position.set(0, -0.9, 0);
        deskTop.receiveShadow = true;
        group.add(deskTop);

        // 2. MONITOR WIDESCREEN
        const monitorGroup = new THREE.Group();
        monitorGroup.position.set(-0.45, -0.15, 0);

        // Stand & Kaki Monitor
        const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.6), metalSilver);
        standBase.position.set(0, -0.72, 0);
        monitorGroup.add(standBase);

        const standPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), metalSilver);
        standPillar.position.set(0, -0.4, -0.12);
        monitorGroup.add(standPillar);

        // Frame Bezel Monitor
        const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.45, 0.1), plasticMat);
        bezel.castShadow = true;
        monitorGroup.add(bezel);

        // Screen Display dengan Kanvas Grafis Info Jaringan
        const screenTexture = this.createScreenTexture(pcNumber);
        const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 1.32), screenMat);
        screenMesh.position.set(0, 0, 0.056);
        monitorGroup.add(screenMesh);

        group.add(monitorGroup);

        // 3. TOWER CASING CPU (Di sisi kanan monitor)
        const towerGroup = new THREE.Group();
        towerGroup.position.set(1.4, -0.22, -0.1);

        // Sasis Utama Tower
        const towerChassis = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.5, 1.45), towerCaseMat);
        towerChassis.castShadow = true;
        towerGroup.add(towerChassis);

        // Kaca Samping Tempered Glass (Transparan)
        const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 1.35), glassMat);
        glassSide.position.set(-0.36, 0, 0);
        towerGroup.add(glassSide);

        // Kipas Pendingin RGB di dalam Casing
        const fanGroup = new THREE.Group();
        fanGroup.position.set(-0.15, 0.25, 0);

        const fanRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.24, 0.03, 16, 32),
            new THREE.MeshBasicMaterial({ color: 0x00d9ff })
        );
        fanGroup.add(fanRing);

        // Baling-baling kipas
        const bladeMat = new THREE.MeshBasicMaterial({ color: 0x0088cc, transparent: true, opacity: 0.8 });
        for (let b = 0; b < 5; b++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.01), bladeMat);
            blade.rotation.z = (b / 5) * Math.PI * 2;
            blade.position.set(Math.cos(blade.rotation.z) * 0.1, Math.sin(blade.rotation.z) * 0.1, 0);
            fanGroup.add(blade);
        }
        towerGroup.add(fanGroup);

        // Animasi rotasi kipas CPU di loop
        this.animatedElements.push({
            type: 'fan-spin',
            group: fanGroup,
            speed: 12.0
        });

        // Tombol Power LED di depan casing
        const pwrBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16),
            new THREE.MeshBasicMaterial({ color: 0x00d9ff })
        );
        pwrBtn.rotation.x = Math.PI / 2;
        pwrBtn.position.set(0, 0.62, 0.73);
        towerGroup.add(pwrBtn);

        // Kabel LAN UTP yang keluar dari belakang CPU menuju Switch
        const pcLanCable = this.createPluggedCable(0x0d6efd);
        pcLanCable.rotation.y = Math.PI;
        pcLanCable.position.set(0, 0.15, -0.73);
        towerGroup.add(pcLanCable);

        group.add(towerGroup);

        // 4. KEYBOARD MEKANIK
        const kbGroup = new THREE.Group();
        kbGroup.position.set(-0.45, -0.82, 0.65);

        const kbBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.55), plasticMat);
        kbGroup.add(kbBase);

        // Keycaps simulasi
        const keyMat = new THREE.MeshStandardMaterial({ color: 0x223348, roughness: 0.5 });
        const spaceBarMat = new THREE.MeshStandardMaterial({ color: 0x00d9ff, roughness: 0.3 });

        // Baris tombol
        const keyGrid = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.03, 0.44), keyMat);
        keyGrid.position.set(0, 0.03, -0.02);
        kbGroup.add(keyGrid);

        // Tombol Spasi Aksen Cyan
        const spacebar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.08), spaceBarMat);
        spacebar.position.set(-0.1, 0.035, 0.16);
        kbGroup.add(spacebar);

        group.add(kbGroup);

        // 5. MOUSE ERGONOMIS & MOUSEPAD
        const mouseGroup = new THREE.Group();
        mouseGroup.position.set(0.65, -0.82, 0.65);

        const mousepad = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.015, 0.65),
            new THREE.MeshStandardMaterial({ color: 0x0a121c, roughness: 0.8 })
        );
        mouseGroup.add(mousepad);

        const mouseBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.08, 0.3),
            plasticMat
        );
        mouseBody.position.set(0, 0.04, 0);
        mouseGroup.add(mouseBody);

        // Scroll Wheel Bercahaya Cyan
        const scrollWheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12),
            new THREE.MeshBasicMaterial({ color: 0x00d9ff })
        );
        scrollWheel.rotation.z = Math.PI / 2;
        scrollWheel.position.set(0, 0.08, -0.06);
        mouseGroup.add(scrollWheel);

        group.add(mouseGroup);

        return group;
    }

    /**
     * Membuat tekstur kanvas dinamis untuk layar monitor PC Workstation
     */
    createScreenTexture(pcNumber) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 288;
        const ctx = canvas.getContext('2d');

        // Background Desktop Cyber Navy
        ctx.fillStyle = '#061325';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid latar belakang
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Header Bar
        ctx.fillStyle = '#0b203d';
        ctx.fillRect(0, 0, canvas.width, 36);

        ctx.fillStyle = '#00d9ff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`TOPOLOGI STAR • CLIENT NODE PC-${pcNumber}`, 16, 24);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ONLINE [CONNECTED]', 360, 24);

        // Terminal Box Jaringan
        ctx.fillStyle = 'rgba(7, 17, 31, 0.85)';
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, 52, 472, 175);
        ctx.fillRect(20, 52, 472, 175);

        // Informasi Parameter Jaringan
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.fillText(`> HOSTNAME    : PC-CLIENT-0${pcNumber}`, 36, 78);
        ctx.fillText(`> IP ADDRESS  : 192.168.1.1${pcNumber} / 24`, 36, 102);
        ctx.fillText(`> MAC ADDRESS : 00:1A:2B:3C:4D:0${pcNumber}`, 36, 126);
        ctx.fillText(`> GATEWAY     : 192.168.1.1 (Router)`, 36, 150);
        ctx.fillText(`> CENTRAL SW  : PORT ${pcNumber} [GIGABIT 1000 Mbps FULL-DUPLEX]`, 36, 174);

        // Telemetri Status Aliran Data
        ctx.fillStyle = '#00d9ff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`[RX: 4.8 MB/s | TX: 3.2 MB/s | PACKET LOSS: 0.0% • ISOLATED LINK]`, 36, 204);

        // Taskbar Bawah
        ctx.fillStyle = '#09182d';
        ctx.fillRect(0, 248, canvas.width, 40);

        ctx.fillStyle = '#90a4ae';
        ctx.font = '11px sans-serif';
        ctx.fillText('⚡ NIC Gigabit Ethernet • Media: UTP Cat 6 RJ-45', 18, 272);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * MODEL 3: ROUTER GATEWAY BROADBAND
     * 4 Antena Artikulasi Eksternal, Indikator LED WAN/LAN/WiFi yang berkedip,
     * Port Internet WAN Kuning & Port LAN RJ-45 di belakang
     */
    createRouterModel() {
        const group = new THREE.Group();
        group.name = "RouterGateway";

        // Material Palette
        const routerBodyMat = new THREE.MeshStandardMaterial({
            color: 0x0f1b29,
            metalness: 0.75,
            roughness: 0.28
        });
        const glossStripeMat = new THREE.MeshStandardMaterial({
            color: 0x050a10,
            metalness: 0.95,
            roughness: 0.1
        });
        const antennaMat = new THREE.MeshStandardMaterial({
            color: 0x14202d,
            metalness: 0.8,
            roughness: 0.3
        });
        const goldRingMat = new THREE.MeshStandardMaterial({
            color: 0xffc15e,
            metalness: 0.9,
            roughness: 0.2
        });

        // 1. Badan Utama Router (Bentuk Beveled Aerodinamis Modern)
        const bodyGeo = new THREE.BoxGeometry(2.8, 0.45, 1.8);
        const body = new THREE.Mesh(bodyGeo, routerBodyMat);
        body.castShadow = true;
        group.add(body);

        // Plat glossy atas
        const glossStripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.6), glossStripeMat);
        glossStripe.position.set(0, 0.23, 0.2);
        group.add(glossStripe);

        // Logo Cyber Gateway
        const badge = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.03, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xffc15e, emissive: 0x774400, roughness: 0.2 })
        );
        badge.position.set(0, 0.24, -0.4);
        group.add(badge);

        // 2. LED Bar Indikator Status di Depan
        const leds = [];
        const ledNames = ['PWR', 'WAN', 'LAN1', 'LAN2', 'LAN3', 'LAN4', '2.4G', '5G', 'WPS'];
        const startX = -0.9;
        const gapX = 0.22;

        ledNames.forEach((name, i) => {
            const x = startX + i * gapX;
            let ledColor = 0x00ff88;
            if (name === 'WAN') ledColor = 0x00d9ff;
            if (name === 'WPS') ledColor = 0xffc15e;

            const led = new THREE.Mesh(
                new THREE.SphereGeometry(0.028, 10, 10),
                new THREE.MeshBasicMaterial({ color: ledColor })
            );
            led.position.set(x, 0.235, 0.35);
            group.add(led);

            leds.push({
                mesh: led,
                baseColor: ledColor,
                phase: i * 0.7,
                speed: 3 + (i % 3) * 2
            });
        });

        this.animatedElements.push({
            type: 'router-leds',
            leds: leds
        });

        // 3. 4 ANTENA EKSTERNAL BER-ARTIKULASI (2 Belakang, 2 Samping)
        const antennaConfigs = [
            { pos: [-1.1, 0.15, -0.85], rotZ: -0.25, rotX: 0.35 },
            { pos: [-0.4, 0.15, -0.85], rotZ: -0.1,  rotX: 0.4 },
            { pos: [0.4,  0.15, -0.85], rotZ: 0.1,   rotX: 0.4 },
            { pos: [1.1,  0.15, -0.85], rotZ: 0.25,  rotX: 0.35 }
        ];

        antennaConfigs.forEach(cfg => {
            const antGroup = new THREE.Group();
            antGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

            // Engsel dasar antena
            const hingeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16), antennaMat);
            antGroup.add(hingeBase);

            // Cincin emas aksen
            const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.016, 8, 24), goldRingMat);
            goldRing.rotation.x = Math.PI / 2;
            antGroup.add(goldRing);

            // Batang Antena Tipis Menjulang ke Atas
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 1.9, 16), antennaMat);
            stem.position.y = 0.95;
            stem.castShadow = true;
            antGroup.add(stem);

            antGroup.rotation.z = cfg.rotZ;
            antGroup.rotation.x = cfg.rotX;
            group.add(antGroup);
        });

        // 4. Port WAN Kuning & Port LAN di Bagian Belakang
        const wanPortMat = new THREE.MeshStandardMaterial({ color: 0xffb703, metalness: 0.5 });
        const lanPortMat = new THREE.MeshStandardMaterial({ color: 0x0a121c, metalness: 0.8 });

        // Port WAN (Internet)
        const wanPort = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.15), wanPortMat);
        wanPort.position.set(-0.7, 0, -0.88);
        group.add(wanPort);

        // 4 Port LAN
        for (let p = 0; p < 4; p++) {
            const lanPort = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.15), lanPortMat);
            lanPort.position.set(-0.3 + p * 0.28, 0, -0.88);
            group.add(lanPort);
        }

        // Kabel Kuning External WAN Terpasang
        const wanCable = this.createPluggedCable(0xffb703);
        wanCable.rotation.y = Math.PI;
        wanCable.position.set(-0.7, 0, -0.92);
        group.add(wanCable);

        return group;
    }

    /**
     * MODEL 4: SHARED NETWORK LASER PRINTER
     * Flatbed scanner kaca, Layar touchscreen LCD interaktif, baki kertas,
     * dokumen lembar hasil cetak, modul port network Ethernet di belakang
     */
    createPrinterModel() {
        const group = new THREE.Group();
        group.name = "NetworkPrinter";

        // Material Palette
        const printerBodyMat = new THREE.MeshStandardMaterial({
            color: 0xd4dee8,
            metalness: 0.25,
            roughness: 0.35
        });
        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x182432,
            metalness: 0.6,
            roughness: 0.3
        });
        const scannerGlassMat = new THREE.MeshStandardMaterial({
            color: 0x0f2a40,
            metalness: 0.85,
            roughness: 0.12,
            transparent: true,
            opacity: 0.75
        });
        const paperMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.05
        });

        // 1. Badan Utama Printer (Main Chassis)
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.25, 2.1), printerBodyMat);
        body.castShadow = true;
        body.position.y = -0.15;
        group.add(body);

        // 2. Unit Pemindai Atas (Flatbed Scanner Assembly)
        const scannerBase = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.2, 2.12), darkTrimMat);
        scannerBase.position.y = 0.52;
        group.add(scannerBase);

        // Kaca Flatbed Scanner
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.02, 1.5), scannerGlassMat);
        glass.position.set(-0.15, 0.62, 0);
        group.add(glass);

        // Tutup Scanner Atas (Lid)
        const lid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 2.1), printerBodyMat);
        lid.position.set(0, 0.7, 0);
        lid.castShadow = true;
        group.add(lid);

        // 3. Touchscreen Display Panel (Miring di Depan Kanan)
        const panelGroup = new THREE.Group();
        panelGroup.position.set(0.75, 0.58, 0.95);
        panelGroup.rotation.x = -Math.PI / 6; // Sudut miring 30 derajat

        const panelBezel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.06), darkTrimMat);
        panelGroup.add(panelBezel);

        // Layar LCD Status Printer
        const lcdTexture = this.createPrinterLcdTexture();
        const lcdMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.66, 0.42),
            new THREE.MeshBasicMaterial({ map: lcdTexture })
        );
        lcdMesh.position.z = 0.035;
        panelGroup.add(lcdMesh);
        group.add(panelGroup);

        // 4. Baki Masukan Kertas Bawah (Paper Cassette Drawer)
        const trayDrawer = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.1), darkTrimMat);
        trayDrawer.position.set(0, -0.62, 1.05);
        group.add(trayDrawer);

        // Jendela level kertas transparan
        const paperLevel = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.08, 0.02),
            new THREE.MeshBasicMaterial({ color: 0x00ff88 })
        );
        paperLevel.position.set(0.6, -0.62, 1.11);
        group.add(paperLevel);

        // 5. Rongga Keluaran Kertas & Lembaran Dokumen Tercetak
        const outCavity = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.26, 0.7), darkTrimMat);
        outCavity.position.set(-0.15, 0.18, 0.75);
        group.add(outCavity);

        // Kertas Hasil Uji Cetak Jaringan (Network Test Print Page)
        const printSheet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.012, 0.85), paperMat);
        printSheet.position.set(-0.15, 0.15, 0.88);
        printSheet.rotation.x = 0.08;
        group.add(printSheet);

        // Tulisan miniatur pada lembar uji cetak
        const docTexture = this.createTestPrintDocTexture();
        const docMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.15, 0.8),
            new THREE.MeshBasicMaterial({ map: docTexture })
        );
        docMesh.rotation.x = -Math.PI / 2;
        docMesh.position.set(-0.15, 0.165, 0.88);
        group.add(docMesh);

        // 6. Kartu Jaringan LAN (Ethernet NIC) di Bagian Belakang
        const nicPlate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.08), darkTrimMat);
        nicPlate.position.set(0.65, -0.25, -1.05);
        group.add(nicPlate);

        // Kabel LAN Hijau Tercolok ke Printer dari Switch
        const printerCable = this.createPluggedCable(0x00ff88);
        printerCable.rotation.y = Math.PI;
        printerCable.position.set(0.65, -0.25, -1.1);
        group.add(printerCable);

        return group;
    }

    /**
     * Tekstur LCD layar sentuh status Printer Jaringan
     */
    createPrinterLcdTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a1e36';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('STATUS: READY', 16, 26);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('IP: 192.168.1.50', 16, 52);
        ctx.fillText('PORT: 9100 RAW', 16, 74);
        ctx.fillText('QUEUE: 0 JOBS', 16, 96);

        ctx.fillStyle = '#00d9ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Ethernet Link 100M Full', 16, 126);

        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Tekstur dokumen uji cetak laporan topologi star yang keluar dari printer
     */
    createTestPrintDocTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#003366';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('ULM - LAB JARINGAN KOMPUTER', 14, 24);

        ctx.fillStyle = '#111111';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('HASIL TEST PRINT TOPOLOGI STAR', 14, 44);

        ctx.fillStyle = '#555555';
        ctx.font = '9px monospace';
        ctx.fillText('PENGIRIM : PC-04 (192.168.1.14)', 14, 68);
        ctx.fillText('TUJUAN   : SHARED PRINTER (192.168.1.50)', 14, 84);
        ctx.fillText('LEWAT    : SWITCH SENTRAL (PORT 4 -> 8)', 14, 100);
        ctx.fillText('STATUS   : DATA LINK VALID CRC OK', 14, 116);

        // Barcode simulasi
        ctx.fillStyle = '#000000';
        for (let i = 14; i < 240; i += 6) {
            const w = (i % 4 === 0) ? 3 : 1.5;
            ctx.fillRect(i, 134, w, 28);
        }

        return new THREE.CanvasTexture(canvas);
    }

    // =========================================================================
    // LOOP ANIMASI TAMPILAN 3D (RENDER LOOP)
    // =========================================================================

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.clock.start();
        this.animate = this.animate.bind(this);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.animationFrameId = requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // 1. Putar Otomatis (Auto-Rotate) jika tidak sedang ditarik kursor pengguna
        if (this.autoRotate && !this.isDragging) {
            this.targetRotation.y += this.autoRotateSpeed;
        }

        // 2. Inersia Lembut (Damping / Smooth Lerp) pada Sudut Rotasi & Zoom Jarak
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.12;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.12;
        this.currentDistance += (this.targetDistance - this.currentDistance) * 0.14;

        this.updateCameraPosition();

        // 3. Putar Cincin Partikel Pedestal di Bawah Model secara Halus
        if (this.pedestalInnerRing) {
            this.pedestalInnerRing.rotation.z -= delta * 0.25;
        }

        // 4. Update Animasi Prosedural Model (LED berkedip, Kipas berputar)
        this.animatedElements.forEach(item => {
            if (item.type === 'switch-leds' || item.type === 'router-leds') {
                item.leds.forEach(led => {
                    const flicker = Math.sin(elapsedTime * led.speed + led.phase);
                    if (flicker > 0.4) {
                        led.mesh.material.color.setHex(led.baseColor);
                    } else if (flicker > -0.2) {
                        led.mesh.material.color.setHex(0x004411);
                    } else {
                        led.mesh.material.color.setHex(0x05150a);
                    }
                });
            } else if (item.type === 'fan-spin') {
                item.group.rotation.z += delta * item.speed;
            }
        });

        // 5. Render Scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    disposeGroup(group) {
        if (!group) return;
        group.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}
