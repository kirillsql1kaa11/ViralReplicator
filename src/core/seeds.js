/**
 * Rich library of diverse viral strains with distinct ecological strategies:
 * - Local colonizers (Ancestor, Speed Demon)
 * - Nomadic ballistic spreaders (Nomad / Spore)
 * - Disruptive aggressors (Digital Cancer, Trapper)
 * - Parasitic hijackers (Parasite, Swarm)
 */

import {
  OP_GET_IP,
  OP_MOV_BX_AX,
  OP_SET_CX,
  OP_ALLOC_DX,
  OP_LOAD_AX_BX,
  OP_STORE_DX_AX,
  OP_DEC_CX,
  OP_JNZ_BACK,
  OP_SPAWN,
  OP_JMP_BACK,
  OP_ALLOC_FAR,
  OP_MINE_DX,
  OP_BOMB_DX,
  OP_INC_DX,
  OP_RAND_AX,
  OP_NOP
} from './isa.js';

export const SEEDS = {
  ancestor: {
    key: 'ancestor',
    name: 'Ancestor α',
    tag: '13 B',
    color: 'badge-green',
    strategy: 'Колонизатор',
    description: 'Классический саморепликатор. Создает плотные компактные колонии с высокой стабильностью.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = self IP (source pointer)
      OP_SET_CX, 13,    // 2, 3: CX = length (13 bytes)
      OP_ALLOC_DX,      // 4: DX = local child slot
      // Copy loop:
      OP_LOAD_AX_BX,    // 5: AX = mem[BX], BX++
      OP_STORE_DX_AX,   // 6: mem[DX] = AX, DX++
      OP_DEC_CX,        // 7: CX--
      OP_JNZ_BACK, 3,   // 8, 9: if CX > 0: jump back 3 to LOAD
      OP_SPAWN,         // 10: spawn child
      OP_JMP_BACK, 11   // 11, 12: jump back 11 to GET_IP
    ]
  },

  speedster: {
    key: 'speedster',
    name: 'Speed Demon',
    tag: '11 B',
    color: 'badge-cyan',
    strategy: 'Спринтер',
    description: 'Ультра-быстрый штамм с укороченным геномом. Опережает соперников по скорости размножения.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = self IP
      OP_SET_CX, 11,    // 2, 3: CX = 11 bytes
      OP_ALLOC_DX,      // 4: DX = child
      OP_LOAD_AX_BX,    // 5: read
      OP_STORE_DX_AX,   // 6: write
      OP_DEC_CX,        // 7: CX--
      OP_JNZ_BACK, 3,   // 8, 9: loop
      OP_SPAWN          // 10: spawn & run
    ]
  },

  nomad: {
    key: 'nomad',
    name: 'Nomad Spore',
    tag: '13 B',
    color: 'badge-amber',
    strategy: 'Кочевник',
    description: 'Выбрасывает споры на дальние дистанции (100–600 байт), колонизируя всю карту сразу.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = IP
      OP_SET_CX, 13,    // 2, 3: CX = 13 bytes
      OP_ALLOC_FAR,     // 4: DX = distant slot (ballistic spore)
      OP_LOAD_AX_BX,    // 5: read
      OP_STORE_DX_AX,   // 6: write
      OP_DEC_CX,        // 7: CX--
      OP_JNZ_BACK, 3,   // 8, 9: loop
      OP_SPAWN,         // 10: spawn distant child!
      OP_JMP_BACK, 11   // 11, 12: repeat
    ]
  },

  trapper: {
    key: 'trapper',
    name: 'Minefield',
    tag: '14 B',
    color: 'badge-red',
    strategy: 'Минер',
    description: 'Минирует память за собой летальными инструкциями DIE, убивающими конкурентов.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = IP
      OP_SET_CX, 14,    // 2, 3: length
      OP_ALLOC_DX,      // 4: allocate child
      OP_LOAD_AX_BX,    // 5: read
      OP_STORE_DX_AX,   // 6: write
      OP_DEC_CX,        // 7: CX--
      OP_JNZ_BACK, 3,   // 8, 9: loop
      OP_SPAWN,         // 10: spawn
      OP_MINE_DX,       // 11: plant lethal mine at trailing address!
      OP_JMP_BACK, 12   // 12, 13: repeat
    ]
  },

  bomber: {
    key: 'bomber',
    name: 'Digital Cancer',
    tag: '14 B',
    color: 'badge-magenta',
    strategy: 'Агрессор',
    description: 'Агрессивный штамм: размножается и одновременно бомбит память соседей случайным шумом.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = IP
      OP_SET_CX, 14,    // 2, 3: length
      OP_ALLOC_DX,      // 4: allocate child
      OP_LOAD_AX_BX,    // 5: read
      OP_STORE_DX_AX,   // 6: write
      OP_DEC_CX,        // 7: CX--
      OP_JNZ_BACK, 3,   // 8, 9: loop
      OP_SPAWN,         // 10: spawn child
      OP_BOMB_DX,       // 11: corrupt byte at DX
      OP_JMP_BACK, 12   // 12, 13: repeat
    ]
  },

  parasite: {
    key: 'parasite',
    name: 'Parasite',
    tag: '6 B',
    color: 'badge-purple',
    strategy: 'Паразит',
    description: 'Короткий вирус-хищник, перезаписывающий соседние организмы своим кодом.',
    code: [
      OP_GET_IP,        // 0
      OP_RAND_AX,       // 1: AX = random
      OP_STORE_DX_AX,   // 2: overwrite neighbor
      OP_INC_DX,        // 3
      OP_SPAWN,         // 4: try spawn
      OP_JMP_BACK, 5    // 5, 6: loop back
    ]
  },

  swarm: {
    key: 'swarm',
    name: 'Swarm Vector',
    tag: '12 B',
    color: 'badge-blue',
    strategy: 'Рой',
    description: 'Порождает направленные волны дочерних процессов, двигаясь широким фронтом.',
    code: [
      OP_GET_IP,        // 0: AX = IP
      OP_MOV_BX_AX,     // 1: BX = IP
      OP_SET_CX, 12,    // 2, 3: length 12
      OP_ALLOC_DX,      // 4: allocate
      OP_LOAD_AX_BX,    // 5: read
      OP_STORE_DX_AX,   // 6: write
      OP_DEC_CX,        // 7: loop
      OP_JNZ_BACK, 3,   // 8, 9
      OP_SPAWN,         // 10: spawn
      OP_INC_DX         // 11: advance
    ]
  },

  phalanx: {
    key: 'phalanx',
    name: 'Phalanx Shield',
    tag: '15 B',
    color: 'badge-emerald',
    strategy: 'Броненосец',
    description: 'Усиленный штамм с защитными блоками NOP, повышающими устойчивость к радиации.',
    code: [
      OP_NOP,           // 0: buffer zone
      OP_GET_IP,        // 1
      OP_MOV_BX_AX,     // 2
      OP_SET_CX, 15,    // 3, 4
      OP_ALLOC_DX,      // 5
      OP_LOAD_AX_BX,    // 6
      OP_STORE_DX_AX,   // 7
      OP_DEC_CX,        // 8
      OP_JNZ_BACK, 3,   // 9, 10
      OP_SPAWN,         // 11
      OP_NOP,           // 12: safety padding
      OP_JMP_BACK, 13   // 13, 14: repeat
    ]
  }
};
