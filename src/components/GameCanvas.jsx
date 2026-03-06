import { useRef, useEffect, useCallback, useState } from 'react';
import { GameLoop } from '../engine/GameLoop.js';
import { Camera } from '../engine/Camera.js';
import { Renderer } from '../engine/Renderer.js';
import { Pathfinding } from '../engine/Pathfinding.js';
import { GameState } from '../game/GameState.js';
import { GameUpdater } from '../game/GameUpdater.js';
import { AIController } from '../game/AIController.js';
import { InputHandler } from '../game/InputHandler.js';
import { BUILDING_TYPES } from '../game/buildings/buildingTypes.js';
import { UNIT_TYPES } from '../game/units/unitTypes.js';
import HUD from './HUD.jsx';

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 2400;

export default function GameCanvas({ playerFaction, enemyFaction, onGameOver }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [hudState, setHudState] = useState({
    resources: { crystal: 400, gas: 100 },
    supply: { used: 0, max: 10 },
    selectedUnits: [],
    selectedBuilding: null,
    gameTime: 0,
  });

  const updateHUD = useCallback(() => {
    if (!gameRef.current) return;
    const gs = gameRef.current.gameState;

    setHudState({
      resources: { ...gs.resources.player },
      supply: { ...gs.supply.player },
      selectedUnits: gs.getSelectedUnits().map(u => ({
        id: u.id, type: u.type, name: u.name,
        hp: u.hp, maxHp: u.maxHp, state: u.state,
      })),
      selectedBuilding: (() => {
        const b = gs.getSelectedBuilding();
        if (!b) return null;
        return {
          id: b.id, type: b.type, name: b.name,
          hp: b.hp, maxHp: b.maxHp,
          buildProgress: b.buildProgress,
          produces: b.produces,
          productionQueue: [...b.productionQueue],
        };
      })(),
      gameTime: gs.gameTime,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameRef.current) {
        gameRef.current.camera.resize(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Initialize game systems
    const camera = new Camera(MAP_WIDTH, MAP_HEIGHT);
    camera.resize(canvas.width, canvas.height);

    const renderer = new Renderer(canvas, camera);
    const pathfinding = new Pathfinding(MAP_WIDTH, MAP_HEIGHT, 32);
    const gameState = new GameState(MAP_WIDTH, MAP_HEIGHT, playerFaction, enemyFaction);
    gameState.init();

    // Block obstacles in pathfinding
    for (const t of gameState.terrain) {
      if (t.type === 'obstacle') {
        pathfinding.setBlocked(t.x, t.y, t.w, t.h);
      }
    }

    const gameUpdater = new GameUpdater(gameState, pathfinding, renderer);
    const aiController = new AIController(gameState, pathfinding);
    const inputHandler = new InputHandler(canvas, camera, gameState, pathfinding, gameUpdater);

    // Center camera on player HQ
    camera.centerOn(150, 150);

    let hudTimer = 0;

    const gameLoop = new GameLoop(
      (dt) => {
        gameUpdater.update(dt);
        aiController.update(dt);

        hudTimer += dt;
        if (hudTimer > 0.2) {
          hudTimer = 0;
          updateHUD();

          if (gameState.gameOver) {
            onGameOver(gameState.winner);
          }
        }
      },
      () => {
        renderer.clear();
        renderer.drawGrid();
        renderer.drawTerrain(gameState.terrain);

        for (const building of gameState.buildings) {
          renderer.drawBuilding(building);
        }
        for (const unit of gameState.units) {
          renderer.drawUnit(unit);
        }
        for (const proj of gameState.projectiles) {
          renderer.drawProjectile(proj);
        }

        renderer.updateAndDrawParticles(1 / 60);
        renderer.drawSelectionBox(inputHandler.selectionBox);

        // Build preview
        if (inputHandler.buildMode && inputHandler.buildPreview) {
          const ctx = renderer.ctx;
          const cam = camera;
          const sx = (inputHandler.buildPreview.x - cam.x) * cam.zoom;
          const sy = (inputHandler.buildPreview.y - cam.y) * cam.zoom;
          ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(sx - 30, sy - 30, 60, 60);
          ctx.setLineDash([]);
        }

        // Minimap
        const mmSize = Math.min(130, canvas.width * 0.22);
        renderer.drawMinimap(gameState, {
          x: canvas.width - mmSize - 8,
          y: canvas.height - mmSize - 60,
          w: mmSize,
          h: mmSize,
        });
      },
    );

    gameRef.current = { gameState, camera, renderer, pathfinding, gameUpdater, aiController, inputHandler, gameLoop };
    gameLoop.start();

    return () => {
      gameLoop.stop();
      inputHandler.destroy();
      window.removeEventListener('resize', resize);
    };
  }, [playerFaction, enemyFaction, onGameOver, updateHUD]);

  const handleCommand = useCallback((cmd, data) => {
    if (!gameRef.current) return;
    const { gameState, inputHandler, pathfinding } = gameRef.current;

    switch (cmd) {
      case 'build': {
        // BUILDING_TYPES imported at top
        const template = BUILDING_TYPES[data.type];
        if (!template) break;

        const faction = gameState.playerFaction;
        const cost = {
          crystal: Math.floor(template.cost.crystal * (faction.bonuses.unitCost || 1)),
          gas: Math.floor(template.cost.gas * (faction.bonuses.unitCost || 1)),
        };

        if (!gameState.canAfford('player', cost)) break;
        gameState.spend('player', cost);

        // Place near HQ
        const hq = gameState.buildings.find(b => b.owner === 'player' && b.type === 'hq');
        if (!hq) break;
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 80;
        const bx = hq.x + Math.cos(angle) * dist;
        const by = hq.y + Math.sin(angle) * dist;

        const building = gameState.createBuilding(data.type, bx, by, 'player');

        // Assign worker
        const workers = gameState.units.filter(u =>
          u.owner === 'player' && u.type === 'worker' && u.canBuild &&
          (u.state === 'idle' || u.state === 'harvesting')
        );
        if (workers.length > 0) {
          const nearest = workers.reduce((a, b) =>
            Math.hypot(a.x - bx, a.y - by) < Math.hypot(b.x - bx, b.y - by) ? a : b
          );
          nearest.buildTarget = building;
          nearest.harvestTarget = null;
          const path = pathfinding.findPath(nearest.x, nearest.y, bx, by + template.size + 10);
          if (path) {
            nearest.path = path;
            nearest.pathIndex = 0;
            nearest.state = 'moving';
          } else {
            nearest.state = 'building';
          }
        }
        break;
      }
      case 'produce': {
        const building = gameState.getSelectedBuilding();
        if (!building || !building.produces.includes(data.type)) break;

        // UNIT_TYPES imported at top
        const template = UNIT_TYPES[data.type];
        if (!template) break;

        const faction = gameState.playerFaction;
        const cost = {
          crystal: Math.floor(template.cost.crystal * faction.bonuses.unitCost),
          gas: Math.floor(template.cost.gas * faction.bonuses.unitCost),
        };

        if (!gameState.canAfford('player', cost)) break;
        if (gameState.supply.player.used >= gameState.supply.player.max) break;

        gameState.spend('player', cost);
        building.productionQueue.push(data.type);
        break;
      }
      case 'harvest': {
        const selected = gameState.getSelectedUnits().filter(u => u.canHarvest);
        if (selected.length === 0) break;

        // Find nearest crystal
        const resources = gameState.terrain.filter(t => t.type === 'crystal' && t.remaining > 0);
        if (resources.length === 0) break;

        for (const worker of selected) {
          const nearest = resources.reduce((a, b) =>
            Math.hypot(a.x - worker.x, a.y - worker.y) <
            Math.hypot(b.x - worker.x, b.y - worker.y) ? a : b
          );
          worker.harvestTarget = nearest;
          worker.state = 'harvesting';
          worker.progress = 0;
          const path = pathfinding.findPath(worker.x, worker.y,
            nearest.x + nearest.w / 2, nearest.y + nearest.h / 2);
          if (path) {
            worker.path = path;
            worker.pathIndex = 0;
            worker.state = 'moving';
          }
        }
        break;
      }
      case 'speed': {
        gameRef.current.gameLoop.setSpeed(data.speed);
        break;
      }
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', touchAction: 'none' }}
      />
      <HUD
        state={hudState}
        onCommand={handleCommand}
      />
    </div>
  );
}
