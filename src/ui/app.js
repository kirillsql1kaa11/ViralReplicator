/**
 * Main Application Orchestrator
 * Fully decoupled high-performance animation loop, throttled UI updates, and robust click handling.
 */

import { Arena } from '../core/arena.js';
import { StrainRegistry } from '../core/strains.js';
import { VirtualMachine } from '../core/vm.js';
import { SEEDS } from '../core/seeds.js';
import { disassembleInstruction } from '../core/isa.js';
import { ArenaRenderer } from '../render/arena-renderer.js';
import { CyberAudioSynth } from '../audio/synth.js';
import { MediaExporter } from './recorder.js';

const ICONS = {
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`,
  pause: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`,
  soundOn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
  soundOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
  record: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
  recording: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"></circle></svg>`
};

class App {
  constructor() {
    this.arena = new Arena();
    this.strainRegistry = new StrainRegistry(255);
    this.vm = new VirtualMachine(this.arena, this.strainRegistry);
    this.synth = new CyberAudioSynth();

    this.canvas = document.getElementById('arena-canvas');
    this.renderer = new ArenaRenderer(this.canvas, this.arena, this.vm, this.strainRegistry);
    this.exporter = new MediaExporter(this.canvas, this.vm, this.strainRegistry);

    this.isRunning = true;
    this.speed = 10;
    this.lastTime = performance.now();
    this.lastStatsUpdate = 0;
    this.fps = 60;
    this.opsPerSec = 0;
    this.instructionsCounter = 0;

    this.history = [];
    this.maxHistory = 100;
    this.selectedSeedKey = 'ancestor';

    this.initDOM();
    this.bindEvents();
    this.seedInitialOrganism();

    // Initial render
    this.renderer.render();
    this.updateStats();

    requestAnimationFrame((t) => this.loop(t));
  }

  initDOM() {
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.btnStep = document.getElementById('btn-step');
    this.btnReset = document.getElementById('btn-reset');

    this.sliderSpeed = document.getElementById('slider-speed');
    this.labelSpeed = document.getElementById('val-speed');

    this.sliderMutation = document.getElementById('slider-mutation');
    this.labelMutation = document.getElementById('val-mutation');

    this.sliderPopulation = document.getElementById('slider-population');
    this.labelPopulation = document.getElementById('val-population');

    this.sliderRadiation = document.getElementById('slider-radiation');
    this.labelRadiation = document.getElementById('val-radiation');

    this.modeButtons = document.querySelectorAll('.mode-btn');

    this.statCycles = document.getElementById('stat-cycles');
    this.statPopulation = document.getElementById('stat-population');
    this.statStrains = document.getElementById('stat-strains');
    this.statGenerations = document.getElementById('stat-generations');
    this.statOps = document.getElementById('stat-ops');
    this.statFps = document.getElementById('stat-fps');

    this.hudCoords = document.getElementById('hud-coords');

    this.inspectorAddr = document.getElementById('inspect-addr');
    this.inspectorVal = document.getElementById('inspect-val');
    this.inspectorStrain = document.getElementById('inspect-strain');
    this.inspectorMnemonic = document.getElementById('inspect-mnemonic');
    this.inspectorDisasm = document.getElementById('inspect-disasm');

    this.leaderboardEl = document.getElementById('leaderboard-list');

    this.chartCanvas = document.getElementById('diversity-chart');
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;

    this.btnSound = document.getElementById('btn-sound');
    this.btnSnapshot = document.getElementById('btn-snapshot');
    this.btnRecord = document.getElementById('btn-record');

    // Strain Inspector Modal Elements
    this.strainModal = document.getElementById('strain-modal');
    this.modalBackdrop = document.getElementById('modal-backdrop');
    this.btnModalClose = document.getElementById('btn-modal-close');
    this.btnModalDismiss = document.getElementById('btn-modal-dismiss');
    this.btnModalHighlight = document.getElementById('btn-modal-highlight');
    this.modalHighlightLabel = document.getElementById('modal-highlight-label');
    this.btnModalInject = document.getElementById('btn-modal-inject');

    this.modalStrainBadge = document.getElementById('modal-strain-badge');
    this.modalStrainName = document.getElementById('modal-strain-name');
    this.modalStrainGen = document.getElementById('modal-strain-gen');
    this.modalStrainParent = document.getElementById('modal-strain-parent');

    this.modalStatPop = document.getElementById('modal-stat-pop');
    this.modalStatPopPct = document.getElementById('modal-stat-pop-pct');
    this.modalStatTerr = document.getElementById('modal-stat-terr');
    this.modalStatTerrPct = document.getElementById('modal-stat-terr-pct');
    this.modalStatSpawned = document.getElementById('modal-stat-spawned');
    this.modalStatMuts = document.getElementById('modal-stat-muts');
    this.modalStatMutsSub = document.getElementById('modal-stat-muts-sub');

    this.modalMutCountBadge = document.getElementById('modal-mut-count-badge');
    this.modalMutationsList = document.getElementById('modal-mutations-list');
    this.modalGenomeLen = document.getElementById('modal-genome-len');
    this.modalGenomeView = document.getElementById('modal-genome-view');

    this.currentInspectedStrainId = null;
    this.vm.maxProcesses = parseInt(this.sliderPopulation.value, 10) || 4000;
  }

  seedInitialOrganism(x = 64, y = 64) {
    const seed = SEEDS[this.selectedSeedKey] || SEEDS.ancestor;
    const startAddr = (y * 128 + x) & 0x3FFF;
    const ancestor = this.strainRegistry.initAncestor(seed.code);
    this.arena.injectCode(startAddr, seed.code, ancestor.id);
    this.vm.spawnProcess(ancestor.id, startAddr, 1);
  }

  injectSeedAt(addr, seedKey = this.selectedSeedKey) {
    const seed = SEEDS[seedKey] || SEEDS.ancestor;
    const strain = this.strainRegistry.registerStrain(1, this.vm.maxGenerationEver + 1, seed.code);
    this.arena.injectCode(addr, seed.code, strain.id);
    this.vm.spawnProcess(strain.id, addr, this.vm.maxGenerationEver + 1);
    this.synth.playMutationChime();

    this.renderer.render();
    this.updateStats();
  }

  bindEvents() {
    this.btnPlayPause.addEventListener('click', () => {
      this.synth.init();
      this.isRunning = !this.isRunning;
      this.btnPlayPause.innerHTML = this.isRunning
        ? `${ICONS.pause}<span>Пауза</span>`
        : `${ICONS.play}<span>Старт</span>`;
      this.btnPlayPause.classList.toggle('active', this.isRunning);
    });

    this.btnStep.addEventListener('click', () => {
      this.synth.init();
      this.isRunning = false;
      this.btnPlayPause.innerHTML = `${ICONS.play}<span>Старт</span>`;
      this.btnPlayPause.classList.remove('active');
      this.vm.step(1);
      this.renderer.render();
      this.updateStats();
    });

    this.btnReset.addEventListener('click', () => {
      this.renderer.setHighlightedStrain(0);
      this.closeStrainModal();
      this.arena.clear();
      this.strainRegistry.reset();
      this.vm.reset();
      this.seedInitialOrganism();
      this.history = [];
      this.renderer.render();
      this.updateStats();
    });

    this.sliderSpeed.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value, 10);
      this.labelSpeed.textContent = `${this.speed}×`;
    });

    this.sliderMutation.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.vm.mutationRate = val / 100;
      this.labelMutation.textContent = `${val.toFixed(1)}%`;
    });

    this.sliderPopulation.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.vm.maxProcesses = val;
      this.labelPopulation.textContent = val.toLocaleString();
    });

    this.sliderRadiation.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.vm.radiationRate = val / 1000;
      this.labelRadiation.textContent = `${val}`;
    });

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        this.renderer.setMode(mode);
        this.renderer.render();
      });
    });

    document.querySelectorAll('.preset-card, .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-card, .preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSeedKey = btn.dataset.seed;
      });
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const cell = this.renderer.getCellFromCanvasCoords(e.clientX, e.clientY);
      if (cell) {
        this.renderer.hoveredCell = cell;
        this.inspectCell(cell.addr, cell.x, cell.y);
      } else {
        this.renderer.hoveredCell = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.hoveredCell = null;
      if (this.hudCoords) {
        this.hudCoords.textContent = '16 384 BYTES (0x0000 - 0x3FFF)';
      }
    });

    this.canvas.addEventListener('click', (e) => {
      this.synth.init();
      const cell = this.renderer.getCellFromCanvasCoords(e.clientX, e.clientY);
      if (cell) {
        this.injectSeedAt(cell.addr);
      }
    });

    this.btnSound.addEventListener('click', () => {
      this.synth.init();
      const on = this.synth.toggle();
      this.btnSound.classList.toggle('active', on);
      this.btnSound.innerHTML = on ? `${ICONS.soundOn}<span>Звук</span>` : `${ICONS.soundOff}<span>Звук</span>`;
    });

    this.btnSnapshot.addEventListener('click', () => {
      this.exporter.exportSnapshot();
    });

    this.btnRecord.addEventListener('click', () => {
      if (!this.exporter.isRecording) {
        this.exporter.startRecording(6, (status) => {
          if (status === 'recording') {
            this.btnRecord.classList.add('recording');
            this.btnRecord.innerHTML = `${ICONS.recording}<span>Запись...</span>`;
          } else {
            this.btnRecord.classList.remove('recording');
            this.btnRecord.innerHTML = `${ICONS.record}<span>Клип</span>`;
          }
        });
      }
    });

    // Strain modal close & backdrop
    if (this.btnModalClose) {
      this.btnModalClose.addEventListener('click', () => this.closeStrainModal());
    }
    if (this.btnModalDismiss) {
      this.btnModalDismiss.addEventListener('click', () => this.closeStrainModal());
    }
    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', () => this.closeStrainModal());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.strainModal && !this.strainModal.classList.contains('hidden')) {
        this.closeStrainModal();
      }
    });

    // Strain modal actions
    if (this.btnModalHighlight) {
      this.btnModalHighlight.addEventListener('click', () => this.toggleHighlightCurrentStrain());
    }
    if (this.btnModalInject) {
      this.btnModalInject.addEventListener('click', () => this.injectCurrentStrain());
    }

    // Leaderboard item click delegation to inspect strain
    if (this.leaderboardEl) {
      this.leaderboardEl.addEventListener('click', (e) => {
        const item = e.target.closest('.leader-item');
        if (item && item.dataset.strainId) {
          const strainId = parseInt(item.dataset.strainId, 10);
          this.openStrainModal(strainId);
        }
      });
    }
  }

  inspectCell(addr, x, y) {
    const byte = this.arena.memory[addr];
    const strainId = this.arena.strainMap[addr];
    const disasm = disassembleInstruction(this.arena.memory, addr);

    if (this.hudCoords) {
      this.hudCoords.textContent = `ADDR: 0x${addr.toString(16).padStart(4, '0').toUpperCase()} • X:${x} Y:${y} • ${disasm.mnemonic}`;
    }

    this.inspectorAddr.textContent = `0x${addr.toString(16).padStart(4, '0').toUpperCase()} (${addr})`;
    this.inspectorVal.textContent = `0x${byte.toString(16).padStart(2, '0').toUpperCase()} [${byte}]`;

    if (strainId > 0) {
      const strain = this.strainRegistry.get(strainId);
      const name = strain ? strain.name : `Штамм #${strainId}`;
      const color = strain ? `hsl(${strain.hue}, 100%, 65%)` : '#fff';
      this.inspectorStrain.innerHTML = `<span class="strain-dot" style="background:${color}"></span> ${name}`;
    } else {
      this.inspectorStrain.innerHTML = '<span class="strain-dot empty"></span> Свободно';
    }

    this.inspectorMnemonic.textContent = disasm.mnemonic;

    let disasmHtml = '';
    const startWindow = (addr - 3 + 16384) & 0x3FFF;
    for (let i = 0; i < 7; i++) {
      const a = (startWindow + i) & 0x3FFF;
      const d = disassembleInstruction(this.arena.memory, a);
      const isCurrent = (a === addr);
      disasmHtml += `<div class="disasm-line ${isCurrent ? 'active' : ''}">
        <span class="d-addr">0x${a.toString(16).padStart(4, '0').toUpperCase()}</span>
        <span class="d-byte">${this.arena.memory[a].toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="d-mnem">${d.mnemonic}</span>
      </div>`;
    }
    this.inspectorDisasm.innerHTML = disasmHtml;
  }

  loop(currentTime) {
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (dt > 0) {
      this.fps = Math.round(1000 / dt);
    }

    if (this.isRunning) {
      const startInst = this.vm.totalInstructions;
      this.vm.step(this.speed);
      const executed = this.vm.totalInstructions - startInst;
      this.instructionsCounter += executed;

      if (this.vm.recentMutationsThisFrame > 0) {
        this.synth.playMutationChime();
      }
      if (this.speed <= 50 && executed > 0 && Math.random() < 0.2) {
        this.synth.playWriteClick();
      }
    }

    this.arena.decay(0.90);

    // Throttle heavy DOM updates to 4 times per second (every 250ms)
    if (currentTime - this.lastStatsUpdate > 250) {
      this.lastStatsUpdate = currentTime;
      this.arena.computeTerritories(this.strainRegistry);
      this.updateLeaderboard();
      this.recordHistory();
      this.renderChart();
      this.updateStats();
    }

    this.renderer.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  updateStats() {
    this.statCycles.textContent = this.vm.cycleCount.toLocaleString();
    this.statPopulation.textContent = this.vm.processes.length.toLocaleString();
    this.statStrains.textContent = this.strainRegistry.totalStrainsCreated.toLocaleString();
    this.statGenerations.textContent = this.vm.maxGenerationEver.toLocaleString();

    this.opsPerSec = Math.round(this.speed * this.vm.processes.length * (this.fps || 60));
    this.statOps.textContent = this.opsPerSec.toLocaleString();
    this.statFps.textContent = this.fps;
  }

  updateLeaderboard() {
    const popCounts = new Map();
    const procs = this.vm.processes;
    const pLen = procs.length;
    for (let i = 0; i < pLen; i++) {
      if (procs[i].alive) {
        const sId = procs[i].strainId;
        popCounts.set(sId, (popCounts.get(sId) || 0) + 1);
      }
    }

    for (const [sId, count] of popCounts.entries()) {
      const s = this.strainRegistry.get(sId);
      if (s) s.activeProcesses = count;
    }

    const top = this.strainRegistry.getDominantStrains(5);
    let html = '';
    const totalPop = this.vm.processes.length || 1;

    for (const s of top) {
      const popCount = s.activeProcesses || 0;
      const popPct = ((popCount / totalPop) * 100).toFixed(1);
      const territoryPct = ((s.territoryCount / 16384) * 100).toFixed(1);
      const color = `hsl(${s.hue}, 100%, 65%)`;

      html += `
        <div class="leader-item" data-strain-id="${s.id}" title="Кликните для генетического паспорта и анализа мутаций">
          <div class="leader-swatch" style="background:${color}; box-shadow: 0 0 5px ${color}"></div>
          <div class="leader-info">
            <div class="leader-title">
              <span class="leader-name">${s.name}</span>
              <span class="leader-gen">Gen ${s.generation}</span>
            </div>
            <div class="leader-bar-wrap">
              <div class="leader-bar" style="width:${Math.max(4, popPct)}%; background:${color}"></div>
            </div>
            <div class="leader-sub">
              <span>${popCount.toLocaleString()} особ. (${popPct}%)</span>
              <span>${s.territoryCount.toLocaleString()} B (${territoryPct}%)</span>
            </div>
          </div>
        </div>
      `;
    }

    if (top.length === 0) {
      html = '<div class="leader-empty">Нет активных штаммов</div>';
    }

    this.leaderboardEl.innerHTML = html;

    if (this.currentInspectedStrainId) {
      this.updateModalLiveStats();
    }
  }

  recordHistory() {
    this.history.push({
      population: this.vm.processes.length,
      strains: this.strainRegistry.totalStrainsCreated
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  renderChart() {
    if (!this.chartCtx) return;
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;

    ctx.clearRect(0, 0, w, h);
    if (this.history.length < 2) return;

    let maxP = this.vm.maxProcesses || 1600;
    for (const pt of this.history) {
      if (pt.population > maxP) maxP = pt.population;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.01)');

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < this.history.length; i++) {
      const x = (i / (this.maxHistory - 1)) * w;
      const y = h - (this.history[i].population / maxP) * (h - 4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < this.history.length; i++) {
      const x = (i / (this.maxHistory - 1)) * w;
      const y = h - (this.history[i].population / maxP) * (h - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  openStrainModal(strainId) {
    const s = this.strainRegistry.get(strainId);
    if (!s) return;

    this.currentInspectedStrainId = strainId;
    const color = `hsl(${s.hue}, 100%, 65%)`;

    // Header info
    if (this.modalStrainBadge) {
      this.modalStrainBadge.style.background = color;
      this.modalStrainBadge.style.boxShadow = `0 0 12px ${color}`;
    }
    if (this.modalStrainName) {
      this.modalStrainName.textContent = s.name;
    }
    if (this.modalStrainGen) {
      this.modalStrainGen.textContent = `Gen ${s.generation}`;
    }
    if (this.modalStrainParent) {
      this.modalStrainParent.textContent = s.parentId
        ? `Предок: ${s.parentName} (ID #${s.parentId})`
        : 'Предок: Первопредок (Нулевая линия)';
    }

    // Live Metrics
    this.updateModalLiveStats(s);

    // Mutations breakdown
    const muts = s.mutations || [];
    if (this.modalMutCountBadge) {
      this.modalMutCountBadge.textContent = muts.length === 0
        ? 'Без мутаций'
        : `${muts.length} ${this.declension(muts.length, ['мутация', 'мутации', 'мутаций'])}`;
    }
    if (this.modalStatMuts) {
      this.modalStatMuts.textContent = muts.length;
    }
    if (this.modalStatMutsSub) {
      this.modalStatMutsSub.textContent = muts.length === 0 ? 'исходный геном' : 'от предка';
    }

    if (this.modalMutationsList) {
      if (muts.length === 0) {
        this.modalMutationsList.innerHTML = `
          <div class="mut-empty">
            <div style="font-weight: 500; color: var(--text-primary)">Исходная неизменённая линия предка.</div>
            <div style="margin-top: 5px; color: var(--accent-green)">Все гены в точности повторяют первоначальный архетип.</div>
          </div>
        `;
      } else {
        let mutHtml = '';
        for (const m of muts) {
          mutHtml += `
            <div class="mutation-card">
              <div class="mut-top">
                <span class="mut-pos-tag">СМЕЩЕНИЕ +${m.pos}</span>
                <div class="mut-diff-row">
                  <span class="mut-old">${m.parentMnem || '0x' + (m.parentByte || 0).toString(16)}</span>
                  <span class="mut-arrow">→</span>
                  <span class="mut-new">${m.childMnem || '0x' + (m.childByte || 0).toString(16)}</span>
                </div>
              </div>
              <div class="mut-desc">${m.impactDesc || 'Точечная мутация в репликационном цикле'}</div>
            </div>
          `;
        }
        this.modalMutationsList.innerHTML = mutHtml;
      }
    }

    // Disassembled Genome
    const code = s.codeSnippet && s.codeSnippet.length ? s.codeSnippet : [];
    if (this.modalGenomeLen) {
      this.modalGenomeLen.textContent = `${code.length} байт`;
    }

    if (this.modalGenomeView) {
      const mutPosSet = new Set(muts.map(m => m.pos));
      let genomeHtml = '';

      for (let i = 0; i < code.length; i++) {
        const b = code[i];
        const dis = disassembleInstruction(code, i);
        const isMut = mutPosSet.has(i);

        genomeHtml += `
          <div class="genome-row ${isMut ? 'mutated' : ''}">
            <span class="g-offset">+${i.toString().padStart(2, '0')}</span>
            <span class="g-hex">${b.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span class="g-mnem">${dis.mnemonic}</span>
            ${isMut ? '<span class="g-tag">МУТАЦИЯ</span>' : '<span style="color:var(--text-dim)">' + (dis.desc || '') + '</span>'}
          </div>
        `;

        if (dis.bytes === 2) {
          i++;
          if (i < code.length) {
            const imm = code[i];
            const isImmMut = mutPosSet.has(i);
            genomeHtml += `
              <div class="genome-row ${isImmMut ? 'mutated' : ''}" style="opacity: 0.75">
                <span class="g-offset">+${i.toString().padStart(2, '0')}</span>
                <span class="g-hex">${imm.toString(16).padStart(2, '0').toUpperCase()}</span>
                <span class="g-mnem" style="color:var(--text-dim)">imm8: ${imm}</span>
                ${isImmMut ? '<span class="g-tag">МУТАЦИЯ</span>' : ''}
              </div>
            `;
          }
        }
      }

      if (code.length === 0) {
        genomeHtml = '<div class="mut-empty">Код генома сохраняется при первой репликации...</div>';
      }

      this.modalGenomeView.innerHTML = genomeHtml;
    }

    // Highlight button state
    const isHighlighting = (this.renderer.highlightedStrainId === strainId);
    if (this.btnModalHighlight) {
      this.btnModalHighlight.classList.toggle('highlighting', isHighlighting);
    }
    if (this.modalHighlightLabel) {
      this.modalHighlightLabel.textContent = isHighlighting ? 'Колония подсвечена' : 'Подсветить колонию';
    }

    // Show modal
    if (this.strainModal) {
      this.strainModal.classList.remove('hidden');
      this.strainModal.setAttribute('aria-hidden', 'false');
    }
  }

  closeStrainModal() {
    if (this.strainModal) {
      this.strainModal.classList.add('hidden');
      this.strainModal.setAttribute('aria-hidden', 'true');
    }
  }

  updateModalLiveStats(strain) {
    const s = strain || (this.currentInspectedStrainId ? this.strainRegistry.get(this.currentInspectedStrainId) : null);
    if (!s) return;

    const totalPop = this.vm.processes.length || 1;
    const popPct = ((s.activeProcesses / totalPop) * 100).toFixed(1);
    const terrPct = ((s.territoryCount / 16384) * 100).toFixed(1);

    if (this.modalStatPop) this.modalStatPop.textContent = s.activeProcesses.toLocaleString();
    if (this.modalStatPopPct) this.modalStatPopPct.textContent = `${popPct}%`;

    if (this.modalStatTerr) this.modalStatTerr.textContent = `${s.territoryCount.toLocaleString()} B`;
    if (this.modalStatTerrPct) this.modalStatTerrPct.textContent = `${terrPct}%`;

    if (this.modalStatSpawned) this.modalStatSpawned.textContent = (s.totalSpawned || s.activeProcesses).toLocaleString();
  }

  toggleHighlightCurrentStrain() {
    if (!this.currentInspectedStrainId) return;
    const sId = this.currentInspectedStrainId;

    if (this.renderer.highlightedStrainId === sId) {
      this.renderer.setHighlightedStrain(0);
      if (this.btnModalHighlight) this.btnModalHighlight.classList.remove('highlighting');
      if (this.modalHighlightLabel) this.modalHighlightLabel.textContent = 'Подсветить колонию';
    } else {
      this.renderer.setHighlightedStrain(sId);
      if (this.btnModalHighlight) this.btnModalHighlight.classList.add('highlighting');
      if (this.modalHighlightLabel) this.modalHighlightLabel.textContent = 'Колония подсвечена';
    }
    this.renderer.render();
  }

  injectCurrentStrain() {
    if (!this.currentInspectedStrainId) return;
    const s = this.strainRegistry.get(this.currentInspectedStrainId);
    if (!s) return;

    const code = (s.codeSnippet && s.codeSnippet.length) ? s.codeSnippet : (SEEDS[this.selectedSeedKey] || SEEDS.ancestor).code;
    const addr = Math.floor(Math.random() * 16384);

    this.arena.injectCode(addr, code, s.id);
    this.vm.spawnProcess(s.id, addr, s.generation);
    this.synth.playMutationChime();

    this.renderer.render();
    this.updateStats();

    // Button feedback
    if (this.btnModalInject) {
      const span = this.btnModalInject.querySelector('span');
      if (span) {
        const oldText = span.textContent;
        span.textContent = 'Внедрено в память!';
        setTimeout(() => {
          span.textContent = oldText;
        }, 900);
      }
    }
  }

  declension(n, forms) {
    const pr = Math.abs(n) % 100;
    const r = pr % 10;
    if (pr > 10 && pr < 20) return forms[2];
    if (r > 1 && r < 5) return forms[1];
    if (r === 1) return forms[0];
    return forms[2];
  }
}

// Guaranteed boot loader regardless of document loading phase
function bootApp() {
  if (!window.app) {
    window.app = new App();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
