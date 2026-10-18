/**
 * js/simulation.js
 * Simulasi Alur Pengiriman Data 5 Tahap (Sumber -> Switch -> Tujuan)
 * Menegaskan prinsip Topologi Star: Komunikasi client wajib melewati perangkat pusat.
 */

import { soundManager } from './sound.js';

class DataSimulation {
    constructor() {
        this.selectSource = document.getElementById('select-source');
        this.selectTarget = document.getElementById('select-target');
        this.btnStartSim = document.getElementById('btn-start-sim');
        this.btnRepeatSim = document.getElementById('btn-repeat-sim');
        this.btnToQuiz = document.getElementById('btn-to-quiz');
        this.simError = document.getElementById('sim-error');
        this.simStageText = document.getElementById('sim-stage-text');
        this.simResult = document.getElementById('sim-result');
        this.svg = document.getElementById('sim-svg');

        this.isRunning = false;
        this.nodes = {
            switch: { x: 200, y: 150, label: "SWITCH" },
            pc01: { x: 80,  y: 60,  label: "PC 01" },
            pc02: { x: 320, y: 60,  label: "PC 02" },
            pc03: { x: 340, y: 150, label: "PC 03" },
            pc04: { x: 320, y: 240, label: "PC 04" },
            pc05: { x: 80,  y: 240, label: "PC 05" },
            pc06: { x: 60,  y: 150, label: "PC 06" }
        };

        this.init();
    }

    init() {
        this.renderSVGDiagram();
        this.bindEvents();
    }

    renderSVGDiagram() {
        if (!this.svg) return;
        this.svg.innerHTML = '';

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        `;
        this.svg.appendChild(defs);

        // 1. Gambar Garis Penghubung (Kabel)
        for (const [key, node] of Object.entries(this.nodes)) {
            if (key === 'switch') continue;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", this.nodes.switch.x);
            line.setAttribute("y1", this.nodes.switch.y);
            line.setAttribute("x2", node.x);
            line.setAttribute("y2", node.y);
            line.setAttribute("class", "sim-line");
            line.setAttribute("id", `line-${key}`);
            this.svg.appendChild(line);
        }

        // 2. Gambar Node Objek (Switch & PC)
        for (const [key, node] of Object.entries(this.nodes)) {
            const isSwitch = key === 'switch';
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("id", `node-${key}`);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const w = isSwitch ? 84 : 64;
            const h = isSwitch ? 44 : 32;
            rect.setAttribute("x", node.x - w / 2);
            rect.setAttribute("y", node.y - h / 2);
            rect.setAttribute("width", w);
            rect.setAttribute("height", h);
            rect.setAttribute("rx", isSwitch ? 8 : 6);
            rect.setAttribute("class", isSwitch ? "sim-node-box sim-node-switch" : "sim-node-box");

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", node.x);
            text.setAttribute("y", node.y + 4);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("class", "sim-node-label");
            text.textContent = node.label;

            g.appendChild(rect);
            g.appendChild(text);
            this.svg.appendChild(g);
        }

        // 3. Elemen Paket Data
        const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        packet.setAttribute("r", "8");
        packet.setAttribute("class", "sim-packet");
        packet.setAttribute("id", "sim-packet");
        this.svg.appendChild(packet);
    }

    bindEvents() {
        if (this.btnStartSim) {
            this.btnStartSim.addEventListener('click', () => this.runSimulation());
        }

        if (this.btnRepeatSim) {
            this.btnRepeatSim.addEventListener('click', () => {
                this.resetSimulation();
                this.runSimulation();
            });
        }

        if (this.btnToQuiz) {
            this.btnToQuiz.addEventListener('click', () => {
                window.location.href = 'kuis.html';
            });
        }

        [this.selectSource, this.selectTarget].forEach(el => {
            if (el) {
                el.addEventListener('change', () => {
                    this.simError.style.display = (this.selectSource.value === this.selectTarget.value) ? 'block' : 'none';
                });
            }
        });
    }

    async runSimulation() {
        if (this.isRunning) return;

        const srcKey = this.selectSource.value;
        const tgtKey = this.selectTarget.value;

        if (srcKey === tgtKey) {
            this.simError.style.display = 'block';
            return;
        }

        this.simError.style.display = 'none';
        this.isRunning = true;
        this.btnStartSim.disabled = true;
        this.selectSource.disabled = true;
        this.selectTarget.disabled = true;
        this.btnRepeatSim.style.display = 'none';
        this.btnToQuiz.style.display = 'none';
        this.simResult.classList.remove('show');

        const srcNode = this.nodes[srcKey];
        const swNode = this.nodes.switch;
        const tgtNode = this.nodes[tgtKey];

        const packet = document.getElementById('sim-packet');

        // TAHAP 1: Sumber Menyiapkan Data
        this.setStage(1, `<strong>${srcNode.label}</strong> membuat frame data dengan alamat tujuan <strong>${tgtNode.label}</strong>.`);
        this.highlightNode(srcKey, true);
        await this.wait(1400);

        // TAHAP 2: Paket Bergerak dari Sumber ke Switch
        this.setStage(2, `Paket data dikirim melalui kabel menuju perangkat pusat (<strong>SWITCH</strong>).`);
        soundManager.playPacketSend();
        await this.animatePacket(packet, srcNode, swNode, 1300);

        // TAHAP 3: Switch Memproses Data
        this.highlightNode('switch', true);
        this.setStage(3, `<strong>SWITCH</strong> menerima data, memeriksa MAC Address tujuan, dan menentukan port keluaran khusus ke <strong>${tgtNode.label}</strong>.`);
        soundManager.playSwitchProcess();
        await this.wait(1500);

        // TAHAP 4: Paket Bergerak dari Switch ke Tujuan
        this.setStage(4, `Data diforward HANYA ke port <strong>${tgtNode.label}</strong> (tidak dibroadcast ke PC lain).`);
        await this.animatePacket(packet, swNode, tgtNode, 1300);

        // TAHAP 5: Tujuan Menerima Data
        this.highlightNode(tgtKey, true);
        this.setStage(5, `<strong>${tgtNode.label}</strong> berhasil menerima paket data secara utuh.`);
        soundManager.playPacketReceive();
        await this.wait(1000);

        // Selesai
        this.simResult.innerHTML = `✅ <strong>Pengiriman Berhasil!</strong> Alur komunikasi terbukti selalu melalui <strong>SWITCH</strong> sebagai pusat jaringan star.`;
        this.simResult.classList.add('show');

        this.isRunning = false;
        this.btnStartSim.disabled = false;
        this.selectSource.disabled = false;
        this.selectTarget.disabled = false;
        this.btnRepeatSim.style.display = 'inline-flex';
        this.btnToQuiz.style.display = 'inline-flex';
    }

    setStage(num, text) {
        if (!this.simStageText) return;
        this.simStageText.innerHTML = `<span class="stage-num">TAHAP ${num}:</span> ${text}`;
    }

    highlightNode(key, active) {
        const g = document.getElementById(`node-${key}`);
        if (!g) return;
        const rect = g.querySelector('rect');
        const text = g.querySelector('text');

        if (active) {
            rect.classList.add('active');
            text.classList.add('active');
        } else {
            rect.classList.remove('active');
            text.classList.remove('active');
        }
    }

    animatePacket(packet, fromNode, toNode, duration) {
        return new Promise(resolve => {
            packet.style.opacity = '1';
            const startTime = performance.now();

            const step = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

                const curX = fromNode.x + (toNode.x - fromNode.x) * ease;
                const curY = fromNode.y + (toNode.y - fromNode.y) * ease;

                packet.setAttribute('cx', curX);
                packet.setAttribute('cy', curY);

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(step);
        });
    }

    resetSimulation() {
        for (const key of Object.keys(this.nodes)) {
            this.highlightNode(key, false);
        }
        const packet = document.getElementById('sim-packet');
        if (packet) packet.style.opacity = '0';
        this.simResult.classList.remove('show');
    }

    wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DataSimulation();
});
