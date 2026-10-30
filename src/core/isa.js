/**
 * Core War / Tierra Bytecode Instruction Set Architecture (ISA)
 * 32 Opcodes designed for diverse evolutionary strategies.
 */

export const OP_NOP         = 0x00; // No-op
export const OP_GET_IP      = 0x01; // AX = IP
export const OP_MOV_BX_AX   = 0x02; // BX = AX (Source pointer)
export const OP_SET_CX      = 0x03; // CX = imm8 (Length/counter)
export const OP_ALLOC_DX    = 0x04; // DX = allocate nearby child slot (Local colony)
export const OP_LOAD_AX_BX  = 0x05; // AX = mem[BX], BX++
export const OP_STORE_DX_AX = 0x06; // mem[DX] = AX, DX++ (Replication mutation)
export const OP_INC_BX      = 0x07; // BX++
export const OP_INC_DX      = 0x08; // DX++
export const OP_DEC_CX      = 0x09; // CX--
export const OP_JNZ_BACK    = 0x0A; // if CX > 0: IP -= imm8; else IP += 2
export const OP_SPAWN       = 0x0B; // Spawn child organism at allocated child address
export const OP_JMP_BACK    = 0x0C; // IP -= imm8
export const OP_ALLOC_FAR   = 0x0D; // DX = allocate far spore slot (Nomad jump)
export const OP_MINE_DX     = 0x0E; // mem[DX] = OP_DIE (Lethal trap for rivals)
export const OP_ZERO_AX     = 0x0F; // AX = 0
export const OP_INC_AX      = 0x10; // AX++
export const OP_DEC_AX      = 0x11; // AX--
export const OP_SHL_AX      = 0x12; // AX = (AX << 1) & 0x3FFF
export const OP_MOV_DX_AX   = 0x13; // DX = AX
export const OP_MOV_AX_BX   = 0x14; // AX = BX
export const OP_SWAP_BX_DX  = 0x15; // swap(BX, DX)
export const OP_BOMB_DX     = 0x16; // mem[DX] = random byte (Aggressor attack)
export const OP_KILL_DX     = 0x17; // mem[DX] = 0 (Zero out byte)
export const OP_SCAN_ALIEN  = 0x18; // Scan nearby memory for alien strain
export const OP_JZ_FORWARD  = 0x19; // if AX == 0: IP += imm8
export const OP_JNZ_FORWARD = 0x1A; // if AX != 0: IP += imm8
export const OP_RAND_AX     = 0x1B; // AX = rand(0..255)
export const OP_MUTATE_MEM  = 0x1C; // Bit flip at mem[DX]
export const OP_ADD_AX_BX   = 0x1D; // AX = (AX + BX) & 0x3FFF
export const OP_SUB_AX_BX   = 0x1E; // AX = (AX - BX) & 0x3FFF
export const OP_DIE         = 0x1F; // Terminate process immediately

// Aliases for compatibility
export const OP_SHARE_ENERGY= 0x1D;
export const OP_SLEEP       = 0x1E;

export const INSTRUCTIONS = {
  [OP_NOP]:         { name: 'NOP',         args: 0, category: 'control', desc: 'No operation' },
  [OP_GET_IP]:      { name: 'GET_IP',      args: 0, category: 'memory',  desc: 'AX = current IP' },
  [OP_MOV_BX_AX]:   { name: 'MOV BX, AX',  args: 0, category: 'memory',  desc: 'BX = AX (source ptr)' },
  [OP_SET_CX]:      { name: 'SET CX, imm', args: 1, category: 'memory',  desc: 'CX = imm8' },
  [OP_ALLOC_DX]:    { name: 'ALLOC DX',    args: 0, category: 'life',    desc: 'DX = local child slot' },
  [OP_LOAD_AX_BX]:  { name: 'LOAD [BX]',   args: 0, category: 'memory',  desc: 'AX = mem[BX], BX++' },
  [OP_STORE_DX_AX]: { name: 'STORE [DX]',  args: 0, category: 'memory',  desc: 'mem[DX] = AX, DX++' },
  [OP_INC_BX]:      { name: 'INC BX',      args: 0, category: 'alu',     desc: 'BX++' },
  [OP_INC_DX]:      { name: 'INC DX',      args: 0, category: 'alu',     desc: 'DX++' },
  [OP_DEC_CX]:      { name: 'DEC CX',      args: 0, category: 'alu',     desc: 'CX--' },
  [OP_JNZ_BACK]:    { name: 'JNZ_B offset',args: 1, category: 'control', desc: 'if CX>0: IP -= off' },
  [OP_SPAWN]:       { name: 'SPAWN',       args: 0, category: 'life',    desc: 'Fork child process' },
  [OP_JMP_BACK]:    { name: 'JMP_B offset',args: 1, category: 'control', desc: 'IP -= off' },
  [OP_ALLOC_FAR]:   { name: 'ALLOC_FAR DX',args: 0, category: 'life',    desc: 'DX = distant spore slot' },
  [OP_MINE_DX]:     { name: 'MINE [DX]',   args: 0, category: 'attack',  desc: 'Place lethal trap' },
  [OP_ZERO_AX]:     { name: 'ZERO AX',     args: 0, category: 'alu',     desc: 'AX = 0' },
  [OP_INC_AX]:      { name: 'INC AX',      args: 0, category: 'alu',     desc: 'AX++' },
  [OP_DEC_AX]:      { name: 'DEC AX',      args: 0, category: 'alu',     desc: 'AX--' },
  [OP_SHL_AX]:      { name: 'SHL AX',      args: 0, category: 'alu',     desc: 'AX <<= 1' },
  [OP_MOV_DX_AX]:   { name: 'MOV DX, AX',  args: 0, category: 'memory',  desc: 'DX = AX (dest ptr)' },
  [OP_MOV_AX_BX]:   { name: 'MOV AX, BX',  args: 0, category: 'memory',  desc: 'AX = BX' },
  [OP_SWAP_BX_DX]:  { name: 'SWAP BX, DX', args: 0, category: 'memory',  desc: 'swap(BX, DX)' },
  [OP_BOMB_DX]:     { name: 'BOMB [DX]',   args: 0, category: 'attack',  desc: 'mem[DX] = random' },
  [OP_KILL_DX]:     { name: 'KILL [DX]',   args: 0, category: 'attack',  desc: 'mem[DX] = 0' },
  [OP_SCAN_ALIEN]:  { name: 'SCAN_ALIEN',  args: 0, category: 'sensor',  desc: 'Find nearby rivals' },
  [OP_JZ_FORWARD]:  { name: 'JZ_F offset', args: 1, category: 'control', desc: 'if AX==0: IP += off' },
  [OP_JNZ_FORWARD]: { name: 'JNZ_F offset',args: 1, category: 'control', desc: 'if AX!=0: IP += off' },
  [OP_RAND_AX]:     { name: 'RAND AX',     args: 0, category: 'alu',     desc: 'AX = rand(0..255)' },
  [OP_MUTATE_MEM]:  { name: 'MUTATE [DX]', args: 0, category: 'attack',  desc: 'Flip bit at mem[DX]' },
  [OP_ADD_AX_BX]:   { name: 'ADD AX, BX',  args: 0, category: 'alu',     desc: 'AX += BX' },
  [OP_SUB_AX_BX]:   { name: 'SUB AX, BX',  args: 0, category: 'alu',     desc: 'AX -= BX' },
  [OP_DIE]:         { name: 'DIE',         args: 0, category: 'life',    desc: 'Terminate process' },
};

export const CATEGORY_COLORS = {
  control: [180, 80, 255],   // Violet / Purple
  memory:  [0, 180, 255],     // Electric Blue
  life:    [0, 255, 130],     // Bio-Green
  alu:     [255, 190, 0],     // Golden Amber
  attack:  [255, 50, 90],     // Crimson Red
  sensor:  [0, 240, 240],     // Cyan
};

export function disassembleInstruction(memory, addr) {
  const byte = memory[addr & 0x3FFF];
  const opcode = byte & 0x1F;
  const def = INSTRUCTIONS[opcode];

  if (!def) {
    return {
      mnemonic: `RAW 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
      bytes: 1,
      category: 'control',
      desc: 'Raw bytecode'
    };
  }

  if (def.args === 1) {
    const arg = memory[(addr + 1) & 0x3FFF];
    return {
      mnemonic: `${def.name.replace('imm', arg).replace('offset', arg)}`,
      bytes: 2,
      category: def.category,
      desc: def.desc
    };
  }

  return {
    mnemonic: def.name,
    bytes: 1,
    category: def.category,
    desc: def.desc
  };
}
