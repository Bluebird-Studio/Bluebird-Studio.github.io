import { CHUNK_SIZE, chunkIndex } from './world-core.mjs';

// Every visible surface is emitted once; hidden interior faces are discarded.
// One draw call per material per 8x8 terrain chunk instead of one per voxel.
const FACES = [
  { n: [1,0,0], v: [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]] },
  { n: [-1,0,0], v: [[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]] },
  { n: [0,1,0], v: [[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]] },
  { n: [0,-1,0], v: [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]] },
  { n: [0,0,1], v: [[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[-.5,-.5,.5]] },
  { n: [0,0,-1], v: [[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]] }
];
const TRIANGLES = [0,1,2,0,2,3];
const id = (cx, cz) => cx + ',' + cz;

export class ChunkRenderer {
  constructor(THREE, scene, world, materials) {
    this.THREE = THREE;
    this.scene = scene;
    this.world = world;
    this.materials = materials;
    this.chunks = new Map();
    this.meshes = new Set();
    this.buildAll();
  }

  buildAll() {
    const low = chunkIndex(-this.world.radius);
    const high = chunkIndex(this.world.radius);
    for (let cx = low; cx <= high; cx++)
      for (let cz = low; cz <= high; cz++)
        this.rebuild(cx, cz);
  }

  rebuild(cx, cz) {
    const name = id(cx, cz);
    const previous = this.chunks.get(name) || [];
    for (const mesh of previous) {
      this.meshes.delete(mesh);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    const data = new Map();
    const world = this.world;
    const minX = Math.max(-world.radius, cx * CHUNK_SIZE);
    const maxX = Math.min(world.radius, (cx + 1) * CHUNK_SIZE - 1);
    const minZ = Math.max(-world.radius, cz * CHUNK_SIZE);
    const maxZ = Math.min(world.radius, (cz + 1) * CHUNK_SIZE - 1);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      for (let y = -1; y <= 32; y++) {
        const kind = world.get(x, y, z);
        if (!kind) continue;
        let item = data.get(kind);
        if (!item) { item = { positions: [], normals: [] }; data.set(kind, item); }
        for (const face of FACES) {
          const [nx, ny, nz] = face.n;
          if (world.solid(x + nx, y + ny, z + nz)) continue;
          for (const index of TRIANGLES) {
            const v = face.v[index];
            item.positions.push(x + v[0], y + v[1], z + v[2]);
            item.normals.push(nx, ny, nz);
          }
        }
      }
    }
    const fresh = [];
    for (const [kind, item] of data) {
      if (!item.positions.length) continue;
      const geometry = new this.THREE.BufferGeometry();
      geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(item.positions, 3));
      geometry.setAttribute('normal', new this.THREE.Float32BufferAttribute(item.normals, 3));
      geometry.computeBoundingSphere();
      const mesh = new this.THREE.Mesh(geometry, this.materials[kind] || this.materials.stone);
      mesh.userData.chunk = name;
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      this.meshes.add(mesh);
      fresh.push(mesh);
    }
    this.chunks.set(name, fresh);
  }

  updateAt(x, z) {
    const cx = chunkIndex(x), cz = chunkIndex(z);
    this.rebuild(cx, cz);
    // A changed boundary voxel can expose a face in the adjacent chunk.
    if (x % CHUNK_SIZE === 0) this.rebuild(cx - 1, cz);
    if ((x + 1) % CHUNK_SIZE === 0) this.rebuild(cx + 1, cz);
    if (z % CHUNK_SIZE === 0) this.rebuild(cx, cz - 1);
    if ((z + 1) % CHUNK_SIZE === 0) this.rebuild(cx, cz + 1);
  }

  pick(raycaster) {
    const hit = raycaster.intersectObjects([...this.meshes], false)[0];
    if (!hit) return null;
    const normal = hit.face.normal.clone();
    const inside = hit.point.clone().addScaledVector(normal, -0.025);
    const outside = hit.point.clone().addScaledVector(normal, 0.025);
    const round = value => Math.round(value);
    return {
      x: round(inside.x), y: round(inside.y), z: round(inside.z),
      adjacent: { x: round(outside.x), y: round(outside.y), z: round(outside.z) },
      normal
    };
  }

  dispose() {
    for (const [cxcz] of this.chunks) {
      const meshes = this.chunks.get(cxcz);
      for (const mesh of meshes) { this.scene.remove(mesh); mesh.geometry.dispose(); }
    }
    this.chunks.clear();
    this.meshes.clear();
  }
}
