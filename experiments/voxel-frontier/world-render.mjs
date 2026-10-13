import { CHUNK_SIZE, chunkIndex } from './world-core.mjs';

// Every visible surface is emitted once; hidden interior faces are discarded.
// One draw call per material per 8x8 terrain chunk instead of one per voxel.
const FACES = [
  { n: [1, 0, 0], axis: 'x', u: 'z', v: 'y' },
  { n: [-1, 0, 0], axis: 'x', u: 'z', v: 'y' },
  { n: [0, 1, 0], axis: 'y', u: 'x', v: 'z' },
  { n: [0, -1, 0], axis: 'y', u: 'x', v: 'z' },
  { n: [0, 0, 1], axis: 'z', u: 'x', v: 'y' },
  { n: [0, 0, -1], axis: 'z', u: 'x', v: 'y' }
];
const TRIANGLES = [0, 1, 2, 0, 2, 3];

// Combine adjacent coplanar faces of the same material into larger rectangles.
// This reduces triangles as well as draw calls while keeping exact voxel boundaries.
function greedyQuads(groups) {
  const data = new Map();
  for (const group of groups.values()) {
    const { kind, face, plane, cells } = group;
    let item = data.get(kind);
    if (!item) {
      item = { positions: [], normals: [] };
      data.set(kind, item);
    }
    const visited = new Set();
    for (const key of cells) {
      if (visited.has(key)) continue;
      const [u, v] = key.split(',').map(Number);
      let width = 1;
      while (cells.has(`${u + width},${v}`) && !visited.has(`${u + width},${v}`)) width++;
      let height = 1;
      for (;;) {
        let rowComplete = true;
        for (let dx = 0; dx < width; dx++) {
          const next = `${u + dx},${v + height}`;
          if (!cells.has(next) || visited.has(next)) { rowComplete = false; break; }
        }
        if (!rowComplete) break;
        height++;
      }
      for (let dy = 0; dy < height; dy++)
        for (let dx = 0; dx < width; dx++) visited.add(`${u + dx},${v + dy}`);

      const point = (a, b) => {
        const xyz = { x: 0, y: 0, z: 0 };
        xyz[face.axis] = plane;
        xyz[face.u] = a;
        xyz[face.v] = b;
        return [xyz.x, xyz.y, xyz.z];
      };
      const quad = [
        point(u - .5, v - .5), point(u + width - .5, v - .5),
        point(u + width - .5, v + height - .5), point(u - .5, v + height - .5)
      ];
      const ab = quad[1].map((n, i) => n - quad[0][i]);
      const ac = quad[2].map((n, i) => n - quad[0][i]);
      const cross = [ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0]];
      if (cross.reduce((sum, n, i) => sum + n * face.n[i], 0) < 0) quad.reverse();
      for (const index of TRIANGLES) {
        item.positions.push(...quad[index]);
        item.normals.push(...face.n);
      }
    }
  }
  return data;
}
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
    const groups = new Map();
    const world = this.world;
    const minX = Math.max(-world.radius, cx * CHUNK_SIZE);
    const maxX = Math.min(world.radius, (cx + 1) * CHUNK_SIZE - 1);
    const minZ = Math.max(-world.radius, cz * CHUNK_SIZE);
    const maxZ = Math.min(world.radius, (cz + 1) * CHUNK_SIZE - 1);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      for (let y = -1; y <= 32; y++) {
        const kind = world.get(x, y, z);
        if (!kind) continue;
        for (let faceIndex = 0; faceIndex < FACES.length; faceIndex++) {
          const face = FACES[faceIndex];
          const [nx, ny, nz] = face.n;
          if (world.solid(x + nx, y + ny, z + nz)) continue;
          const xyz = { x, y, z };
          const plane = xyz[face.axis] + face.n[['x','y','z'].indexOf(face.axis)] * .5;
          const groupId = `${kind}|${faceIndex}|${plane}`;
          let group = groups.get(groupId);
          if (!group) {
            group = { kind, face, plane, cells: new Set() };
            groups.set(groupId, group);
          }
          group.cells.add(`${xyz[face.u]},${xyz[face.v]}`);
        }
      }
    }
    const data = greedyQuads(groups);
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
