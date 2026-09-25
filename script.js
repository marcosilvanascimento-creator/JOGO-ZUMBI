// AGUARDAR O CARREGAMENTO
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Ajustar tamanho do Canvas
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ESTADO DO JOGO
  let gameState = 'MENU'; // MENU, PLAYING, SHOP, GAMEOVER
  let coins = parseInt(localStorage.getItem('zb_coins') || '0');
  let wave = 1;
  let score = 0;
  let keys = {};
  let mousePos = { x: 0, y: 0 };

  // TECLAS DE ATALHO & CONTROLES
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    // Pausa / Loja (P)
    if (e.key.toLowerCase() === 'p' && (gameState === 'PLAYING' || gameState === 'SHOP')) {
      toggleShop();
    }

    // Cheats de Dev
    if (gameState === 'PLAYING') {
      if (e.key === 'F9') addCoins(100);
      if (e.shiftKey && e.key === 'M') addCoins(500);
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
  });

  canvas.addEventListener('mousedown', () => {
    if (gameState === 'PLAYING') shoot();
  });

  // JOGADOR
  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 4,
    hp: 10,
    maxHp: 10,
    weaponLvl: 1,
    lastShot: 0,
    shotCooldown: 250, // ms
    color: '#3498db'
  };

  // POOLS DE ENTIDADES
  let bullets = [];
  let zombis = [];
  let particles = [];
  let drops = [];

  // ELEMENTOS DA INTERFACE (DOM)
  const startScreen = document.getElementById('start-screen');
  const shopScreen = document.getElementById('shop-screen');
  const endScreen = document.getElementById('end-screen');
  const hud = document.getElementById('hud');
  const hpCount = document.getElementById('hp-count');
  const waveNum = document.getElementById('wave-num');
  const coinsCount = document.getElementById('coins-count');
  const weaponLvlText = document.getElementById('weapon-lvl');
  const shopWeaponLvlText = document.getElementById('shop-weapon-lvl');

  // BOTOES
  document.getElementById('btn-start').onclick = startGame;
  document.getElementById('btn-resume').onclick = toggleShop;
  document.getElementById('btn-restart').onclick = startGame;
  document.getElementById('buy-weapon').onclick = upgradeWeapon;
  document.getElementById('buy-hp').onclick = buyHp;

  function addCoins(amount) {
    coins += amount;
    localStorage.setItem('zb_coins', coins);
    coinsCount.textContent = coins;
  }

  function startGame() {
    gameState = 'PLAYING';
    player.hp = player.maxHp;
    player.weaponLvl = 1;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    wave = 1;
    score = 0;
    bullets = [];
    zombis = [];
    particles = [];

    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    updateHUD();
    spawnWave();
    requestAnimationFrame(gameLoop);
  }

  function updateHUD() {
    hpCount.textContent = player.hp;
    waveNum.textContent = wave;
    coinsCount.textContent = coins;
    weaponLvlText.textContent = player.weaponLvl;
    shopWeaponLvlText.textContent = player.weaponLvl;
  }

  function toggleShop() {
    if (gameState === 'PLAYING') {
      gameState = 'SHOP';
      shopScreen.classList.remove('hidden');
    } else if (gameState === 'SHOP') {
      gameState = 'PLAYING';
      shopScreen.classList.add('hidden');
      requestAnimationFrame(gameLoop);
    }
  }

  function upgradeWeapon() {
    const cost = player.weaponLvl * 50;
    if (coins >= cost && player.weaponLvl < 30) {
      addCoins(-cost);
      player.weaponLvl++;
      updateHUD();
    }
  }

  function buyHp() {
    if (coins >= 30 && player.hp < player.maxHp) {
      addCoins(-30);
      player.hp = Math.min(player.maxHp, player.hp + 2);
      updateHUD();
    }
  }

  function spawnWave() {
    const count = 5 + wave * 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 400 + Math.random() * 300;
      zombis.push({
        x: player.x + Math.cos(angle) * dist,
        y: player.y + Math.sin(angle) * dist,
        radius: 18,
        speed: 1.5 + Math.random() * 0.8,
        hp: 2 + wave,
        maxHp: 2 + wave,
        color: '#2ecc71'
      });
    }
  }

  function shoot() {
    const now = Date.now();
    if (now - player.lastShot < player.shotCooldown) return;
    player.lastShot = now;

    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    const numBullets = 1 + Math.floor(player.weaponLvl / 5);

    for (let i = 0; i < numBullets; i++) {
      const spread = (i - (numBullets - 1) / 2) * 0.15;
      bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle + spread) * 10,
        vy: Math.sin(angle + spread) * 10,
        radius: 5,
        damage: 1 + Math.floor(player.weaponLvl * 0.8)
      });
    }
  }

  // LOOP PRINCIPAL
  function gameLoop() {
    if (gameState !== 'PLAYING') return;

    update();
    render();

    requestAnimationFrame(gameLoop);
  }

  function update() {
    // Mover Jogador
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;

    // Atualizar Projéteis
    bullets.forEach((b, i) => {
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        bullets.splice(i, 1);
      }
    });

    // Atualizar Zumbis
    zombis.forEach((z, zIdx) => {
      const angle = Math.atan2(player.y - z.y, player.x - z.x);
      z.x += Math.cos(angle) * z.speed;
      z.y += Math.sin(angle) * z.speed;

      // Colisão Zumbi x Jogador
      const distP = Math.hypot(player.x - z.x, player.y - z.y);
      if (distP < player.radius + z.radius) {
        player.hp -= 1;
        updateHUD();
        zombis.splice(zIdx, 1);

        if (player.hp <= 0) {
          gameOver();
        }
      }

      // Colisão Zumbi x Balas
      bullets.forEach((b, bIdx) => {
        const distB = Math.hypot(b.x - z.x, b.y - z.y);
        if (distB < b.radius + z.radius) {
          z.hp -= b.damage;
          bullets.splice(bIdx, 1);

          if (z.hp <= 0) {
            zombis.splice(zIdx, 1);
            addCoins(2);
            score += 10;
          }
        }
      });
    });

    // Checar Fim da Onda
    if (zombis.length === 0) {
      wave++;
      if (wave > 10) {
        victory();
      } else {
        updateHUD();
        spawnWave();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Jogador
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    // Desenhar Projéteis
    ctx.fillStyle = '#f1c40f';
    bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    });

    // Desenhar Zumbis
    zombis.forEach(z => {
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fillStyle = z.color;
      ctx.fill();
      ctx.closePath();
    });
  }

  function gameOver() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').textContent = 'GAME OVER';
    document.getElementById('end-stats').textContent = `Você sobreviveu até a Horda ${wave} | Pontuação: ${score}`;
  }

  function victory() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').textContent = 'VITÓRIA SENSACIONAL!';
    document.getElementById('end-stats').textContent = `Parabéns! Derrotou todas as hordas! Pontuação Final: ${score}`;
  }
});
