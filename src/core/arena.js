/**
 * 128x128 Circular Memory Arena (16,384 bytes)
 * High-visibility memory buffer: pixels are 4x larger on screen for crystal-clear biological observation.
 */

export const ARENA_SIZE = 16384; // 128 x 128 (16K bytes)
export const ARENA_DIM = 128;
export const ARENA_MASK = 0x3FFF; // 16383

export class Arena {
  constructor() {
    this.memory = new Uint8Array(ARENA_SIZE);
    this.strainMap = new Uint16Array(ARENA_SIZE);
    
    // Heatmap layers for activity visualization (0.0 to 1.0)
    this.readHeat = new Float32Array(ARENA_SIZE);
    this.writeHeat = new Float32Array(ARENA_SIZE);
    this.execHeat = new Float32Array(ARENA_SIZE);

    this.totalWrites = 0;
    this.totalReads = 0;
    this.totalExecs = 0;
    this.totalMutations = 0;
  }

  clear() {
    this.memory.fill(0);
    this.strainMap.fill(0);
    this.readHeat.fill(0);
    this.writeHeat.fill(0);
    this.execHeat.fill(0);
    this.totalWrites = 0;
    this.totalReads = 0;
    this.totalExecs = 0;
    this.totalMutations = 0;
  }

  read(addr) {
    const a = addr & ARENA_MASK;
    this.readHeat[a] = 1.0;
    this.totalReads++;
    return this.memory[a];
  }

  write(addr, val, strainId, isMutation = false) {
    const a = addr & ARENA_MASK;
    this.memory[a] = val & 0xFF;
    this.strainMap[a] = strainId;
    this.writeHeat[a] = 1.0;
    this.totalWrites++;
    if (isMutation) {
      this.totalMutations++;
    }
  }

  touchExec(addr) {
    const a = addr & ARENA_MASK;
    this.execHeat[a] = 1.0;
    this.totalExecs++;
  }

  decay(rate = 0.90) {
    const len = ARENA_SIZE;
    const rH = this.readHeat;
    const wH = this.writeHeat;
    const eH = this.execHeat;

    for (let i = 0; i < len; i++) {
      if (rH[i] > 0.02) rH[i] *= rate; else if (rH[i] !== 0) rH[i] = 0;
      if (wH[i] > 0.02) wH[i] *= rate; else if (wH[i] !== 0) wH[i] = 0;
      if (eH[i] > 0.02) eH[i] *= rate; else if (eH[i] !== 0) eH[i] = 0;
    }
  }

  applyRadiation(count = 1) {
    for (let k = 0; k < count; k++) {
      const addr = Math.floor(Math.random() * ARENA_SIZE);
      const bit = 1 << Math.floor(Math.random() * 8);
      this.memory[addr] ^= bit;
      this.writeHeat[addr] = 0.8;
      this.totalMutations++;
    }
  }

  injectCode(startAddr, codeArray, strainId) {
    const base = startAddr & ARENA_MASK;
    for (let i = 0; i < codeArray.length; i++) {
      const addr = (base + i) & ARENA_MASK;
      this.memory[addr] = codeArray[i] & 0xFF;
      this.strainMap[addr] = strainId;
      this.writeHeat[addr] = 1.0;
    }
  }

  computeTerritories(strainRegistry) {
    for (const strain of strainRegistry.strains.values()) {
      strain.territoryCount = 0;
    }

    const map = this.strainMap;
    const len = ARENA_SIZE;
    for (let i = 0; i < len; i++) {
      const sId = map[i];
      if (sId > 0) {
        const strain = strainRegistry.get(sId);
        if (strain) {
          strain.territoryCount++;
        }
      }
    }
  }
}
