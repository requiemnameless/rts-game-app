# Galactic Command — 行動科幻即時戰略遊戲

一款基於 React + Canvas 2D 的行動端科幻即時戰略遊戲，支援觸控操作與三大非對稱陣營。

## 遊戲特色

- **三大陣營**，各有獨特加成與配色：
  - **泰拉聯盟** (Terran Alliance) — 藍色系，平衡型
  - **澤弗蟲群** (Zyphorian Swarm) — 綠色系，量產快攻型（建造快 30%、造價低 25%）
  - **奈薩集合體** (Nexar Collective) — 紫色系，高科技重裝型（攻擊強 25%、血量高 30%）
- **4 種單位**：工程兵、突擊兵、重甲戰車、戰鬥機
- **7 種建築**：指揮中心、軍營、重工廠、星港、精煉廠、補給站、防禦砲塔
- **雙資源系統**：晶礦 + 瓦斯，搭配人口上限機制
- **AI 對手**：三階段策略（早期、中期、後期），自動採集、建造、組隊進攻
- **觸控 / 滑鼠雙支援**：框選、長按、雙指縮放、右鍵指令

## 技術架構

```
src/
├── components/       # React UI
│   ├── MainMenu.jsx      # 主選單與陣營選擇
│   ├── GameCanvas.jsx     # 遊戲主畫面 (Canvas 2D)
│   ├── HUD.jsx            # 資源列、指令面板、建造選單
│   └── GameOverScreen.jsx # 勝敗結算畫面
├── engine/           # 引擎核心
│   ├── GameLoop.js        # 固定 30 FPS 更新迴圈
│   ├── Camera.js          # 視角平移 / 縮放 (0.3x–2.5x)
│   ├── Renderer.js        # Canvas 2D 渲染、粒子特效、小地圖
│   └── Pathfinding.js     # A* 尋路 (32px 格網)
├── game/             # 遊戲邏輯
│   ├── GameState.js       # 全局狀態管理、勝負判定
│   ├── GameUpdater.js     # 單位狀態機、戰鬥、採集、建造
│   ├── AIController.js    # 敵方 AI 策略
│   ├── InputHandler.js    # 觸控 / 滑鼠輸入處理
│   ├── factions/          # 陣營定義
│   ├── units/             # 單位模板
│   └── buildings/         # 建築模板
└── utils/            # 工具函式
```

## 快速開始

```bash
npm install
npm run dev       # 開發模式，預設 http://localhost:5173
npm run build     # 正式建置 (輸出至 dist/)
npm run preview   # 預覽正式建置版本
npm run lint      # ESLint 檢查
```

## 操作方式

| 操作 | 觸控 | 滑鼠 |
|------|------|------|
| 選取單位 | 點擊 | 左鍵點擊 |
| 框選多單位 | 拖曳 | 左鍵拖曳 |
| 移動 / 攻擊 | 長按目的地 | 右鍵點擊 |
| 平移視角 | 單指拖曳 | 左鍵拖曳空白處 |
| 縮放 | 雙指捏合 | 滾輪 |

## 技術棧

- **React 19** + **Vite 7** — 前端框架與建置工具
- **Canvas 2D** — 遊戲渲染
- **A* Pathfinding** — 尋路演算法
- **純 JavaScript** — 無額外遊戲引擎依賴
