// src/components/TowerDefenseGame.tsx
"use client"; // 確保這是 Client Component

import React, { useCallback, useEffect, useRef, useState } from 'react';

// 翻譯資源
const translations = {
  en: {
    title: "Tower Defense Game",
    gold: "Gold",
    lives: "Lives",
    wave: "Wave",
    placeTower: "Place Tower",
    spawnEnemy: "Spawn Enemy",
    speed: "Speed",
    language: "Language",
    towerType: "Tower Type",
    cancel: "Cancel",
    accuracy: "Accuracy",
  },
  zh: {
    title: "塔防遊戲",
    gold: "金幣",
    lives: "生命值",
    wave: "波數",
    placeTower: "放置塔",
    spawnEnemy: "生成敵人",
    speed: "速度",
    language: "語言",
    towerType: "塔類型",
    cancel: "取消",
    accuracy: "命中率",
  },
};

// 塔類型定義，增加 element 屬性
interface TowerType {
  cost: number;
  damage: number;
  range: number;
  color: string;
  name: {
    en: string;
    zh: string;
  };
  accuracy: number; // 命中率
  attackSpeed: number; // 攻擊速度，以毫秒為單位
  element: string; // 元素類型
}

const towerTypes: { [key: string]: TowerType } = {
  basic: { 
    cost: 50, 
    damage: 10, 
    range: 100, 
    color: 'blue', 
    name: { en: 'Basic', zh: '基礎塔' }, 
    accuracy: 0.8, 
    attackSpeed: 1000, 
    element: 'fire', // 火元素
  },
  sniper: { 
    cost: 100, 
    damage: 30, 
    range: 200, 
    color: 'purple', 
    name: { en: 'Sniper', zh: '狙擊塔' }, 
    accuracy: 0.95, 
    attackSpeed: 1500, 
    element: 'ice', // 冰元素
  },
  splash: { 
    cost: 150, 
    damage: 20, 
    range: 80, 
    color: 'green', 
    name: { en: 'Splash', zh: '範圍塔' }, 
    accuracy: 0.7, 
    attackSpeed: 1200, 
    element: 'electric', // 電元素
  },
};

// 定義遊戲對象類
class Tower {
  x: number;
  y: number;
  type: string;
  lastShot: number;

  constructor(x: number, y: number, type: string) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.lastShot = 0;
  }

  canShoot(currentTime: number): boolean {
    const attackSpeed = towerTypes[this.type].attackSpeed;
    return (currentTime - this.lastShot) > attackSpeed;
  }

  shoot(currentTime: number): void {
    this.lastShot = currentTime;
  }
}

interface EnemyType {
  name: string;
  health: number;
  maxHealth: number;
  progress: number;
  resistances: { [key: string]: number }; // 元素抗性，減少傷害百分比
}

class Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  progress: number;
  resistances: { [key: string]: number };

  constructor(x: number, y: number, health: number = 300, resistances: { [key: string]: number } = {}) { // 增加初始血量
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.progress = 0;
    this.resistances = resistances;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  update(gameSpeed: number): void {
    this.progress += 1 * gameSpeed;
    this.x = this.progress * 4;
  }

  reachedEnd(): boolean {
    return this.progress >= 200; // 走完整個畫布（800px）
  }

  takeDamage(damage: number, element: string): void {
    const resistance = this.resistances[element] || 0;
    const effectiveDamage = damage * (1 - resistance);
    this.health -= effectiveDamage;
  }
}

class Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  color: string;
  element: string; // 元素類型

  constructor(x: number, y: number, targetX: number, targetY: number, damage: number, color: string, element: string) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.color = color;
    this.element = element;
  }

  update(gameSpeed: number): boolean {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) {
      return false; // 碰撞
    }
    this.x += (dx / distance) * 5 * gameSpeed;
    this.y += (dy / distance) * 5 * gameSpeed;
    return true; // 繼續存在
  }
}

const TowerDefenseGame: React.FC = () => {
  // 遊戲狀態
  const [gold, setGold] = useState<number>(200);
  const [lives, setLives] = useState<number>(20);
  const [language, setLanguage] = useState<string>('zh');
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [placingTower, setPlacingTower] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 使用 useCallback 記憶化翻譯函數
  const t = useCallback((key: string) => translations[language][key], [language]);

  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 遊戲對象使用 Ref 管理
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // 檢測色彩偏好
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 定義顏色配置
  const colorConfig = {
    light: {
      background: '#f0f0f0',
      enemy: 'red',
      towerRange: 'rgba(0, 0, 255, 0.3)',
      projectile: 'black',
      text: 'black',
      buttonBackground: '#0070f3',
      buttonHover: '#005bb5',
      buttonDisabled: '#999',
    },
    dark: {
      background: '#1e1e1e',
      enemy: '#ff5555',
      towerRange: 'rgba(0, 0, 255, 0.3)',
      projectile: '#ffffff',
      text: '#ffffff',
      buttonBackground: '#0d6efd',
      buttonHover: '#0b5ed7',
      buttonDisabled: '#555',
    },
  };

  // 添加塔
  const addTower = (x: number, y: number, type: string) => {
    const towerCost = towerTypes[type].cost;
    if (gold >= towerCost) {
      towersRef.current.push(new Tower(x, y, type));
      setGold(prev => prev - towerCost);
    }
    setPlacingTower(null);
  };

  // 生成敵人
  const spawnEnemy = () => {
    enemiesRef.current.push(new Enemy(0, 200, 300, {
      fire: 0.2, // 火元素抗性，減少20%傷害
      ice: 0.0, // 冰元素無抗性
      electric: 0.1, // 電元素抗性，減少10%傷害
    }));
  };

  // 處理 Canvas 點擊
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (placingTower && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      addTower(x, y, placingTower);
    }
  };

  // 處理鼠標移動
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  };

  // 遊戲循環
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // 清除畫布
      ctx.fillStyle = isDarkMode ? colorConfig.dark.background : colorConfig.light.background;
      ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

      const currentTime = Date.now();

      // 更新敵人
      enemiesRef.current.forEach(enemy => enemy.update(gameSpeed));

      // 塔攻擊
      towersRef.current.forEach(tower => {
        const nearbyEnemy = enemiesRef.current.find(enemy =>
          Math.hypot(enemy.x - tower.x, enemy.y - tower.y) < towerTypes[tower.type].range && enemy.isAlive()
        );
        if (nearbyEnemy && tower.canShoot(currentTime)) {
          if (Math.random() < towerTypes[tower.type].accuracy) { // 提高命中率
            projectilesRef.current.push(new Projectile(
              tower.x,
              tower.y,
              nearbyEnemy.x,
              nearbyEnemy.y,
              towerTypes[tower.type].damage,
              colorConfig[isDarkMode ? 'dark' : 'light'].projectile,
              towerTypes[tower.type].element // 傳遞元素
            ));
          }
          tower.shoot(currentTime);
        }
      });

      // 更新子彈
      projectilesRef.current = projectilesRef.current.filter(projectile => {
        const exists = projectile.update(gameSpeed);
        if (!exists) {
          // 查找命中的敵人
          const hitEnemy = enemiesRef.current.find(enemy =>
            Math.hypot(enemy.x - projectile.targetX, enemy.y - projectile.targetY) < 20 && enemy.isAlive() // 調整碰撞距離
          );
          if (hitEnemy) {
            hitEnemy.takeDamage(projectile.damage, projectile.element); // 根據元素計算傷害
          }
        }
        return exists;
      });

      // 渲染塔
      towersRef.current.forEach(tower => {
        ctx.fillStyle = towerTypes[tower.type].color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, 2 * Math.PI);
        ctx.fill();

        // 渲染攻擊範圍
        if (placingTower === null) { // 只有在非放置狀態下顯示範圍
          ctx.strokeStyle = towerTypes[tower.type].color;
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, towerTypes[tower.type].range, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });

      // 渲染敵人
      enemiesRef.current.forEach(enemy => {
        if (enemy.isAlive()) {
          ctx.fillStyle = colorConfig[isDarkMode ? 'dark' : 'light'].enemy;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 20, 0, 2 * Math.PI); // 增加半徑到 20
          ctx.fill();

          // 渲染生命條
          ctx.fillStyle = 'grey';
          ctx.fillRect(enemy.x - 15, enemy.y - 30, 30, 5); // 調整位置
          ctx.fillStyle = 'green';
          ctx.fillRect(enemy.x - 15, enemy.y - 30, (enemy.health / enemy.maxHealth) * 30, 5);
        }
      });

      // 渲染子彈
      projectilesRef.current.forEach(projectile => {
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 5, 0, 2 * Math.PI); // 增大子彈體積
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = projectile.color;
      });

      // 處理敵人生命和生命值
      const survivingEnemies = enemiesRef.current.filter(enemy => enemy.isAlive() && !enemy.reachedEnd());
      const defeatedEnemies = enemiesRef.current.length - survivingEnemies.length;
      enemiesRef.current = survivingEnemies;

      if (defeatedEnemies > 0) {
        setLives(prev => prev - defeatedEnemies); // 被擊敗的敵人減少生命值
        setGold(prev => prev + defeatedEnemies * 10); // 被擊敗的敵人增加金幣
      }

      // 渲染放置塔的範圍
      if (placingTower) {
        ctx.strokeStyle = towerTypes[placingTower].color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(mousePosition.x, mousePosition.y, towerTypes[placingTower].range, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 渲染遊戲信息
      ctx.fillStyle = colorConfig[isDarkMode ? 'dark' : 'light'].text;
      ctx.font = '16px Arial';
      ctx.fillText(`${t('gold')}: ${gold} | ${t('lives')}: ${lives}`, 10, 20);

      // 檢查遊戲結束
      if (lives <= 0) {
        cancelAnimationFrame(animationFrameId.current!);
        alert('Game Over!');
        // 重置遊戲或其他處理
      } else {
        animationFrameId.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gold, lives, gameSpeed, language, placingTower, mousePosition, t, isDarkMode]);

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: colorConfig[isDarkMode ? 'dark' : 'light'].text }}>{t('title')}</h1>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={() => setPlacingTower('basic')}
          disabled={gold < towerTypes.basic.cost}
          style={{
            backgroundColor: gold < towerTypes.basic.cost
              ? colorConfig[isDarkMode ? 'dark' : 'light'].buttonDisabled
              : colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            margin: '4px',
            cursor: gold < towerTypes.basic.cost ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseOver={(e) => {
            if (gold >= towerTypes.basic.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonHover;
            }
          }}
          onMouseOut={(e) => {
            if (gold >= towerTypes.basic.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground;
            }
          }}
        >
          {t('placeTower')} ({towerTypes.basic.name[language]}) - {t('gold')}: {towerTypes.basic.cost} | {t('accuracy')}: {(towerTypes.basic.accuracy * 100).toFixed(0)}%
        </button>
        <button
          onClick={() => setPlacingTower('sniper')}
          disabled={gold < towerTypes.sniper.cost}
          style={{
            backgroundColor: gold < towerTypes.sniper.cost
              ? colorConfig[isDarkMode ? 'dark' : 'light'].buttonDisabled
              : colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            margin: '4px',
            cursor: gold < towerTypes.sniper.cost ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseOver={(e) => {
            if (gold >= towerTypes.sniper.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonHover;
            }
          }}
          onMouseOut={(e) => {
            if (gold >= towerTypes.sniper.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground;
            }
          }}
        >
          {t('placeTower')} ({towerTypes.sniper.name[language]}) - {t('gold')}: {towerTypes.sniper.cost} | {t('accuracy')}: {(towerTypes.sniper.accuracy * 100).toFixed(0)}%
        </button>
        <button
          onClick={() => setPlacingTower('splash')}
          disabled={gold < towerTypes.splash.cost}
          style={{
            backgroundColor: gold < towerTypes.splash.cost
              ? colorConfig[isDarkMode ? 'dark' : 'light'].buttonDisabled
              : colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            margin: '4px',
            cursor: gold < towerTypes.splash.cost ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseOver={(e) => {
            if (gold >= towerTypes.splash.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonHover;
            }
          }}
          onMouseOut={(e) => {
            if (gold >= towerTypes.splash.cost) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground;
            }
          }}
        >
          {t('placeTower')} ({towerTypes.splash.name[language]}) - {t('gold')}: {towerTypes.splash.cost} | {t('accuracy')}: {(towerTypes.splash.accuracy * 100).toFixed(0)}%
        </button>
        {placingTower && <button onClick={() => setPlacingTower(null)} style={{
          backgroundColor: colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          margin: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
        }} onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonHover;
        }} onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground;
        }}>
          {t('cancel')}
        </button>}
      </div>
      <button
        onClick={spawnEnemy}
        style={{
          backgroundColor: colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          margin: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonHover;
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorConfig[isDarkMode ? 'dark' : 'light'].buttonBackground;
        }}
      >
        {t('spawnEnemy')}
      </button>
      <div style={{ margin: '10px 0', color: colorConfig[isDarkMode ? 'dark' : 'light'].text }}>
        <label htmlFor="language-select" style={{ marginRight: '8px' }}>{t('language')}:</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            backgroundColor: isDarkMode ? '#333' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '4px 8px',
          }}
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>
      <div style={{ margin: '10px 0', color: colorConfig[isDarkMode ? 'dark' : 'light'].text }}>
        <label htmlFor="speed-select" style={{ marginRight: '8px' }}>{t('speed')}:</label>
        <select
          id="speed-select"
          value={gameSpeed}
          onChange={(e) => setGameSpeed(Number(e.target.value))}
          style={{
            backgroundColor: isDarkMode ? '#333' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '4px 8px',
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black', background: isDarkMode ? colorConfig.dark.background : colorConfig.light.background }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      />
    </div>
  );
};

export default TowerDefenseGame;
