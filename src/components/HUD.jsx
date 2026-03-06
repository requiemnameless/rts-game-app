import { useState } from 'react';
import { BUILDING_TYPES } from '../game/buildings/buildingTypes.js';
import { UNIT_TYPES } from '../game/units/unitTypes.js';

const btnStyle = {
  background: 'rgba(0, 30, 60, 0.85)',
  border: '1px solid rgba(0, 200, 255, 0.4)',
  color: '#00eeff',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  minWidth: '60px',
  textAlign: 'center',
  touchAction: 'manipulation',
};

const btnActiveStyle = {
  ...btnStyle,
  background: 'rgba(0, 100, 150, 0.85)',
  border: '1px solid rgba(0, 255, 200, 0.7)',
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HUD({ state, onCommand }) {
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);

  const { resources, supply, selectedUnits, selectedBuilding, gameTime } = state;

  const buildOptions = Object.entries(BUILDING_TYPES).filter(([k]) => k !== 'hq');

  const handleBuild = (type) => {
    onCommand('build', { type });
    setShowBuildMenu(false);
  };

  const handleProduce = (type) => {
    onCommand('produce', { type });
  };

  const handleSpeed = (speed) => {
    setGameSpeed(speed);
    onCommand('speed', { speed });
  };

  return (
    <>
      {/* Top bar - Resources */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,10,30,0.92) 0%, rgba(0,10,30,0) 100%)',
        padding: '8px 12px',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: '16px', pointerEvents: 'auto' }}>
          <div style={{ color: '#00ccff', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: '#66ddff', fontSize: '11px' }}>晶礦</span>
            <br />
            {Math.floor(resources.crystal)}
          </div>
          <div style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: '#66ffaa', fontSize: '11px' }}>瓦斯</span>
            <br />
            {Math.floor(resources.gas)}
          </div>
          <div style={{ color: '#ffcc00', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: '#ffdd66', fontSize: '11px' }}>人口</span>
            <br />
            {supply.used}/{supply.max}
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}>
          {formatTime(gameTime)}
        </div>
      </div>

      {/* Speed controls */}
      <div style={{
        position: 'absolute', top: '8px', right: '8px',
        display: 'flex', gap: '4px',
      }}>
        {[1, 2, 3].map(s => (
          <button
            key={s}
            style={gameSpeed === s ? btnActiveStyle : btnStyle}
            onClick={() => handleSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Bottom panel - Commands */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(0deg, rgba(0,10,30,0.92) 0%, rgba(0,10,30,0) 100%)',
        padding: '8px 8px 12px',
      }}>
        {/* Selected info */}
        {selectedUnits.length > 0 && (
          <div style={{
            display: 'flex', gap: '6px', flexWrap: 'wrap',
            marginBottom: '6px', alignItems: 'center',
          }}>
            <span style={{ color: '#00eeff', fontFamily: 'monospace', fontSize: '12px' }}>
              {selectedUnits.length > 1
                ? `已選 ${selectedUnits.length} 單位`
                : `${selectedUnits[0].name} HP:${selectedUnits[0].hp}/${selectedUnits[0].maxHp}`
              }
            </span>
            {selectedUnits.some(u => u.type === 'worker') && (
              <button style={btnStyle} onClick={() => onCommand('harvest')}>
                採集
              </button>
            )}
          </div>
        )}

        {selectedBuilding && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#00eeff', fontFamily: 'monospace', fontSize: '12px' }}>
              {selectedBuilding.name} HP:{selectedBuilding.hp}/{selectedBuilding.maxHp}
              {selectedBuilding.buildProgress < 1 && ` (建造中 ${Math.floor(selectedBuilding.buildProgress * 100)}%)`}
            </span>
            {selectedBuilding.buildProgress >= 1 && selectedBuilding.produces.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                {selectedBuilding.produces.map(unitType => {
                  const ut = UNIT_TYPES[unitType];
                  return (
                    <button
                      key={unitType}
                      style={btnStyle}
                      onClick={() => handleProduce(unitType)}
                    >
                      {ut.name}
                      <br />
                      <span style={{ fontSize: '9px', color: '#88bbcc' }}>
                        💎{ut.cost.crystal} {ut.cost.gas > 0 ? `⛽${ut.cost.gas}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedBuilding.productionQueue.length > 0 && (
              <div style={{ color: '#ffcc00', fontFamily: 'monospace', fontSize: '11px', marginTop: '4px' }}>
                生產中: {selectedBuilding.productionQueue.map(t => UNIT_TYPES[t]?.name || t).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Build buttons */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            style={showBuildMenu ? btnActiveStyle : btnStyle}
            onClick={() => setShowBuildMenu(!showBuildMenu)}
          >
            🏗 建造
          </button>
        </div>

        {/* Build menu */}
        {showBuildMenu && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '4px',
            marginTop: '6px',
            padding: '8px',
            background: 'rgba(0, 20, 40, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 200, 255, 0.3)',
          }}>
            {buildOptions.map(([key, bt]) => (
              <button
                key={key}
                style={btnStyle}
                onClick={() => handleBuild(key)}
              >
                {bt.name}
                <br />
                <span style={{ fontSize: '9px', color: '#88bbcc' }}>
                  💎{bt.cost.crystal} {bt.cost.gas > 0 ? `⛽${bt.cost.gas}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
