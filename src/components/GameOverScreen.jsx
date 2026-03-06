export default function GameOverScreen({ winner, onRestart }) {
  const isVictory = winner === 'player';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      background: isVictory
        ? 'radial-gradient(ellipse at center, rgba(0,50,30,0.95), rgba(0,10,5,0.98))'
        : 'radial-gradient(ellipse at center, rgba(50,0,0,0.95), rgba(10,0,0,0.98))',
      zIndex: 100,
      fontFamily: 'monospace',
    }}>
      <div style={{
        fontSize: 'clamp(36px, 8vw, 64px)',
        fontWeight: 'bold',
        color: isVictory ? '#00ff88' : '#ff4444',
        textShadow: `0 0 40px ${isVictory ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'}`,
        marginBottom: '16px',
        letterSpacing: '6px',
      }}>
        {isVictory ? '勝利' : '戰敗'}
      </div>
      <div style={{
        fontSize: '16px',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '40px',
      }}>
        {isVictory ? '敵方指揮中心已被摧毀！' : '你的指揮中心已被摧毀...'}
      </div>
      <button
        onClick={onRestart}
        style={{
          background: 'rgba(0,100,150,0.6)',
          border: '2px solid rgba(0,200,255,0.5)',
          borderRadius: '12px',
          padding: '14px 40px',
          color: '#00eeff',
          fontSize: '16px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '3px',
          touchAction: 'manipulation',
        }}
      >
        再來一局
      </button>
    </div>
  );
}
