/**
 * Core game state manager
 */
import { UNIT_TYPES } from './units/unitTypes.js';
import { BUILDING_TYPES } from './buildings/buildingTypes.js';
import { FACTIONS } from './factions/factions.js';

let nextId = 1;

export class GameState {
  constructor(mapWidth, mapHeight, playerFaction, enemyFaction) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.units = [];
    this.buildings = [];
    this.projectiles = [];
    this.terrain = [];

    this.playerFaction = FACTIONS[playerFaction];
    this.enemyFaction = FACTIONS[enemyFaction];

    this.resources = {
      player: { crystal: 400, gas: 100 },
      enemy: { crystal: 400, gas: 100 },
    };

    this.supply = {
      player: { used: 0, max: 10 },
      enemy: { used: 0, max: 10 },
    };

    this.gameTime = 0;
    this.gameOver = false;
    this.winner = null;
  }

  init() {
    this.generateTerrain();
    this.spawnStartingUnits();
  }

  generateTerrain() {
    // Crystal patches (main resource)
    const crystalPositions = [
      { x: 200, y: 200 }, { x: 400, y: 150 },
      { x: this.mapWidth - 200, y: this.mapHeight - 200 },
      { x: this.mapWidth - 400, y: this.mapHeight - 150 },
      // Mid map resources
      { x: this.mapWidth / 2 - 100, y: this.mapHeight / 2 - 80 },
      { x: this.mapWidth / 2 + 100, y: this.mapHeight / 2 + 80 },
      { x: this.mapWidth / 2, y: 200 },
      { x: this.mapWidth / 2, y: this.mapHeight - 200 },
    ];

    for (const pos of crystalPositions) {
      this.terrain.push({
        type: 'crystal',
        x: pos.x, y: pos.y,
        w: 40, h: 40,
        remaining: 2000,
        maxRemaining: 2000,
      });
    }

    // Gas geysers
    const gasPositions = [
      { x: 300, y: 300 },
      { x: this.mapWidth - 300, y: this.mapHeight - 300 },
      { x: this.mapWidth / 2 - 200, y: this.mapHeight / 2 },
      { x: this.mapWidth / 2 + 200, y: this.mapHeight / 2 },
    ];

    for (const pos of gasPositions) {
      this.terrain.push({
        type: 'gas',
        x: pos.x, y: pos.y,
        w: 36, h: 36,
        remaining: 3000,
        maxRemaining: 3000,
      });
    }

    // Obstacles
    const numObstacles = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numObstacles; i++) {
      const ox = 200 + Math.random() * (this.mapWidth - 400);
      const oy = 200 + Math.random() * (this.mapHeight - 400);
      // Don't place on top of resources
      const tooClose = this.terrain.some(t =>
        Math.abs(t.x - ox) < 80 && Math.abs(t.y - oy) < 80
      );
      if (!tooClose) {
        this.terrain.push({
          type: 'obstacle',
          x: ox, y: oy,
          w: 32 + Math.random() * 64,
          h: 32 + Math.random() * 64,
        });
      }
    }
  }

  spawnStartingUnits() {
    // Player HQ and workers
    const playerHQ = this.createBuilding('hq', 150, 150, 'player');
    for (let i = 0; i < 4; i++) {
      this.createUnit('worker', 150 + (i - 2) * 30, 220, 'player');
    }

    // Enemy HQ and workers
    const enemyHQ = this.createBuilding('hq', this.mapWidth - 150, this.mapHeight - 150, 'enemy');
    for (let i = 0; i < 4; i++) {
      this.createUnit('worker', this.mapWidth - 150 + (i - 2) * 30, this.mapHeight - 220, 'enemy');
    }
  }

  createUnit(type, x, y, owner) {
    const template = UNIT_TYPES[type];
    if (!template) return null;

    const faction = owner === 'player' ? this.playerFaction : this.enemyFaction;
    const bonuses = faction.bonuses;

    const unit = {
      id: nextId++,
      ...template,
      x, y,
      owner,
      faction,
      hp: Math.floor(template.maxHp * bonuses.unitHp),
      maxHp: Math.floor(template.maxHp * bonuses.unitHp),
      selected: false,
      target: null,
      attackTarget: null,
      path: null,
      pathIndex: 0,
      attackCooldownTimer: 0,
      state: 'idle', // idle, moving, attacking, harvesting, building
      harvestTarget: null,
      carryingResource: null,
      carryingAmount: 0,
      angle: 0,
    };

    this.units.push(unit);
    this.recalcSupply();
    return unit;
  }

  createBuilding(type, x, y, owner) {
    const template = BUILDING_TYPES[type];
    if (!template) return null;

    const faction = owner === 'player' ? this.playerFaction : this.enemyFaction;

    const building = {
      id: nextId++,
      ...template,
      x, y,
      owner,
      faction,
      hp: type === 'hq' ? template.maxHp : Math.floor(template.maxHp * 0.1),
      maxHp: template.maxHp,
      selected: false,
      buildProgress: type === 'hq' ? 1 : 0,
      rallyPoint: { x: x, y: y + template.size + 30 },
      productionQueue: [],
      productionTimer: 0,
      angle: 0,
      attackCooldownTimer: 0,
    };

    this.buildings.push(building);
    this.recalcSupply();
    return building;
  }

  createProjectile(fromX, fromY, toX, toY, damage, color, owner, splash = 0) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const speed = 300;
    this.projectiles.push({
      id: nextId++,
      x: fromX, y: fromY,
      targetX: toX, targetY: toY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      color,
      owner,
      splash,
      trail: { x: fromX, y: fromY },
      maxDist: Math.hypot(toX - fromX, toY - fromY) + 10,
      traveled: 0,
    });
  }

  recalcSupply() {
    for (const owner of ['player', 'enemy']) {
      let maxSupply = 0;
      let usedSupply = 0;
      for (const b of this.buildings) {
        if (b.owner === owner && b.buildProgress >= 1) {
          maxSupply += b.providesSupply;
        }
      }
      for (const u of this.units) {
        if (u.owner === owner) usedSupply++;
      }
      this.supply[owner] = { used: usedSupply, max: maxSupply };
    }
  }

  canAfford(owner, cost) {
    const res = this.resources[owner];
    return res.crystal >= cost.crystal && res.gas >= cost.gas;
  }

  spend(owner, cost) {
    this.resources[owner].crystal -= cost.crystal;
    this.resources[owner].gas -= cost.gas;
  }

  getSelectedUnits() {
    return this.units.filter(u => u.selected && u.owner === 'player');
  }

  getSelectedBuilding() {
    return this.buildings.find(b => b.selected && b.owner === 'player');
  }

  deselectAll() {
    for (const u of this.units) u.selected = false;
    for (const b of this.buildings) b.selected = false;
  }

  removeUnit(unit) {
    const idx = this.units.indexOf(unit);
    if (idx >= 0) this.units.splice(idx, 1);
    this.recalcSupply();
  }

  removeBuilding(building) {
    const idx = this.buildings.indexOf(building);
    if (idx >= 0) this.buildings.splice(idx, 1);
    this.recalcSupply();

    // Check game over
    const playerHQs = this.buildings.filter(b => b.owner === 'player' && b.type === 'hq');
    const enemyHQs = this.buildings.filter(b => b.owner === 'enemy' && b.type === 'hq');

    if (playerHQs.length === 0) {
      this.gameOver = true;
      this.winner = 'enemy';
    } else if (enemyHQs.length === 0) {
      this.gameOver = true;
      this.winner = 'player';
    }
  }
}
