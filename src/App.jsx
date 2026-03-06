import { useState, useCallback } from 'react';
import MainMenu from './components/MainMenu.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import GameOverScreen from './components/GameOverScreen.jsx';

function App() {
  const [screen, setScreen] = useState('menu'); // menu, game, gameover
  const [factions, setFactions] = useState({ player: 'terran', enemy: 'zyphorian' });
  const [winner, setWinner] = useState(null);

  const handleStart = useCallback((playerFaction, enemyFaction) => {
    setFactions({ player: playerFaction, enemy: enemyFaction });
    setScreen('game');
  }, []);

  const handleGameOver = useCallback((gameWinner) => {
    setWinner(gameWinner);
    setScreen('gameover');
  }, []);

  const handleRestart = useCallback(() => {
    setScreen('menu');
    setWinner(null);
  }, []);

  return (
    <>
      {screen === 'menu' && <MainMenu onStart={handleStart} />}
      {screen === 'game' && (
        <GameCanvas
          playerFaction={factions.player}
          enemyFaction={factions.enemy}
          onGameOver={handleGameOver}
        />
      )}
      {screen === 'gameover' && (
        <GameOverScreen winner={winner} onRestart={handleRestart} />
      )}
    </>
  );
}

export default App;
