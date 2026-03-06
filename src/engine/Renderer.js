/**
 * Canvas renderer with sci-fi visual style
 */
export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.particles = [];
  }

  clear() {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    const ctx = this.ctx;
    const cam = this.camera;
    const gridSize = 64;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    const startX = Math.floor(cam.x / gridSize) * gridSize;
    const startY = Math.floor(cam.y / gridSize) * gridSize;
    const endX = cam.x + cam.viewportW / cam.zoom;
    const endY = cam.y + cam.viewportH / cam.zoom;

    for (let x = startX; x <= endX; x += gridSize) {
      const sx = (x - cam.x) * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const sy = (y - cam.y) * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(this.canvas.width, sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTerrain(terrain) {
    const ctx = this.ctx;
    const cam = this.camera;

    for (const t of terrain) {
      const sx = (t.x - cam.x) * cam.zoom;
      const sy = (t.y - cam.y) * cam.zoom;
      const sw = t.w * cam.zoom;
      const sh = t.h * cam.zoom;

      // Skip if off-screen
      if (sx + sw < 0 || sy + sh < 0 || sx > this.canvas.width || sy > this.canvas.height) continue;

      if (t.type === 'crystal') {
        ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
        ctx.fillRect(sx, sy, sw, sh);
        // Glow
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 10 * cam.zoom;
        ctx.fillStyle = 'rgba(0, 230, 255, 0.6)';
        ctx.fillRect(sx + sw * 0.3, sy + sh * 0.2, sw * 0.4, sh * 0.6);
        ctx.shadowBlur = 0;
      } else if (t.type === 'gas') {
        ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, sw / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 255, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, sw / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.type === 'obstacle') {
        ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(100, 100, 140, 0.5)';
        ctx.strokeRect(sx, sy, sw, sh);
      }
    }
  }

  drawUnit(unit) {
    const ctx = this.ctx;
    const cam = this.camera;
    const sx = (unit.x - cam.x) * cam.zoom;
    const sy = (unit.y - cam.y) * cam.zoom;
    const size = unit.size * cam.zoom;

    // Skip if off-screen
    if (sx + size < 0 || sy + size < 0 || sx - size > this.canvas.width || sy - size > this.canvas.height) return;

    const colors = unit.faction?.colors || { primary: '#ffffff', secondary: '#888888', glow: '#ffffff' };

    // Selection ring
    if (unit.selected) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, size + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Unit body with faction glow
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8 * cam.zoom;

    if (unit.type === 'worker') {
      this.drawWorker(ctx, sx, sy, size, colors);
    } else if (unit.type === 'soldier') {
      this.drawSoldier(ctx, sx, sy, size, colors);
    } else if (unit.type === 'tank') {
      this.drawTank(ctx, sx, sy, size, colors);
    } else if (unit.type === 'flyer') {
      this.drawFlyer(ctx, sx, sy, size, colors);
    } else {
      // Default
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Health bar
    if (unit.hp < unit.maxHp) {
      const barW = size * 2;
      const barH = 3 * cam.zoom;
      const barX = sx - barW / 2;
      const barY = sy - size - 8 * cam.zoom;
      const ratio = unit.hp / unit.maxHp;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffaa00' : '#ff3333';
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }

    // Build / harvest progress
    if (unit.progress !== undefined && unit.progress < 1) {
      const barW = size * 2;
      const barH = 2 * cam.zoom;
      const barX = sx - barW / 2;
      const barY = sy + size + 4 * cam.zoom;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(barX, barY, barW * unit.progress, barH);
    }
  }

  drawWorker(ctx, sx, sy, size, colors) {
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.primary;
    ctx.fillRect(sx - size * 0.3, sy - size * 0.3, size * 0.6, size * 0.6);
  }

  drawSoldier(ctx, sx, sy, size, colors) {
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx + size * 0.8, sy + size * 0.6);
    ctx.lineTo(sx - size * 0.8, sy + size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.arc(sx, sy + size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTank(ctx, sx, sy, size, colors) {
    ctx.fillStyle = colors.primary;
    ctx.fillRect(sx - size, sy - size * 0.6, size * 2, size * 1.2);
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Cannon
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 3 * (size / 16);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + size * 1.3, sy);
    ctx.stroke();
  }

  drawFlyer(ctx, sx, sy, size, colors) {
    ctx.fillStyle = colors.primary;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx + size, sy);
    ctx.lineTo(sx, sy + size * 0.6);
    ctx.lineTo(sx - size, sy);
    ctx.closePath();
    ctx.fill();
    // Wings
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.3, sy);
    ctx.lineTo(sx - size * 1.2, sy + size * 0.3);
    ctx.lineTo(sx - size * 0.3, sy + size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + size * 0.3, sy);
    ctx.lineTo(sx + size * 1.2, sy + size * 0.3);
    ctx.lineTo(sx + size * 0.3, sy + size * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  drawBuilding(building) {
    const ctx = this.ctx;
    const cam = this.camera;
    const sx = (building.x - cam.x) * cam.zoom;
    const sy = (building.y - cam.y) * cam.zoom;
    const size = building.size * cam.zoom;

    if (sx + size < 0 || sy + size < 0 || sx - size > this.canvas.width || sy - size > this.canvas.height) return;

    const colors = building.faction?.colors || { primary: '#ffffff', secondary: '#888888', glow: '#ffffff' };

    // Selection
    if (building.selected) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - size, sy - size, size * 2, size * 2);
    }

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * cam.zoom;

    // Base
    ctx.fillStyle = colors.primary;
    ctx.fillRect(sx - size, sy - size, size * 2, size * 2);

    // Detail overlay based on type
    ctx.fillStyle = colors.secondary;
    if (building.type === 'hq') {
      ctx.fillRect(sx - size * 0.6, sy - size * 0.6, size * 1.2, size * 1.2);
      ctx.fillStyle = colors.glow;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (building.type === 'barracks') {
      ctx.fillRect(sx - size * 0.7, sy - size * 0.4, size * 1.4, size * 0.8);
      // Door
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - size * 0.15, sy + size * 0.1, size * 0.3, size * 0.5);
    } else if (building.type === 'refinery') {
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ccff';
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (building.type === 'factory') {
      ctx.fillRect(sx - size * 0.8, sy - size * 0.5, size * 1.6, size * 1.0);
      ctx.fillStyle = colors.glow;
      ctx.fillRect(sx - size * 0.2, sy - size * 0.8, size * 0.4, size * 0.4);
    } else if (building.type === 'turret') {
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const angle = building.angle || 0;
      ctx.lineTo(sx + Math.cos(angle) * size * 1.2, sy + Math.sin(angle) * size * 1.2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // HP bar
    if (building.hp < building.maxHp) {
      const barW = size * 2;
      const barH = 4 * cam.zoom;
      const barX = sx - barW / 2;
      const barY = sy - size - 10 * cam.zoom;
      const ratio = building.hp / building.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffaa00' : '#ff3333';
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }

    // Build progress
    if (building.buildProgress < 1) {
      const barW = size * 2;
      const barH = 3 * cam.zoom;
      const barX = sx - barW / 2;
      const barY = sy + size + 4 * cam.zoom;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(barX, barY, barW * building.buildProgress, barH);
    }
  }

  drawProjectile(proj) {
    const ctx = this.ctx;
    const cam = this.camera;
    const sx = (proj.x - cam.x) * cam.zoom;
    const sy = (proj.y - cam.y) * cam.zoom;

    ctx.shadowColor = proj.color || '#ff4444';
    ctx.shadowBlur = 6;
    ctx.fillStyle = proj.color || '#ff4444';
    ctx.beginPath();
    ctx.arc(sx, sy, 3 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    if (proj.trail) {
      ctx.strokeStyle = proj.color || '#ff4444';
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const tsx = (proj.trail.x - cam.x) * cam.zoom;
      const tsy = (proj.trail.y - cam.y) * cam.zoom;
      ctx.lineTo(tsx, tsy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
  }

  addParticle(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  updateAndDrawParticles(dt) {
    const ctx = this.ctx;
    const cam = this.camera;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      const sx = (p.x - cam.x) * cam.zoom;
      const sy = (p.y - cam.y) * cam.zoom;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSelectionBox(box) {
    if (!box) return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
    ctx.lineWidth = 1;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  drawMinimap(gameState, minimapRect) {
    const ctx = this.ctx;
    const cam = this.camera;
    const { x: mx, y: my, w: mw, h: mh } = minimapRect;

    // Background
    ctx.fillStyle = 'rgba(0, 10, 20, 0.85)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    const scaleX = mw / cam.mapWidth;
    const scaleY = mh / cam.mapHeight;

    // Resources
    for (const t of gameState.terrain) {
      const rx = mx + t.x * scaleX;
      const ry = my + t.y * scaleY;
      ctx.fillStyle = t.type === 'crystal' ? '#00ccff' : t.type === 'gas' ? '#00ff66' : '#444466';
      ctx.fillRect(rx, ry, Math.max(2, t.w * scaleX), Math.max(2, t.h * scaleY));
    }

    // Buildings
    for (const b of gameState.buildings) {
      const bx = mx + b.x * scaleX;
      const by = my + b.y * scaleY;
      ctx.fillStyle = b.faction?.colors?.primary || '#888';
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }

    // Units
    for (const u of gameState.units) {
      const ux = mx + u.x * scaleX;
      const uy = my + u.y * scaleY;
      ctx.fillStyle = u.faction?.colors?.primary || '#888';
      ctx.fillRect(ux - 1, uy - 1, 2, 2);
    }

    // Camera viewport
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + cam.x * scaleX,
      my + cam.y * scaleY,
      (cam.viewportW / cam.zoom) * scaleX,
      (cam.viewportH / cam.zoom) * scaleY,
    );
  }
}
