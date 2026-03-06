/**
 * Game logic update system - handles movement, combat, harvesting, production
 */
import { UNIT_TYPES } from './units/unitTypes.js';

export class GameUpdater {
  constructor(gameState, pathfinding, renderer) {
    this.gs = gameState;
    this.pathfinding = pathfinding;
    this.renderer = renderer;
  }

  update(dt) {
    if (this.gs.gameOver) return;

    this.gs.gameTime += dt;
    this.updateUnits(dt);
    this.updateBuildings(dt);
    this.updateProjectiles(dt);
  }

  updateUnits(dt) {
    for (const unit of [...this.gs.units]) {
      if (unit.hp <= 0) {
        this.renderer?.addParticle(unit.x, unit.y, unit.faction?.colors?.primary || '#ff0', 10);
        this.gs.removeUnit(unit);
        continue;
      }

      unit.attackCooldownTimer = Math.max(0, unit.attackCooldownTimer - dt);

      switch (unit.state) {
        case 'moving':
          this.moveUnit(unit, dt);
          break;
        case 'attacking':
          this.handleAttack(unit, dt);
          break;
        case 'harvesting':
          this.handleHarvest(unit, dt);
          break;
        case 'returning':
          this.handleReturn(unit, dt);
          break;
        case 'building':
          this.handleBuild(unit, dt);
          break;
        case 'idle':
          this.handleIdle(unit, dt);
          break;
      }
    }
  }

  moveUnit(unit, dt) {
    if (!unit.path || unit.pathIndex >= unit.path.length) {
      unit.state = 'idle';
      unit.path = null;
      return;
    }

    const target = unit.path[unit.pathIndex];
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      unit.pathIndex++;
      if (unit.pathIndex >= unit.path.length) {
        unit.state = 'idle';
        unit.path = null;

        // Check if we were moving toward an attack target
        if (unit.attackTarget) {
          unit.state = 'attacking';
        } else if (unit.harvestTarget) {
          unit.state = 'harvesting';
          unit.progress = 0;
        } else if (unit.buildTarget) {
          unit.state = 'building';
        }
      }
      return;
    }

    const moveSpeed = unit.speed * dt;
    unit.x += (dx / dist) * Math.min(moveSpeed, dist);
    unit.y += (dy / dist) * Math.min(moveSpeed, dist);
    unit.angle = Math.atan2(dy, dx);
  }

  handleAttack(unit, dt) {
    const target = unit.attackTarget;
    if (!target || target.hp <= 0) {
      unit.attackTarget = null;
      unit.state = 'idle';
      return;
    }

    const dist = Math.hypot(target.x - unit.x, target.y - unit.y);

    if (dist > unit.attackRange) {
      // Move toward target
      const path = this.pathfinding.findPath(unit.x, unit.y, target.x, target.y);
      if (path && path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.state = 'moving';
      } else {
        unit.state = 'idle';
        unit.attackTarget = null;
      }
      return;
    }

    unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);

    if (unit.attackCooldownTimer <= 0) {
      const faction = unit.faction;
      const damage = unit.attackDamage * (faction?.bonuses?.attackDamage || 1);
      this.gs.createProjectile(
        unit.x, unit.y,
        target.x, target.y,
        damage,
        faction?.colors?.glow || '#ff4444',
        unit.owner,
        unit.splashRadius || 0,
      );
      unit.attackCooldownTimer = unit.attackCooldown;
    }
  }

  handleHarvest(unit, dt) {
    if (!unit.canHarvest) {
      unit.state = 'idle';
      return;
    }

    const target = unit.harvestTarget;
    if (!target || target.remaining <= 0) {
      unit.harvestTarget = null;
      unit.state = 'idle';
      return;
    }

    const dist = Math.hypot(target.x + target.w / 2 - unit.x, target.y + target.h / 2 - unit.y);

    if (dist > 50) {
      const path = this.pathfinding.findPath(unit.x, unit.y, target.x + target.w / 2, target.y + target.h / 2);
      if (path) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.state = 'moving';
      }
      return;
    }

    if (!unit.progress) unit.progress = 0;
    unit.progress += dt / unit.harvestTime;

    if (unit.progress >= 1) {
      const harvestRate = unit.faction?.bonuses?.harvestRate || 1;
      const amount = Math.min(unit.harvestAmount * harvestRate, target.remaining);
      target.remaining -= amount;
      unit.carryingResource = target.type;
      unit.carryingAmount = amount;
      unit.progress = 0;
      unit.state = 'returning';

      // Find nearest HQ to return to
      const hqs = this.gs.buildings.filter(b => b.owner === unit.owner && b.type === 'hq' && b.buildProgress >= 1);
      if (hqs.length > 0) {
        const nearest = hqs.reduce((a, b) =>
          Math.hypot(a.x - unit.x, a.y - unit.y) < Math.hypot(b.x - unit.x, b.y - unit.y) ? a : b
        );
        const path = this.pathfinding.findPath(unit.x, unit.y, nearest.x, nearest.y + nearest.size + 10);
        if (path) {
          unit.path = path;
          unit.pathIndex = 0;
          unit.returnTarget = nearest;
          unit.state = 'moving';
          // After arriving, state becomes 'returning'
        }
      }
    }
  }

  handleReturn(unit, dt) {
    const hqs = this.gs.buildings.filter(b => b.owner === unit.owner && (b.type === 'hq' || b.type === 'refinery') && b.buildProgress >= 1);
    if (hqs.length === 0) {
      unit.state = 'idle';
      return;
    }

    const nearest = hqs.reduce((a, b) =>
      Math.hypot(a.x - unit.x, a.y - unit.y) < Math.hypot(b.x - unit.x, b.y - unit.y) ? a : b
    );

    const dist = Math.hypot(nearest.x - unit.x, nearest.y - unit.y);

    if (dist < nearest.size + 20) {
      // Deliver resources
      if (unit.carryingResource === 'crystal') {
        this.gs.resources[unit.owner].crystal += unit.carryingAmount;
      } else if (unit.carryingResource === 'gas') {
        this.gs.resources[unit.owner].gas += unit.carryingAmount;
      }
      unit.carryingResource = null;
      unit.carryingAmount = 0;

      // Go back to harvest
      if (unit.harvestTarget && unit.harvestTarget.remaining > 0) {
        const path = this.pathfinding.findPath(unit.x, unit.y,
          unit.harvestTarget.x + unit.harvestTarget.w / 2,
          unit.harvestTarget.y + unit.harvestTarget.h / 2
        );
        if (path) {
          unit.path = path;
          unit.pathIndex = 0;
          unit.state = 'moving';
        } else {
          unit.state = 'idle';
        }
      } else {
        unit.state = 'idle';
      }
    } else {
      // Move to HQ
      const path = this.pathfinding.findPath(unit.x, unit.y, nearest.x, nearest.y + nearest.size + 10);
      if (path) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.state = 'moving';
      }
    }
  }

  handleBuild(unit, dt) {
    const target = unit.buildTarget;
    if (!target || target.buildProgress >= 1) {
      unit.buildTarget = null;
      unit.state = 'idle';
      return;
    }

    const dist = Math.hypot(target.x - unit.x, target.y - unit.y);
    if (dist > target.size + 30) {
      const path = this.pathfinding.findPath(unit.x, unit.y, target.x, target.y + target.size + 10);
      if (path) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.state = 'moving';
      }
      return;
    }

    const buildSpeed = unit.faction?.bonuses?.buildSpeed || 1;
    target.buildProgress += (dt / target.buildTime) * buildSpeed;
    target.hp = Math.floor(target.maxHp * Math.min(1, target.buildProgress));

    if (target.buildProgress >= 1) {
      target.buildProgress = 1;
      target.hp = target.maxHp;
      unit.buildTarget = null;
      unit.state = 'idle';
      this.gs.recalcSupply();
    }
  }

  handleIdle(unit, dt) {
    // Auto-attack nearby enemies
    if (unit.attackDamage > 0 && !unit.canHarvest) {
      const enemies = this.gs.units.filter(u => u.owner !== unit.owner);
      const enemyBuildings = this.gs.buildings.filter(b => b.owner !== unit.owner);
      const allTargets = [...enemies, ...enemyBuildings];

      let closest = null;
      let closestDist = unit.attackRange * 1.2;

      for (const t of allTargets) {
        const d = Math.hypot(t.x - unit.x, t.y - unit.y);
        if (d < closestDist) {
          closestDist = d;
          closest = t;
        }
      }

      if (closest) {
        unit.attackTarget = closest;
        unit.state = 'attacking';
      }
    }
  }

  updateBuildings(dt) {
    for (const building of [...this.gs.buildings]) {
      if (building.hp <= 0) {
        this.renderer?.addParticle(building.x, building.y, building.faction?.colors?.primary || '#ff0', 20);
        this.gs.removeBuilding(building);
        continue;
      }

      if (building.buildProgress < 1) continue;

      // Turret attack
      if (building.attackDamage) {
        building.attackCooldownTimer = Math.max(0, building.attackCooldownTimer - dt);

        const enemies = [...this.gs.units, ...this.gs.buildings].filter(
          e => e.owner !== building.owner && e.hp > 0
        );

        let closest = null;
        let closestDist = building.attackRange;

        for (const e of enemies) {
          const d = Math.hypot(e.x - building.x, e.y - building.y);
          if (d < closestDist) {
            closestDist = d;
            closest = e;
          }
        }

        if (closest && building.attackCooldownTimer <= 0) {
          building.angle = Math.atan2(closest.y - building.y, closest.x - building.x);
          this.gs.createProjectile(
            building.x, building.y,
            closest.x, closest.y,
            building.attackDamage,
            building.faction?.colors?.glow || '#ff4444',
            building.owner,
          );
          building.attackCooldownTimer = building.attackCooldown;
        }
      }

      // Production
      if (building.productionQueue.length > 0) {
        const producing = building.productionQueue[0];
        const faction = building.faction;
        const buildSpeed = faction?.bonuses?.buildSpeed || 1;
        building.productionTimer += dt * buildSpeed;

        const unitType = building.productionQueue[0];
        const template = UNIT_TYPES[unitType];

        if (template && building.productionTimer >= template.buildTime) {
          const rallyX = building.rallyPoint?.x || building.x;
          const rallyY = building.rallyPoint?.y || building.y + building.size + 20;
          this.gs.createUnit(unitType, building.x, building.y + building.size + 10, building.owner);

          building.productionQueue.shift();
          building.productionTimer = 0;
        }
      }
    }
  }

  updateProjectiles(dt) {
    for (let i = this.gs.projectiles.length - 1; i >= 0; i--) {
      const p = this.gs.projectiles[i];
      p.trail = { x: p.x, y: p.y };
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.traveled += Math.hypot(p.vx * dt, p.vy * dt);

      // Check if reached target area
      const distToTarget = Math.hypot(p.targetX - p.x, p.targetY - p.y);

      if (distToTarget < 10 || p.traveled > p.maxDist) {
        // Deal damage
        const targets = [...this.gs.units, ...this.gs.buildings].filter(
          t => t.owner !== p.owner && t.hp > 0
        );

        if (p.splash > 0) {
          for (const t of targets) {
            const d = Math.hypot(t.x - p.x, t.y - p.y);
            if (d < p.splash) {
              const falloff = 1 - d / p.splash;
              t.hp -= Math.floor(p.damage * falloff);
            }
          }
          this.renderer?.addParticle(p.x, p.y, p.color, 8);
        } else {
          // Direct hit to nearest target
          let closest = null;
          let closestDist = 20;
          for (const t of targets) {
            const d = Math.hypot(t.x - p.x, t.y - p.y);
            if (d < closestDist) {
              closestDist = d;
              closest = t;
            }
          }
          if (closest) {
            closest.hp -= p.damage;
            this.renderer?.addParticle(closest.x, closest.y, p.color, 4);
          }
        }

        this.gs.projectiles.splice(i, 1);
      }
    }
  }
}

