// components/TowerDefenseGame.js

import React, { useEffect, useRef, useState } from 'react';

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

// 塔類型定義
const towerTypes = {
  basic: { cost: 50, damage: 10, range: 100, color: 'blue', name: { en: 'Basic', zh: '基礎塔' }, accuracy: 0.8 },
  sniper: { cost: 100, damage: 30, range: 200, color: 'purple', name: { en: 'Sniper', zh: '狙擊塔' }, accuracy: 0.9 },
  splash: { cost: 150, damage: 20, range: 80, color: 'green', name: { en: 'Splash', zh: '範圍塔' }, accuracy: 0.7 },
};

// 定義遊戲對象類
class Tower {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.lastShot = 0;
  }

  canShoot(currentTime, gameSpeed) {
    return (currentTime - this.lastShot) > (1000 / gameSpeed);
  }

  shoot(currentTime) {
    this.lastShot = currentTime;
  }
}

class Enemy {
  constructor(x, y, health = 100) {
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.progress = 0;
  }

  isAlive() {
    return this.health > 0;
  }

  update(gameSpeed) {
    this.progress += 1 * gameSpeed;
    this.x = this.progress * 4;
  }

  reachedEnd() {
    return this.progress >= 100;
  }
}

class Projectile {
  constructor(x, y, targetX, targetY, damage, color) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.color = color;
  }

  update(gameSpeed) {
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

const TowerDefenseGame = () => {
  // 遊戲狀態
  const [gold, setGold] = useState(200);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [language, setLanguage] = useState('zh');
  const [gameSpeed, setGameSpeed] = useState(1);
  const [placingTower, setPlacingTower] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 翻譯函數
  const t = (key) => translations[language][key];

  // Canvas 引用
  const canvasRef = useRef(null);

  // 遊戲對象使用 Ref 管理
  const towersRef = useRef([]);
  const enemiesRef = useRef([]);
  const projectilesRef = useRef([]);
  const animationFrameId = useRef(null);

  // 添加塔
  const addTower = (x, y, type) => {
    const towerCost = towerTypes[type].cost;
    if (gold >= towerCost) {
      towersRef.current.push(new Tower(x, y, type));
      setGold(prev => prev - towerCost);
    }
    setPlacingTower(null);
  };

  // 生成敵人
  const spawnEnemy = () => {
    enemiesRef.current.push(new Enemy(0, 200));
  };

  // 處理 Canvas 點擊
  const handleCanvasClick = (event) => {
    if (placingTower) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      addTower(x, y, placingTower);
    }
  };

  // 處理鼠標移動
  const handleCanvasMouseMove = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  // 遊戲循環
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    const gameLoop = () => {
      // 清除畫布
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const currentTime = Date.now();

      // 更新敵人
      enemiesRef.current.forEach(enemy => enemy.update(gameSpeed));

      // 塔攻擊
      towersRef.current.forEach(tower => {
        const nearbyEnemy = enemiesRef.current.find(enemy =>
          Math.hypot(enemy.x - tower.x, enemy.y - tower.y) < towerTypes[tower.type].range && enemy.isAlive()
        );
        if (nearbyEnemy && tower.canShoot(currentTime, gameSpeed)) {
          if (Math.random() < towerTypes[tower.type].accuracy) { // 命中率檢查
            projectilesRef.current.push(new Projectile(
              tower.x,
              tower.y,
              nearbyEnemy.x,
              nearbyEnemy.y,
              towerTypes[tower.type].damage,
              towerTypes[tower.type].color
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
            Math.hypot(enemy.x - projectile.targetX, enemy.y - projectile.targetY) < 10 && enemy.isAlive()
          );
          if (hitEnemy) {
            hitEnemy.health -= projectile.damage;
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
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 10, 0, 2 * Math.PI);
          ctx.fill();

          // 渲染生命條
          ctx.fillStyle = 'grey';
          ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 5);
          ctx.fillStyle = 'green';
          ctx.fillRect(enemy.x - 15, enemy.y - 25, (enemy.health / enemy.maxHealth) * 30, 5);
        }
      });

      // 渲染子彈
      projectilesRef.current.forEach(projectile => {
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = projectile.color;
      });

      // 處理敵人生命和生命值
      const survivingEnemies = enemiesRef.current.filter(enemy => enemy.isAlive() && !enemy.reachedEnd());
      const defeatedEnemies = enemiesRef.current.length - survivingEnemies.length;
      enemiesRef.current = survivingEnemies;

      if (defeatedEnemies > 0) {
        setLives(prev => prev - defeatedEnemies);
        setGold(prev => prev + defeatedEnemies * 10);
      }

      if (defeatedEnemies > 0 && enemiesRef.current.length === 0) {
        setWave(prevWave => prevWave + 1);
        // 您可以在這裡根據新的波數生成更多敵人
        // spawnEnemy(); // 或其他邏輯
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
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText(`${t('gold')}: ${gold} | ${t('lives')}: ${lives} | ${t('wave')}: ${wave}`, 10, 20);


      // 檢查遊戲結束
      if (lives <= 0) {
        cancelAnimationFrame(animationFrameId.current);
        alert('Game Over!');
        // 重置遊戲或其他處理
      } else {
        animationFrameId.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId.current);
  }, [gold, lives, wave, gameSpeed, language, placingTower, mousePosition]);

  return (
    <div>
      <h1>{t('title')}</h1>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => setPlacingTower('basic')} disabled={gold < towerTypes.basic.cost}>
          {t('placeTower')} ({towerTypes.basic.name[language]}) - {t('gold')}: {towerTypes.basic.cost} | {t('accuracy')}: {(towerTypes.basic.accuracy * 100).toFixed(0)}%
        </button>
        <button onClick={() => setPlacingTower('sniper')} disabled={gold < towerTypes.sniper.cost}>
          {t('placeTower')} ({towerTypes.sniper.name[language]}) - {t('gold')}: {towerTypes.sniper.cost} | {t('accuracy')}: {(towerTypes.sniper.accuracy * 100).toFixed(0)}%
        </button>
        <button onClick={() => setPlacingTower('splash')} disabled={gold < towerTypes.splash.cost}>
          {t('placeTower')} ({towerTypes.splash.name[language]}) - {t('gold')}: {towerTypes.splash.cost} | {t('accuracy')}: {(towerTypes.splash.accuracy * 100).toFixed(0)}%
        </button>
        {placingTower && <button onClick={() => setPlacingTower(null)}>{t('cancel')}</button>}
      </div>
      <button onClick={spawnEnemy}>{t('spawnEnemy')}</button>
      <div style={{ margin: '10px 0' }}>
        <label htmlFor="language-select">{t('language')}: </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>
      <div style={{ margin: '10px 0' }}>
        <label htmlFor="speed-select">{t('speed')}: </label>
        <select
          id="speed-select"
          value={gameSpeed}
          onChange={(e) => setGameSpeed(Number(e.target.value))}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black', background: '#f0f0f0' }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      />
    </div>
  );
};

export default TowerDefenseGame;
