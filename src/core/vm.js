/**
 * High-performance Virtual Machine execution engine for 16K Bytecode Arena (128x128).
 * Supports up to 16,384 concurrent processes (1:1 with memory cells) with O(1) tournament reaper.
 */

import {
  OP_NOP,
  OP_GET_IP,
  OP_MOV_BX_AX,
  OP_SET_CX,
  OP_ALLOC_DX,
  OP_LOAD_AX_BX,
  OP_STORE_DX_AX,
  OP_INC_BX,
  OP_INC_DX,
  OP_DEC_CX,
  OP_JNZ_BACK,
  OP_SPAWN,
  OP_JMP_BACK,
  OP_ALLOC_FAR,
  OP_MINE_DX,
  OP_ZERO_AX,
  OP_INC_AX,
  OP_DEC_AX,
  OP_SHL_AX,
  OP_MOV_DX_AX,
  OP_MOV_AX_BX,
  OP_SWAP_BX_DX,
  OP_BOMB_DX,
  OP_KILL_DX,
  OP_SCAN_ALIEN,
  OP_JZ_FORWARD,
  OP_JNZ_FORWARD,
  OP_RAND_AX,
  OP_MUTATE_MEM,
  OP_ADD_AX_BX,
  OP_SUB_AX_BX,
  OP_DIE
} from './isa.js';

const MASK = 0x3FFF; // 16,383 (16K Arena)

export class Process {
  constructor(pid, strainId, ip, generation = 1) {
    this.pid = pid;
    this.strainId = strainId;
    this.ip = ip & MASK;
    this.startIp = this.ip;
    this.ax = 0;
    this.bx = 0;
    this.cx = 0;
    this.dx = 0;
    this.childAddr = 0;
    this.energy = 850;
    this.generation = generation;
    this.age = 0;
    this.childrenSpawned = 0;
    this.alive = true;
  }
}

export class VirtualMachine {
  constructor(arena, strainRegistry) {
    this.arena = arena;
    this.strainRegistry = strainRegistry;
    this.processes = [];
    this.nextPid = 1;

    // Configurable parameters
    this.mutationRate = 0.01;
    this.radiationRate = 0;
    this.maxProcesses = 4000; // Cap scalable up to 16,384
    this.energyPerSpawn = 420;
    this.energyPerWrite = 3;

    this.cycleCount = 0;
    this.totalInstructions = 0;
    this.maxGenerationEver = 1;
    this.recentMutationsThisFrame = 0;
    this.recentSpawnsThisFrame = 0;
  }

  reset() {
    this.processes = [];
    this.nextPid = 1;
    this.cycleCount = 0;
    this.totalInstructions = 0;
    this.maxGenerationEver = 1;
    this.recentMutationsThisFrame = 0;
    this.recentSpawnsThisFrame = 0;
  }

  spawnProcess(strainId, ip, generation = 1) {
    if (this.processes.length >= this.maxProcesses) {
      // O(1) 4-candidate tournament selection to cull lowest energy organism
      const len = this.processes.length;
      let minIdx = Math.floor(Math.random() * len);
      let minEnergy = this.processes[minIdx].energy;

      for (let t = 0; t < 3; t++) {
        const r = Math.floor(Math.random() * len);
        if (this.processes[r].energy < minEnergy) {
          minEnergy = this.processes[r].energy;
          minIdx = r;
        }
      }

      const deadProc = this.processes[minIdx];
      const deadStrain = this.strainRegistry.get(deadProc.strainId);
      if (deadStrain) {
        deadStrain.activeProcesses = Math.max(0, deadStrain.activeProcesses - 1);
      }

      const p = new Process(this.nextPid++, strainId, ip, generation);
      this.processes[minIdx] = p;

      if (generation > this.maxGenerationEver) {
        this.maxGenerationEver = generation;
      }

      const strain = this.strainRegistry.get(strainId);
      if (strain) {
        strain.activeProcesses++;
        strain.totalSpawned++;
      }

      return p;
    }

    const p = new Process(this.nextPid++, strainId, ip, generation);
    this.processes.push(p);

    if (generation > this.maxGenerationEver) {
      this.maxGenerationEver = generation;
    }

    const strain = this.strainRegistry.get(strainId);
    if (strain) {
      strain.activeProcesses++;
      strain.totalSpawned++;
    }

    return p;
  }

  step(numCycles = 1) {
    this.recentMutationsThisFrame = 0;
    this.recentSpawnsThisFrame = 0;

    const mem = this.arena.memory;

    for (let c = 0; c < numCycles; c++) {
      const procCount = this.processes.length;
      if (procCount === 0) break;
      this.cycleCount++;

      if (this.radiationRate > 0 && Math.random() < this.radiationRate) {
        this.arena.applyRadiation(1);
      }

      for (let i = 0; i < procCount; i++) {
        const p = this.processes[i];
        if (!p.alive) continue;

        p.energy--;
        p.age++;
        this.totalInstructions++;

        if (p.energy <= 0) {
          p.alive = false;
          const strain = this.strainRegistry.get(p.strainId);
          if (strain) strain.activeProcesses = Math.max(0, strain.activeProcesses - 1);
          continue;
        }

        const ip = p.ip;
        this.arena.touchExec(ip);
        const opcode = mem[ip] & 0x1F;

        switch (opcode) {
          case OP_NOP:
            p.ip = (ip + 1) & MASK;
            break;

          case OP_GET_IP:
            p.ax = ip;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_MOV_BX_AX:
            p.bx = p.ax;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_SET_CX:
            p.cx = mem[(ip + 1) & MASK];
            p.ip = (ip + 2) & MASK;
            break;

          case OP_ALLOC_DX: {
            const spacing = 16 + Math.floor(Math.random() * 24);
            p.dx = (p.startIp + spacing) & MASK;
            p.childAddr = p.dx;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_ALLOC_FAR: {
            const dist = 120 + Math.floor(Math.random() * 540);
            p.dx = (p.startIp + dist) & MASK;
            p.childAddr = p.dx;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_LOAD_AX_BX:
            p.ax = this.arena.read(p.bx);
            p.bx = (p.bx + 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_STORE_DX_AX: {
            let val = p.ax & 0xFF;
            let isMut = false;

            if (this.mutationRate > 0 && Math.random() < this.mutationRate) {
              isMut = true;
              this.recentMutationsThisFrame++;
              if (Math.random() < 0.65) {
                val = Math.floor(Math.random() * 32);
              } else {
                val = (val ^ (1 << Math.floor(Math.random() * 8))) & 0xFF;
              }
            }

            this.arena.write(p.dx, val, p.strainId, isMut);
            p.dx = (p.dx + 1) & MASK;
            p.energy += this.energyPerWrite;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_MINE_DX: {
            this.arena.write(p.dx, OP_DIE, p.strainId, false);
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_INC_BX:
            p.bx = (p.bx + 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_INC_DX:
            p.dx = (p.dx + 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_DEC_CX:
            p.cx = (p.cx - 1) & 0xFFFF;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_JNZ_BACK: {
            const offset = mem[(ip + 1) & MASK];
            if (p.cx > 0) {
              p.ip = (ip - offset) & MASK;
            } else {
              p.ip = (ip + 2) & MASK;
            }
            break;
          }

          case OP_SPAWN: {
            const childIp = p.childAddr & MASK;
            let childStrainId = p.strainId;

            const sampleLen = Math.min(20, Math.max(8, p.cx || 13));
            let isMutant = false;
            const childCode = [];

            for (let k = 0; k < sampleLen; k++) {
              const pByte = mem[(p.startIp + k) & MASK];
              const cByte = mem[(childIp + k) & MASK];
              childCode.push(cByte);
              if (pByte !== cByte) {
                isMutant = true;
              }
            }

            if (isMutant) {
              const newStrain = this.strainRegistry.registerStrain(p.strainId, p.generation + 1, childCode);
              childStrainId = newStrain.id;
            }

            this.spawnProcess(childStrainId, childIp, p.generation + 1);
            p.childrenSpawned++;
            p.energy += this.energyPerSpawn;
            this.recentSpawnsThisFrame++;

            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_JMP_BACK: {
            const offset = mem[(ip + 1) & MASK];
            p.ip = (ip - offset) & MASK;
            break;
          }

          case OP_ADD_AX_BX:
            p.ax = (p.ax + p.bx) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_SUB_AX_BX:
            p.ax = (p.ax - p.bx) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_ZERO_AX:
            p.ax = 0;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_INC_AX:
            p.ax = (p.ax + 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_DEC_AX:
            p.ax = (p.ax - 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_SHL_AX:
            p.ax = (p.ax << 1) & MASK;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_MOV_DX_AX:
            p.dx = p.ax;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_MOV_AX_BX:
            p.ax = p.bx;
            p.ip = (ip + 1) & MASK;
            break;

          case OP_SWAP_BX_DX: {
            const tmp = p.bx;
            p.bx = p.dx;
            p.dx = tmp;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_BOMB_DX: {
            const bombVal = Math.floor(Math.random() * 256);
            this.arena.write(p.dx, bombVal, p.strainId, true);
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_KILL_DX:
            this.arena.write(p.dx, 0, 0);
            p.ip = (ip + 1) & MASK;
            break;

          case OP_SCAN_ALIEN: {
            let found = 0;
            for (let s = 1; s <= 8; s++) {
              const checkAddr = (ip + s) & MASK;
              const owner = this.arena.strainMap[checkAddr];
              if (owner !== 0 && owner !== p.strainId) {
                found = checkAddr;
                break;
              }
            }
            p.ax = found;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_JZ_FORWARD: {
            const offset = mem[(ip + 1) & MASK];
            if (p.ax === 0) p.ip = (ip + offset) & MASK;
            else p.ip = (ip + 2) & MASK;
            break;
          }

          case OP_JNZ_FORWARD: {
            const offset = mem[(ip + 1) & MASK];
            if (p.ax !== 0) p.ip = (ip + offset) & MASK;
            else p.ip = (ip + 2) & MASK;
            break;
          }

          case OP_RAND_AX:
            p.ax = Math.floor(Math.random() * 256);
            p.ip = (ip + 1) & MASK;
            break;

          case OP_MUTATE_MEM: {
            const bit = 1 << Math.floor(Math.random() * 8);
            mem[p.dx] ^= bit;
            this.arena.writeHeat[p.dx] = 1.0;
            p.ip = (ip + 1) & MASK;
            break;
          }

          case OP_DIE:
            p.alive = false;
            break;

          default:
            p.ip = (ip + 1) & MASK;
            break;
        }
      }

      if (this.cycleCount % 50 === 0) {
        let writeIdx = 0;
        const pLen = this.processes.length;
        for (let i = 0; i < pLen; i++) {
          if (this.processes[i].alive) {
            this.processes[writeIdx++] = this.processes[i];
          }
        }
        this.processes.length = writeIdx;
      }
    }
  }
}
