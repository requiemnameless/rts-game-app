/**
 * Touch & mouse input handling for mobile RTS
 */
import { BUILDING_TYPES as BUILDING_TYPES_MAP } from './buildings/buildingTypes.js';

export class InputHandler {
  constructor(canvas, camera, gameState, pathfinding, gameUpdater) {
    this.canvas = canvas;
    this.camera = camera;
    this.gs = gameState;
    this.pathfinding = pathfinding;
    this.updater = gameUpdater;

    this.selectionBox = null;
    this.selectionStart = null;
    this.touchStartTime = 0;
    this.wasPanning = false;
    this.buildMode = null; // { type: 'barracks', ... }
    this.buildPreview = null;

    this.bindEvents();
  }

  bindEvents() {
    const c = this.canvas;

    // Touch events
    c.addEventListener('touchstart', this.onTouchStart, { passive: false });
    c.addEventListener('touchmove', this.onTouchMove, { passive: false });
    c.addEventListener('touchend', this.onTouchEnd, { passive: false });

    // Mouse events (for desktop testing)
    c.addEventListener('mousedown', this.onMouseDown);
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }

  destroy() {
    const c = this.canvas;
    c.removeEventListener('touchstart', this.onTouchStart);
    c.removeEventListener('touchmove', this.onTouchMove);
    c.removeEventListener('touchend', this.onTouchEnd);
    c.removeEventListener('mousedown', this.onMouseDown);
    c.removeEventListener('mousemove', this.onMouseMove);
    c.removeEventListener('mouseup', this.onMouseUp);
    c.removeEventListener('wheel', this.onWheel);
  }

  onTouchStart = (e) => {
    e.preventDefault();
    this.camera.handleTouchStart(e);
    this.touchStartTime = performance.now();
    this.wasPanning = false;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.selectionStart = { x: touch.clientX, y: touch.clientY };
    }
  };

  onTouchMove = (e) => {
    e.preventDefault();
    const result = this.camera.handleTouchMove(e);
    if (result === 'pan' || result === 'zoom') {
      this.wasPanning = true;
      this.selectionBox = null;
    }

    // Selection box for single finger drag (if not panning much)
    if (e.touches.length === 1 && this.selectionStart && !this.wasPanning) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.selectionStart.x;
      const dy = touch.clientY - this.selectionStart.y;

      if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
        this.wasPanning = true; // Actually it's a pan
      }
    }
  };

  onTouchEnd = (e) => {
    e.preventDefault();
    this.camera.handleTouchEnd(e);

    const elapsed = performance.now() - this.touchStartTime;

    if (!this.wasPanning && elapsed < 300 && this.selectionStart) {
      // Tap
      this.handleTap(this.selectionStart.x, this.selectionStart.y);
    }

    this.selectionStart = null;
    this.selectionBox = null;
  };

  // Mouse events for desktop
  onMouseDown = (e) => {
    if (e.button === 0) {
      this.selectionStart = { x: e.clientX, y: e.clientY };
      this.touchStartTime = performance.now();
      this.wasPanning = false;
    } else if (e.button === 2) {
      e.preventDefault();
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      this.handleRightClick(world.x, world.y);
    }
  };

  onMouseMove = (e) => {
    if (this.selectionStart && e.buttons === 1) {
      const dx = e.clientX - this.selectionStart.x;
      const dy = e.clientY - this.selectionStart.y;

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        this.selectionBox = {
          x: Math.min(this.selectionStart.x, e.clientX),
          y: Math.min(this.selectionStart.y, e.clientY),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
      }
    }

    if (this.buildMode) {
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      this.buildPreview = { x: world.x, y: world.y };
    }
  };

  onMouseUp = (e) => {
    if (e.button === 0) {
      if (this.selectionBox && this.selectionBox.w > 10 && this.selectionBox.h > 10) {
        this.handleBoxSelect(this.selectionBox);
      } else {
        this.handleTap(e.clientX, e.clientY);
      }
    }

    this.selectionStart = null;
    this.selectionBox = null;
  };

  onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoomAt(factor, e.clientX, e.clientY);
  };

  handleTap(sx, sy) {
    const world = this.camera.screenToWorld(sx, sy);

    // Build mode
    if (this.buildMode) {
      this.placeBuild(world.x, world.y);
      return;
    }

    // Check if tapped on a unit or building
    const tapped = this.findEntityAt(world.x, world.y);

    if (tapped) {
      if (tapped.owner === 'player') {
        this.gs.deselectAll();
        tapped.selected = true;
      } else {
        // Tapped enemy - attack command for selected units
        const selected = this.gs.getSelectedUnits();
        if (selected.length > 0) {
          this.commandAttack(selected, tapped);
        }
      }
    } else {
      // Tapped empty ground
      const selected = this.gs.getSelectedUnits();
      if (selected.length > 0) {
        this.commandMove(selected, world.x, world.y);
      } else {
        this.gs.deselectAll();

        // Check if tapped on resource
        const resource = this.findResourceAt(world.x, world.y);
        if (resource) {
          // If we have selected workers, send them to harvest
        }
      }
    }
  }

  handleRightClick(wx, wy) {
    const selected = this.gs.getSelectedUnits();
    if (selected.length === 0) return;

    // Check if right-clicked on enemy
    const enemy = this.findEnemyAt(wx, wy);
    if (enemy) {
      this.commandAttack(selected, enemy);
      return;
    }

    // Check if right-clicked on resource
    const resource = this.findResourceAt(wx, wy);
    if (resource) {
      const workers = selected.filter(u => u.canHarvest);
      for (const w of workers) {
        w.harvestTarget = resource;
        w.state = 'harvesting';
        w.progress = 0;
        const path = this.pathfinding.findPath(w.x, w.y, resource.x + resource.w / 2, resource.y + resource.h / 2);
        if (path) {
          w.path = path;
          w.pathIndex = 0;
          w.state = 'moving';
        }
      }
      return;
    }

    // Move to location
    this.commandMove(selected, wx, wy);
  }

  commandMove(units, tx, ty) {
    const spacing = 30;
    const cols = Math.ceil(Math.sqrt(units.length));

    units.forEach((unit, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offsetX = (col - cols / 2) * spacing;
      const offsetY = row * spacing;

      const path = this.pathfinding.findPath(unit.x, unit.y, tx + offsetX, ty + offsetY);
      if (path && path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.state = 'moving';
        unit.attackTarget = null;
      }
    });
  }

  commandAttack(units, target) {
    for (const unit of units) {
      unit.attackTarget = target;
      unit.state = 'attacking';
    }
  }

  handleBoxSelect(box) {
    this.gs.deselectAll();

    const topLeft = this.camera.screenToWorld(box.x, box.y);
    const bottomRight = this.camera.screenToWorld(box.x + box.w, box.y + box.h);

    for (const unit of this.gs.units) {
      if (unit.owner !== 'player') continue;
      if (unit.x >= topLeft.x && unit.x <= bottomRight.x &&
          unit.y >= topLeft.y && unit.y <= bottomRight.y) {
        unit.selected = true;
      }
    }
  }

  findEntityAt(wx, wy) {
    // Check units first
    for (const unit of this.gs.units) {
      const dist = Math.hypot(unit.x - wx, unit.y - wy);
      if (dist < unit.size + 8) return unit;
    }
    // Then buildings
    for (const building of this.gs.buildings) {
      if (wx >= building.x - building.size && wx <= building.x + building.size &&
          wy >= building.y - building.size && wy <= building.y + building.size) {
        return building;
      }
    }
    return null;
  }

  findEnemyAt(wx, wy) {
    const entity = this.findEntityAt(wx, wy);
    return entity && entity.owner === 'enemy' ? entity : null;
  }

  findResourceAt(wx, wy) {
    for (const t of this.gs.terrain) {
      if (t.type !== 'crystal' && t.type !== 'gas') continue;
      if (wx >= t.x && wx <= t.x + t.w && wy >= t.y && wy <= t.y + t.h) {
        return t;
      }
    }
    return null;
  }

  enterBuildMode(buildingType) {
    this.buildMode = buildingType;
  }

  cancelBuildMode() {
    this.buildMode = null;
    this.buildPreview = null;
  }

  placeBuild(wx, wy) {
    if (!this.buildMode) return;

    const template = BUILDING_TYPES_MAP[this.buildMode];
    if (!template) return;

    const faction = this.gs.playerFaction;
    const cost = {
      crystal: Math.floor(template.cost.crystal * (faction.bonuses.unitCost || 1)),
      gas: Math.floor(template.cost.gas * (faction.bonuses.unitCost || 1)),
    };

    if (!this.gs.canAfford('player', cost)) return;

    this.gs.spend('player', cost);
    const building = this.gs.createBuilding(this.buildMode, wx, wy, 'player');

    // Send nearest idle worker to build
    const workers = this.gs.units.filter(u =>
      u.owner === 'player' && u.type === 'worker' && u.canBuild
    );

    if (workers.length > 0) {
      const nearest = workers.reduce((a, b) =>
        Math.hypot(a.x - wx, a.y - wy) < Math.hypot(b.x - wx, b.y - wy) ? a : b
      );
      nearest.buildTarget = building;
      nearest.state = 'building';
      const path = this.pathfinding.findPath(nearest.x, nearest.y, wx, wy + template.size + 10);
      if (path) {
        nearest.path = path;
        nearest.pathIndex = 0;
        nearest.state = 'moving';
      }
    }

    this.buildMode = null;
    this.buildPreview = null;
  }
}
