/**
 * AI opponent controller with difficulty scaling
 */
import { UNIT_TYPES } from './units/unitTypes.js';
import { BUILDING_TYPES } from './buildings/buildingTypes.js';

export class AIController {
  constructor(gameState, pathfinding) {
    this.gs = gameState;
    this.pathfinding = pathfinding;
    this.nextThinkTime = 5;
    this.thinkInterval = 3;
    this.phase = 'early'; // early, mid, late
    this.attackWaveTimer = 60;
    this.harvestAssigned = false;
  }

  update(dt) {
    this.nextThinkTime -= dt;
    this.attackWaveTimer -= dt;

    if (this.nextThinkTime <= 0) {
      this.think();
      this.nextThinkTime = this.thinkInterval;
    }

    // Periodic attack waves
    if (this.attackWaveTimer <= 0) {
      this.launchAttack();
      this.attackWaveTimer = 45 + Math.random() * 30;
    }
  }

  think() {
    const res = this.gs.resources.enemy;
    const supply = this.gs.supply.enemy;
    const buildings = this.gs.buildings.filter(b => b.owner === 'enemy');
    const units = this.gs.units.filter(u => u.owner === 'enemy');

    // Update phase
    if (this.gs.gameTime > 180) this.phase = 'late';
    else if (this.gs.gameTime > 90) this.phase = 'mid';

    // Assign idle workers to harvest
    this.assignWorkers(units);

    // Build supply if needed
    if (supply.used >= supply.max - 2 && supply.max < 50) {
      this.tryBuild('supply', buildings);
    }

    // Build order
    const hasBarracks = buildings.some(b => b.type === 'barracks' && b.buildProgress >= 1);
    const hasFactory = buildings.some(b => b.type === 'factory' && b.buildProgress >= 1);
    const hasRefinery = buildings.some(b => b.type === 'refinery' && b.buildProgress >= 1);

    if (!hasRefinery && res.crystal >= 100) {
      this.tryBuild('refinery', buildings);
    }

    if (!hasBarracks && res.crystal >= 150) {
      this.tryBuild('barracks', buildings);
    }

    if (this.phase !== 'early' && !hasFactory && res.crystal >= 300 && res.gas >= 150) {
      this.tryBuild('factory', buildings);
    }

    // Produce units
    const workerCount = units.filter(u => u.type === 'worker').length;
    if (workerCount < 6) {
      this.tryProduce('hq', 'worker', buildings);
    }

    if (hasBarracks) {
      this.tryProduce('barracks', 'soldier', buildings);
    }

    if (hasFactory && this.phase !== 'early') {
      this.tryProduce('factory', 'tank', buildings);
    }

    // Build turrets near base
    if (this.phase !== 'early' && res.crystal >= 100 && res.gas >= 50) {
      const turretCount = buildings.filter(b => b.type === 'turret').length;
      if (turretCount < 3) {
        this.tryBuild('turret', buildings);
      }
    }
  }

  assignWorkers(units) {
    const workers = units.filter(u => u.type === 'worker' && u.state === 'idle' && !u.carryingResource);

    for (const worker of workers) {
      // Find nearest resource
      const resources = this.gs.terrain.filter(t =>
        (t.type === 'crystal' || t.type === 'gas') && t.remaining > 0
      );

      if (resources.length === 0) continue;

      const nearest = resources.reduce((a, b) =>
        Math.hypot(a.x - worker.x, a.y - worker.y) <
        Math.hypot(b.x - worker.x, b.y - worker.y) ? a : b
      );

      worker.harvestTarget = nearest;
      worker.state = 'harvesting';
      worker.progress = 0;
    }

    // Also handle workers carrying resources
    const returners = units.filter(u => u.type === 'worker' && u.state === 'idle' && u.carryingResource);
    for (const w of returners) {
      w.state = 'returning';
    }
  }

  tryBuild(type, buildings) {
    const template = BUILDING_TYPES[type];
    const faction = this.gs.enemyFaction;
    const cost = {
      crystal: template.cost.crystal * (faction.bonuses.unitCost || 1),
      gas: template.cost.gas * (faction.bonuses.unitCost || 1),
    };

    if (!this.gs.canAfford('enemy', cost)) return;

    // Find HQ position for building near base
    const hq = buildings.find(b => b.type === 'hq');
    if (!hq) return;

    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    const bx = hq.x + Math.cos(angle) * dist;
    const by = hq.y + Math.sin(angle) * dist;

    // Check bounds
    if (bx < 50 || by < 50 || bx > this.gs.mapWidth - 50 || by > this.gs.mapHeight - 50) return;

    this.gs.spend('enemy', cost);
    const building = this.gs.createBuilding(type, bx, by, 'enemy');

    // Assign a worker to build
    const workers = this.gs.units.filter(u => u.owner === 'enemy' && u.type === 'worker' && u.canBuild);
    if (workers.length > 0) {
      const w = workers[0];
      w.buildTarget = building;
      w.state = 'building';
      const path = this.pathfinding.findPath(w.x, w.y, bx, by + template.size + 10);
      if (path) {
        w.path = path;
        w.pathIndex = 0;
        w.state = 'moving';
      }
    } else {
      // Auto-build if no workers
      building.buildProgress = 0.5;
      building.hp = Math.floor(building.maxHp * 0.5);
    }
  }

  tryProduce(buildingType, unitType, buildings) {
    const template = UNIT_TYPES[unitType];
    const faction = this.gs.enemyFaction;
    const cost = {
      crystal: Math.floor(template.cost.crystal * faction.bonuses.unitCost),
      gas: Math.floor(template.cost.gas * faction.bonuses.unitCost),
    };

    if (!this.gs.canAfford('enemy', cost)) return;
    if (this.gs.supply.enemy.used >= this.gs.supply.enemy.max) return;

    const producer = buildings.find(b =>
      b.type === buildingType && b.buildProgress >= 1 && b.productionQueue.length < 3
    );

    if (producer) {
      this.gs.spend('enemy', cost);
      producer.productionQueue.push(unitType);
    }
  }

  launchAttack() {
    const soldiers = this.gs.units.filter(u =>
      u.owner === 'enemy' && u.type !== 'worker' && u.state === 'idle'
    );

    if (soldiers.length < 3) return;

    // Find player targets
    const playerBuildings = this.gs.buildings.filter(b => b.owner === 'player');
    const playerUnits = this.gs.units.filter(u => u.owner === 'player');

    let target = null;
    if (playerBuildings.length > 0) {
      target = playerBuildings[Math.floor(Math.random() * playerBuildings.length)];
    } else if (playerUnits.length > 0) {
      target = playerUnits[0];
    }

    if (!target) return;

    for (const soldier of soldiers) {
      soldier.attackTarget = target;
      soldier.state = 'attacking';
      const path = this.pathfinding.findPath(soldier.x, soldier.y, target.x, target.y);
      if (path) {
        soldier.path = path;
        soldier.pathIndex = 0;
        soldier.state = 'moving';
      }
    }
  }
}
