/**
 * A* pathfinding on a grid with flow-field caching for groups
 */
export class Pathfinding {
  constructor(mapWidth, mapHeight, cellSize = 32) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(mapWidth / cellSize);
    this.rows = Math.ceil(mapHeight / cellSize);
    this.grid = new Uint8Array(this.cols * this.rows); // 0=walkable, 1=blocked
  }

  setBlocked(worldX, worldY, w, h) {
    const c0 = Math.floor(worldX / this.cellSize);
    const r0 = Math.floor(worldY / this.cellSize);
    const c1 = Math.ceil((worldX + w) / this.cellSize);
    const r1 = Math.ceil((worldY + h) / this.cellSize);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.grid[r * this.cols + c] = 1;
        }
      }
    }
  }

  clearBlocked(worldX, worldY, w, h) {
    const c0 = Math.floor(worldX / this.cellSize);
    const r0 = Math.floor(worldY / this.cellSize);
    const c1 = Math.ceil((worldX + w) / this.cellSize);
    const r1 = Math.ceil((worldY + h) / this.cellSize);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.grid[r * this.cols + c] = 0;
        }
      }
    }
  }

  isBlocked(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true;
    return this.grid[row * this.cols + col] === 1;
  }

  findPath(startX, startY, endX, endY) {
    const sc = Math.floor(startX / this.cellSize);
    const sr = Math.floor(startY / this.cellSize);
    const ec = Math.floor(endX / this.cellSize);
    const er = Math.floor(endY / this.cellSize);

    if (this.isBlocked(ec, er)) {
      // Find nearest non-blocked cell
      const near = this.findNearestWalkable(ec, er);
      if (!near) return null;
      return this.astar(sc, sr, near.c, near.r);
    }

    return this.astar(sc, sr, ec, er);
  }

  findNearestWalkable(col, row) {
    for (let radius = 1; radius < 10; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const nc = col + dc;
          const nr = row + dr;
          if (!this.isBlocked(nc, nr)) return { c: nc, r: nr };
        }
      }
    }
    return null;
  }

  astar(sc, sr, ec, er) {
    const key = (c, r) => r * this.cols + c;
    const heuristic = (c, r) => Math.abs(c - ec) + Math.abs(r - er);

    const open = [{ c: sc, r: sr, g: 0, f: heuristic(sc, sr) }];
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(key(sc, sr), 0);

    const dirs = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
      [1, -1], [1, 1], [-1, 1], [-1, -1],
    ];

    let iterations = 0;
    const maxIter = 2000;

    while (open.length > 0 && iterations < maxIter) {
      iterations++;

      // Find lowest f
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];
      const ck = key(current.c, current.r);

      if (current.c === ec && current.r === er) {
        return this.reconstructPath(cameFrom, current.c, current.r);
      }

      closed.add(ck);

      for (const [dc, dr] of dirs) {
        const nc = current.c + dc;
        const nr = current.r + dr;
        const nk = key(nc, nr);

        if (closed.has(nk) || this.isBlocked(nc, nr)) continue;

        // Check diagonal blocking
        if (dc !== 0 && dr !== 0) {
          if (this.isBlocked(current.c + dc, current.r) || this.isBlocked(current.c, current.r + dr)) continue;
        }

        const moveCost = dc !== 0 && dr !== 0 ? 1.414 : 1;
        const tentG = current.g + moveCost;

        if (!gScore.has(nk) || tentG < gScore.get(nk)) {
          gScore.set(nk, tentG);
          cameFrom.set(nk, ck);
          const f = tentG + heuristic(nc, nr);
          const existing = open.find(n => key(n.c, n.r) === nk);
          if (existing) {
            existing.g = tentG;
            existing.f = f;
          } else {
            open.push({ c: nc, r: nr, g: tentG, f });
          }
        }
      }
    }

    return null; // No path found
  }

  reconstructPath(cameFrom, ec, er) {
    const path = [];
    let ck = er * this.cols + ec;
    while (cameFrom.has(ck)) {
      const c = ck % this.cols;
      const r = Math.floor(ck / this.cols);
      path.unshift({
        x: c * this.cellSize + this.cellSize / 2,
        y: r * this.cellSize + this.cellSize / 2,
      });
      ck = cameFrom.get(ck);
    }
    return path;
  }
}
