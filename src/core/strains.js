/**
 * Strain Registry & Phylogenetic Lineage
 * Tracks mutations, genetic code sequences, and genealogical divergence.
 */

import { disassembleInstruction } from './isa.js';

function hslToRgb(h, s, l) {
  h = h % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((g + m) * 255)
  ];
}

export class StrainRegistry {
  constructor(maxStrains = 255) {
    this.maxStrains = maxStrains;
    this.strains = new Map();
    this.nextSlot = 2;
    this.totalStrainsCreated = 1;
    this.initAncestor();
  }

  reset() {
    this.strains.clear();
    this.nextSlot = 2;
    this.totalStrainsCreated = 1;
    return this.initAncestor();
  }

  initAncestor(codeSnippet = []) {
    const rgb = [0, 255, 136];
    const pixel32 = (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];

    const ancestor = {
      id: 1,
      name: 'Ancestor α',
      parentId: null,
      parentName: 'Первопредок',
      generation: 1,
      hue: 145,
      rgb,
      pixel32,
      activeProcesses: 1,
      totalSpawned: 1,
      territoryCount: 0,
      codeSnippet: Array.from(codeSnippet),
      mutations: []
    };

    this.strains.set(1, ancestor);
    return ancestor;
  }

  registerStrain(parentId, generation, codeSnippet = []) {
    this.totalStrainsCreated++;
    const parent = this.strains.get(parentId);

    let hue = 145;
    if (parent) {
      const drift = (Math.random() < 0.25)
        ? (Math.random() * 120 + 60) * (Math.random() < 0.5 ? 1 : -1)
        : (Math.random() * 40 - 20);
      hue = (parent.hue + drift + 360) % 360;
    } else {
      hue = Math.floor(Math.random() * 360);
    }

    const rgb = hslToRgb(hue, 0.95, 0.52);
    const pixel32 = (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];

    // Compute detailed mutations compared to parent genome
    const mutations = [];
    const code = Array.from(codeSnippet);
    if (parent && parent.codeSnippet && parent.codeSnippet.length) {
      const pCode = parent.codeSnippet;
      const maxLen = Math.max(code.length, pCode.length);
      for (let i = 0; i < maxLen; i++) {
        const pByte = pCode[i];
        const cByte = code[i];
        if (pByte !== cByte) {
          const pDis = pByte !== undefined ? disassembleInstruction([pByte], 0) : { mnemonic: '—', category: 'none', desc: '' };
          const cDis = cByte !== undefined ? disassembleInstruction([cByte], 0) : { mnemonic: '—', category: 'none', desc: '' };
          
          let impactDesc = 'Точечная замена байта';
          if (pByte !== undefined && cByte !== undefined) {
            const pOp = pByte & 0x1F;
            const cOp = cByte & 0x1F;
            if (pOp !== cOp) {
              if (cOp === 0x0D) impactDesc = 'Смена репликации: дальние споры ALLOC_FAR';
              else if (cOp === 0x0E) impactDesc = 'Агрессия: установка смертельных мин MINE';
              else if (cOp === 0x16) impactDesc = 'Атака: бомбардировка чужой памяти BOMB';
              else if (cOp === 0x17) impactDesc = 'Зачистка: обнуление чужих ячеек KILL';
              else if (cOp === 0x18) impactDesc = 'Сенсор: поиск чужих организмов SCAN';
              else if (cOp === 0x1F) impactDesc = 'Летальная ошибка: самоуничтожение DIE';
              else if (cOp === 0x0B) impactDesc = 'Деление: внеплановое рождение SPAWN';
              else if (pDis.category !== cDis.category) impactDesc = `Смена типа: [${pDis.category}] → [${cDis.category}]`;
              else impactDesc = `Модификация опкода: ${pDis.mnemonic} → ${cDis.mnemonic}`;
            } else {
              impactDesc = `Изменение аргумента/смещения: ${pByte} → ${cByte}`;
            }
          }

          mutations.push({
            pos: i,
            parentByte: pByte,
            childByte: cByte,
            parentMnem: pDis.mnemonic,
            childMnem: cDis.mnemonic,
            parentCat: pDis.category,
            childCat: cDis.category,
            impactDesc,
            diff: `${pDis.mnemonic} → ${cDis.mnemonic}`
          });
        }
      }
    }

    // Find target slot within bounded 255 pool
    let slotId = null;
    if (this.nextSlot <= this.maxStrains) {
      slotId = this.nextSlot++;
    } else {
      for (const [id, s] of this.strains.entries()) {
        if (id !== 1 && s.activeProcesses === 0 && s.territoryCount === 0) {
          slotId = id;
          break;
        }
      }
      if (slotId === null) {
        let minPop = Infinity;
        let minId = 2;
        for (const [id, s] of this.strains.entries()) {
          if (id !== 1 && s.activeProcesses < minPop) {
            minPop = s.activeProcesses;
            minId = id;
          }
        }
        slotId = minId;
      }
    }

    const strain = {
      id: slotId,
      name: `Мутант #${this.totalStrainsCreated}`,
      parentId: parent ? parent.id : null,
      parentName: parent ? parent.name : 'Неизвестно',
      generation,
      hue,
      rgb,
      pixel32,
      activeProcesses: 1,
      totalSpawned: 1,
      territoryCount: 0,
      codeSnippet: code,
      mutations
    };

    this.strains.set(slotId, strain);
    return strain;
  }

  get(strainId) {
    return this.strains.get(strainId);
  }

  getDominantStrains(limit = 6) {
    const active = [];
    for (const s of this.strains.values()) {
      if (s.activeProcesses > 0 || s.territoryCount > 0) {
        active.push(s);
      }
    }

    active.sort((a, b) => {
      if (b.activeProcesses !== a.activeProcesses) {
        return b.activeProcesses - a.activeProcesses;
      }
      return b.territoryCount - a.territoryCount;
    });

    return active.slice(0, limit);
  }
}
