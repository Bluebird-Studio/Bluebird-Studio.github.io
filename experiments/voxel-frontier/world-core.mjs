/**
 * Deterministic, renderer-independent voxel world.
 * Block centers occupy integer coordinates. A block occupies [c-.5, c+.5].
 * Keep this module free of Three.js/DOM dependencies so it can be unit tested.
 */
export const WORLD_RADIUS = 13;
export const MAX_HEIGHT = 32;
export const CHUNK_SIZE = 8;
export const BLOCK_TYPES = Object.freeze(['grass', 'stone', 'wood']);
export const blockKey = (x, y, z) => `${x},${y},${z}`;
export const chunkIndex = coordinate => Math.floor(coordinate / CHUNK_SIZE);
export const chunkKey = (x, z) => `${chunkIndex(x)},${chunkIndex(z)}`;

export function groundHeight(x, z) {
  return Math.max(0, Math.floor(2.1 + Math.sin(x / 3.5) * 1.2 + Math.cos(z / 4.1) * 1.3));
}

export class VoxelWorld {
  constructor({ radius = WORLD_RADIUS, edits = {}, onChange = null } = {}) {
    this.radius = radius;
    this.blocks = new Map();
    this.edits = {};
    this.onChange = onChange;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const height = groundHeight(x, z);
        for (let y = -1; y <= height; y++) {
          this.blocks.set(blockKey(x, y, z), y === height ? 'grass' : 'stone');
        }
      }
    }
    for (let x = -radius + 3; x < radius - 3; x += 6) {
      for (let z = -radius + 3; z < radius - 3; z += 7) {
        const h = groundHeight(x, z);
        this.blocks.set(blockKey(x, h + 1, z), 'wood');
        this.blocks.set(blockKey(x, h + 2, z), 'wood');
      }
    }
    if (edits && typeof edits === 'object' && !Array.isArray(edits)) {
      for (const [id, kind] of Object.entries(edits).slice(0, 10000)) {
        const match = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(id);
        if (!match) continue;
        const [x, y, z] = match.slice(1).map(Number);
        if (!this.inBounds(x, y, z) || y === -1) continue;
        if (kind !== null && !BLOCK_TYPES.includes(kind)) continue;
        if (kind === null) this.blocks.delete(id);
        else this.blocks.set(id, kind);
        this.edits[id] = kind;
      }
    }
  }

  inBounds(x, y, z) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z)
      && Math.abs(x) <= this.radius && Math.abs(z) <= this.radius
      && y >= -1 && y <= MAX_HEIGHT;
  }

  get(x, y, z) {
    return this.blocks.get(blockKey(x, y, z)) ?? null;
  }

  solid(x, y, z) {
    return this.blocks.has(blockKey(x, y, z));
  }

  set(x, y, z, kind) {
    if (!this.inBounds(x, y, z) || y === -1) return false;
    if (kind !== null && !BLOCK_TYPES.includes(kind)) return false;
    const id = blockKey(x, y, z);
    const previous = this.blocks.get(id) ?? null;
    if (previous === kind) return false;
    if (kind === null) this.blocks.delete(id);
    else this.blocks.set(id, kind);
    this.edits[id] = kind;
    this.onChange?.({ x, y, z, previous, kind });
    return true;
  }

  highestAt(x, z) {
    for (let y = MAX_HEIGHT; y >= -1; y--) if (this.solid(x, y, z)) return y;
    return -1;
  }

  forEach(callback) {
    for (const [id, kind] of this.blocks) {
      const [x, y, z] = id.split(',').map(Number);
      callback(kind, x, y, z);
    }
  }

  exportEdits() {
    return { ...this.edits };
  }
}
