/**
 * High Performance Canvas Renderer for 128x128 Bytecode Arena (16K cells)
 * Features colony highlight mode for detailed strain inspection.
 */

import { CATEGORY_COLORS } from '../core/isa.js';

export class ArenaRenderer {
  constructor(canvas, arena, vm, strainRegistry) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.arena = arena;
    this.vm = vm;
    this.strainRegistry = strainRegistry;

    this.dim = 128;
    this.canvas.width = this.dim;
    this.canvas.height = this.dim;

    this.imageData = this.ctx.createImageData(this.dim, this.dim);
    this.buf32 = new Uint32Array(this.imageData.data.buffer);

    this.mode = 'strains';
    this.showProcessHeads = true;
    this.highlightedStrainId = 0; // Strain ID to highlight exclusively

    this.hoveredCell = null;
    this.selectedCell = null;

    this.initOpcodeColors();
  }

  setHighlightedStrain(strainId) {
    this.highlightedStrainId = strainId || 0;
  }

  initOpcodeColors() {
    this.opcode32 = new Uint32Array(32);
    const cats = {
      0: 'control', 1: 'memory', 2: 'memory', 3: 'memory', 4: 'life',
      5: 'memory', 6: 'memory', 7: 'alu', 8: 'alu', 9: 'alu',
      10: 'control', 11: 'life', 12: 'control', 13: 'life', 14: 'attack',
      15: 'alu', 16: 'alu', 17: 'alu', 18: 'alu', 19: 'memory',
      20: 'memory', 21: 'memory', 22: 'attack', 23: 'attack', 24: 'sensor',
      25: 'control', 26: 'control', 27: 'alu', 28: 'attack', 29: 'alu',
      30: 'alu', 31: 'life'
    };

    for (let op = 0; op < 32; op++) {
      const cat = cats[op] || 'control';
      const rgb = CATEGORY_COLORS[cat] || [100, 100, 100];
      this.opcode32[op] = (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  render() {
    const len = 16384;
    const buf = this.buf32;
    const mem = this.arena.memory;
    const strains = this.arena.strainMap;
    const reg = this.strainRegistry;
    const rH = this.arena.readHeat;
    const wH = this.arena.writeHeat;
    const eH = this.arena.execHeat;
    const highId = this.highlightedStrainId;

    const mode = this.mode;

    if (mode === 'strains') {
      for (let i = 0; i < len; i++) {
        const sId = strains[i];
        if (sId > 0) {
          const strain = reg.get(sId);
          if (strain) {
            if (highId > 0 && sId !== highId) {
              // Dim other strains to highlight selected colony
              const r = (strain.rgb[0] * 0.2) | 0;
              const g = (strain.rgb[1] * 0.2) | 0;
              const b = (strain.rgb[2] * 0.2) | 0;
              buf[i] = (255 << 24) | (b << 16) | (g << 8) | r;
            } else {
              const w = wH[i];
              if (w > 0.3) {
                buf[i] = 0xFFFFFFFF; // Bright flash on write
              } else {
                buf[i] = strain.pixel32;
              }
            }
          } else {
            buf[i] = 0xFF444444;
          }
        } else {
          const byte = mem[i];
          if (byte === 0) {
            buf[i] = 0xFF0c0b08;
          } else {
            buf[i] = 0xFF22201c;
          }
        }
      }
    } else if (mode === 'heatmap') {
      for (let i = 0; i < len; i++) {
        const r = rH[i];
        const w = wH[i];
        const e = eH[i];

        if (r === 0 && w === 0 && e === 0) {
          buf[i] = 0xFF050505;
          continue;
        }

        const red = Math.min(255, Math.floor(w * 255 + e * 180));
        const green = Math.min(255, Math.floor(r * 180 + w * 90 + e * 255));
        const blue = Math.min(255, Math.floor(r * 255 + w * 40 + e * 120));

        buf[i] = (255 << 24) | (blue << 16) | (green << 8) | red;
      }
    } else if (mode === 'opcodes') {
      for (let i = 0; i < len; i++) {
        const byte = mem[i];
        if (byte === 0) {
          buf[i] = 0xFF0c0b08;
        } else {
          buf[i] = this.opcode32[byte & 0x1F];
        }
      }
    }

    if (this.showProcessHeads) {
      const procs = this.vm.processes;
      const pCount = procs.length;
      for (let i = 0; i < pCount; i++) {
        const p = procs[i];
        if (!p.alive) continue;
        const ip = p.ip & 0x3FFF;
        if (highId > 0) {
          if (p.strainId === highId) {
            buf[ip] = 0xFFFFFFFF; // Bright white execution head for highlighted strain
          }
        } else {
          buf[ip] = 0xFFFFFFFF; // Bright white head
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);

    if (this.hoveredCell) {
      this.ctx.strokeStyle = '#00f0ff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(this.hoveredCell.x - 0.5, this.hoveredCell.y - 0.5, 2, 2);
    }
  }

  getCellFromCanvasCoords(canvasX, canvasY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.dim / rect.width;
    const scaleY = this.dim / rect.height;

    const x = Math.floor((canvasX - rect.left) * scaleX);
    const y = Math.floor((canvasY - rect.top) * scaleY);

    if (x >= 0 && x < 128 && y >= 0 && y < 128) {
      const addr = y * 128 + x;
      return { x, y, addr };
    }
    return null;
  }
}
