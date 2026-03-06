/**
 * Three sci-fi factions with unique aesthetics and bonuses
 *
 * Terran Alliance - Balanced human faction
 * Zyphorian Swarm - Fast, cheap, organic units
 * Nexar Collective - High-tech, expensive, powerful units
 */

export const FACTIONS = {
  terran: {
    id: 'terran',
    name: '泰拉聯盟',
    nameEn: 'Terran Alliance',
    description: '人類最後的聯合艦隊，平衡型陣營',
    colors: { primary: '#4488ff', secondary: '#2255aa', glow: '#66aaff' },
    bonuses: {
      buildSpeed: 1.0,
      unitCost: 1.0,
      unitHp: 1.1,
      harvestRate: 1.0,
      attackDamage: 1.0,
    },
  },
  zyphorian: {
    id: 'zyphorian',
    name: '澤弗蟲群',
    nameEn: 'Zyphorian Swarm',
    description: '有機生命體蟲群，數量壓制型陣營',
    colors: { primary: '#44dd44', secondary: '#228822', glow: '#66ff66' },
    bonuses: {
      buildSpeed: 1.3,
      unitCost: 0.75,
      unitHp: 0.85,
      harvestRate: 1.1,
      attackDamage: 0.9,
    },
  },
  nexar: {
    id: 'nexar',
    name: '奈薩集合體',
    nameEn: 'Nexar Collective',
    description: '超高科技AI文明，質量壓制型陣營',
    colors: { primary: '#dd44dd', secondary: '#882288', glow: '#ff66ff' },
    bonuses: {
      buildSpeed: 0.8,
      unitCost: 1.3,
      unitHp: 1.3,
      harvestRate: 0.9,
      attackDamage: 1.25,
    },
  },
};
