/**
 * Grid-based voxel picking. Each block is a unit cube centred on integer
 * coordinates, so world-space cell boundaries are at n + 0.5.
 * Traverses only intersected cells (3D DDA), independent of chunk geometry.
 */
export function raycastVoxel(world, origin, direction, maxDistance = 6.5) {
  const values = [direction.x, direction.y, direction.z];
  const length = Math.hypot(...values);
  if (!(length > 0) || !(maxDistance > 0)) return null;
  const dir = values.map(v => v / length);
  const point = [origin.x, origin.y, origin.z];
  if (!point.every(Number.isFinite)) return null;
  const cell = point.map(v => Math.floor(v + .5));
  const step = dir.map(v => Math.sign(v));
  const tDelta = dir.map(v => v === 0 ? Infinity : Math.abs(1 / v));
  const tMax = dir.map((v, axis) => {
    if (v === 0) return Infinity;
    const boundary = cell[axis] + (v > 0 ? .5 : -.5);
    return Math.max(0, (boundary - point[axis]) / v);
  });
  let distance = 0;
  let enteredAxis = -1;
  // Every grid crossing consumes distance; this bound prevents infinite loops.
  const maxSteps = Math.ceil(maxDistance * 4) + 8;
  for (let i = 0; i < maxSteps && distance <= maxDistance + 1e-9; i++) {
    if (world.solid(cell[0], cell[1], cell[2])) {
      if (enteredAxis < 0) return null; // camera embedded in a block
      const normal = [0, 0, 0];
      normal[enteredAxis] = -step[enteredAxis];
      return {
        x: cell[0], y: cell[1], z: cell[2],
        adjacent: {
          x: cell[0] + normal[0],
          y: cell[1] + normal[1],
          z: cell[2] + normal[2]
        },
        normal: { x: normal[0], y: normal[1], z: normal[2] },
        distance
      };
    }
    // Prefer deterministic axis order on exact edges/corners.
    let axis = 0;
    if (tMax[1] < tMax[axis]) axis = 1;
    if (tMax[2] < tMax[axis]) axis = 2;
    if (!Number.isFinite(tMax[axis]) || tMax[axis] > maxDistance) break;
    distance = tMax[axis];
    cell[axis] += step[axis];
    tMax[axis] += tDelta[axis];
    enteredAxis = axis;
  }
  return null;
}
