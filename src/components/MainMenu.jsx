import { useState } from 'react';
import { FACTIONS } from '../game/factions/factions.js';

const containerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a14 70%)',
  fontFamily: 'monospace',
  overflow: 'hidden',
  position: 'relative',
};

const titleStyle = {
  fontSize: 'clamp(28px, 6vw, 52px)',
  fontWeight: 'bold',
  color: '#00eeff',
  textShadow: '0 0 30px rgba(0,200,255,0.5), 0 0 60px rgba(0,200,255,0.3)',
  marginBottom: '4px',
  letterSpacing: '4px',
  textAlign: 'center',
};

const subtitleStyle = {
  fontSize: 'clamp(12px, 2.5vw, 16px)',
  color: 'rgba(0,200,255,0.6)',
  marginBottom: '30px',
  textAlign: 'center',
};

export default function MainMenu({ onStart }) {
  const [selectedFaction, setSelectedFaction] = useState('terran');

  const factionList = Object.values(FACTIONS);

  const handleStart = () => {
    const enemies = factionList.filter(f => f.id !== selectedFaction);
    // Pick a deterministic opponent based on faction index
    const enemy = enemies[0];
    onStart(selectedFaction, enemy.id);
  };

  return (
    <div style={containerStyle}>
      {/* Animated grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        animation: 'gridScroll 20s linear infinite',
      }} />

      <h1 style={titleStyle}>STELLAR COMMAND</h1>
      <p style={subtitleStyle}>星際指揮官 — 行動即時戰略</p>

      <div style={{ marginBottom: '24px', zIndex: 1 }}>
        <p style={{ color: '#88aacc', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
          選擇你的陣營
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {factionList.map(faction => (
            <button
              key={faction.id}
              onClick={() => setSelectedFaction(faction.id)}
              style={{
                background: selectedFaction === faction.id
                  ? `rgba(${hexToRgb(faction.colors.primary)}, 0.3)`
                  : 'rgba(0,20,40,0.7)',
                border: `2px solid ${selectedFaction === faction.id ? faction.colors.primary : 'rgba(100,120,140,0.3)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                color: faction.colors.primary,
                cursor: 'pointer',
                width: 'clamp(140px, 28vw, 180px)',
                textAlign: 'center',
                fontFamily: 'monospace',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: '18px', fontWeight: 'bold', marginBottom: '4px',
                textShadow: `0 0 10px ${faction.colors.glow}`,
              }}>
                {faction.name}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                {faction.nameEn}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                {faction.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        style={{
          background: 'linear-gradient(135deg, rgba(0,150,200,0.8), rgba(0,100,180,0.8))',
          border: '2px solid rgba(0,200,255,0.6)',
          borderRadius: '12px',
          padding: '14px 48px',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '4px',
          textShadow: '0 0 10px rgba(0,200,255,0.5)',
          boxShadow: '0 0 30px rgba(0,150,255,0.3)',
          zIndex: 1,
          touchAction: 'manipulation',
        }}
      >
        開始作戰
      </button>

      <div style={{
        marginTop: '30px', color: 'rgba(255,255,255,0.25)',
        fontSize: '11px', textAlign: 'center', zIndex: 1,
      }}>
        支援觸控操作 — 拖曳平移 | 雙指縮放 | 點擊選取
      </div>

      <style>{`
        @keyframes gridScroll {
          from { transform: translate(0, 0); }
          to { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
