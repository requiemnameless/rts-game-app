/**
 * Camera system with touch pan and pinch-to-zoom
 */
export class Camera {
  constructor(mapWidth, mapHeight) {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = 0.3;
    this.maxZoom = 2.5;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.viewportW = window.innerWidth;
    this.viewportH = window.innerHeight;

    // Touch state
    this.touches = new Map();
    this.lastPinchDist = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.camStartX = 0;
    this.camStartY = 0;
  }

  resize(w, h) {
    this.viewportW = w;
    this.viewportH = h;
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  clamp() {
    const maxX = Math.max(0, this.mapWidth - this.viewportW / this.zoom);
    const maxY = Math.max(0, this.mapHeight - this.viewportH / this.zoom);
    this.x = Math.max(0, Math.min(maxX, this.x));
    this.y = Math.max(0, Math.min(maxY, this.y));
  }

  pan(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  zoomAt(factor, sx, sy) {
    const worldBefore = this.screenToWorld(sx, sy);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const worldAfter = this.screenToWorld(sx, sy);
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
    this.clamp();
  }

  centerOn(wx, wy) {
    this.x = wx - this.viewportW / (2 * this.zoom);
    this.y = wy - this.viewportH / (2 * this.zoom);
    this.clamp();
  }

  handleTouchStart(e) {
    for (const touch of e.changedTouches) {
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
    if (this.touches.size === 1) {
      const t = [...this.touches.values()][0];
      this.isDragging = true;
      this.dragStartX = t.x;
      this.dragStartY = t.y;
      this.camStartX = this.x;
      this.camStartY = this.y;
    }
    if (this.touches.size === 2) {
      const pts = [...this.touches.values()];
      this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  }

  handleTouchMove(e) {
    for (const touch of e.changedTouches) {
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    if (this.touches.size === 1 && this.isDragging) {
      const t = [...this.touches.values()][0];
      const dx = t.x - this.dragStartX;
      const dy = t.y - this.dragStartY;
      this.x = this.camStartX - dx / this.zoom;
      this.y = this.camStartY - dy / this.zoom;
      this.clamp();
      return 'pan';
    }

    if (this.touches.size === 2) {
      const pts = [...this.touches.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (this.lastPinchDist > 0) {
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        this.zoomAt(dist / this.lastPinchDist, cx, cy);
      }
      this.lastPinchDist = dist;
      return 'zoom';
    }
    return null;
  }

  handleTouchEnd(e) {
    for (const touch of e.changedTouches) {
      this.touches.delete(touch.identifier);
    }
    if (this.touches.size < 2) this.lastPinchDist = 0;
    if (this.touches.size === 0) this.isDragging = false;
  }
}
