/* =========================================
   Zumbis Bobos 5.0 — lógica do jogo
   ========================================= */

(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    document.body.innerHTML = "<p style=\"color:#fff;padding:20px\">Erro: canvas não encontrado. Extraia o zip e abra o index.html.</p>";
    return;
  }
  const ctx = canvas.getContext("2d");
  const elMensagem = document.getElementById("mensagem");
  const elGameOver = document.getElementById("gameOverBox");
  const elVitoria = document.getElementById("vitoriaBox");
  const elIntro = document.getElementById("introBox");
  const elExplica = document.getElementById("explicaBox");
  const elBossBar = document.getElementById("bossBar");
  const elBossNome = document.getElementById("bossNome");
  const elBossVida = document.getElementById("bossVida");
  const elHistoria = document.getElementById("historiaBox");
  const elHistoriaTitulo = document.getElementById("historiaTitulo");
  const elHistoriaTexto = document.getElementById("historiaTexto");
  const elHistoriaBarra = document.getElementById("historiaBarra");
  let historiaTimer = null;

  const MAPA = { largura: 2600, altura: 1800 };
  const FISICA_OK = typeof Matter !== "undefined";
  let engine = null;
  let mundo = null;

  const DIFICULDADES = {
    facil: { nome: "Fácil", vida: 12, zumbis: 0.7, velocidade: 0.82, chefe: 0.7, spawn: 1.25, texto: "Menos zumbis, chefões mais fracos e mais vida." },
    medio: { nome: "Médio", vida: 10, zumbis: 1, velocidade: 1, chefe: 1, spawn: 1, texto: "O desafio normal do jogo." },
    dificil: { nome: "Difícil", vida: 8, zumbis: 1.35, velocidade: 1.18, chefe: 1.4, spawn: 0.8, texto: "Mais zumbis, mais rápidos e chefões bem resistentes." },
    bgl: { nome: "O BGL", vida: 6, zumbis: 1.8, velocidade: 1.35, chefe: 1.9, spawn: 0.62, texto: "Modo doido: enxame enorme, chefões duros e pouca vida." }
  };
    return {
      x: Math.max(m, Math.min(MAPA.largura - m, x)),
      y: Math.max(m, Math.min(MAPA.altura - m, y))
    };
  }

  function pontoPertoDoJogador(distMin, distMax) {
    const min = distMin || 170;
    const max = distMax || 250;
    const ang = Math.random() * Math.PI * 2;
    const dist = min + Math.random() * Math.max(20, max - min);
    return limitarNoMapa(
      jogador.x + Math.cos(ang) * dist,
      jogador.y + Math.sin(ang) * dist,
      50
    );
  }

  function pontoAleatorioBorda(folga) {
    return pontoPertoDoJogador(240, 330);
  }

  function pontoNoMapa() {
    return {
      x: 80 + Math.random() * (MAPA.largura - 160),
      y: 80 + Math.random() * (MAPA.altura - 160)
    };
  }

  const MAX_PARTICULAS = 280;

  function limitarParticulas() {
    if (particulas.length > MAX_PARTICULAS) {
      particulas.splice(0, particulas.length - MAX_PARTICULAS);
    }
  }

  function criarParticulas(x, y, cor, opcoes = {}) {
    if (estado.config && estado.config.particulas === false) return;
    let qtd = opcoes.qtd || 12;
    if (estado.config && estado.config.qualidade === "baixa") qtd = Math.ceil(qtd * 0.4);
    else if (estado.config && estado.config.qualidade === "media") qtd = Math.ceil(qtd * 0.7);
    const forca = opcoes.forca || 7;
    const vida = opcoes.vida || 32;
    const tamanho = opcoes.tamanho || 3;
    const tipo = opcoes.tipo || "faisca";
    const gravidade = opcoes.gravidade || 0;
    for (let i = 0; i < qtd; i++) {
      const ang = opcoes.angulo != null ? opcoes.angulo + (Math.random() - 0.5) * 0.6 : Math.random() * Math.PI * 2;
      const vel = forca * (0.35 + Math.random());
      particulas.push({
        x, y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida,
        vidaMax: vida,
        cor,
        tamanho: tamanho * (0.6 + Math.random()),
        tipo,
        gravidade
      });
    }
    limitarParticulas();
  }

  function mostrarDano(x, y, valor, cor) {
    if (estado.config && estado.config.dano === false) return;
    danos.push({ x, y, valor: "-" + valor, vida: 40, cor: cor || "#ff5252" });
    if (estado.config && estado.config.flash === false) return;
    const wrap = document.querySelector(".canvas-wrap");
    if (wrap) {
      wrap.classList.remove("hit");
      void wrap.offsetWidth;
      wrap.classList.add("hit");
    }
  }

  function explosao(x, y, cor) {
    criarParticulas(x, y, cor, { qtd: 16, forca: 8, tipo: "faisca", vida: 28, tamanho: 3 });
    criarParticulas(x, y, "#ffffff", { qtd: 6, forca: 4, tipo: "brilho", vida: 18, tamanho: 5 });
  }

  function respingoDano(x, y, forte) {
    const qtd = forte ? 22 : 12;
    criarParticulas(x, y, "#c62828", { qtd: qtd, forca: forte ? 9 : 6, tipo: "sangue", vida: 34, tamanho: 3.4, gravidade: 0.12 });
    criarParticulas(x, y, "#ef5350", { qtd: 8, forca: 4, tipo: "brilho", vida: 16, tamanho: 4 });
  }

  function abrirExplicacao() {
    fechar(elIntro);
    abrir(elExplica);
  }

  function voltarIntro() {
    fechar(elExplica);
    if (elIntro) elIntro.style.display = "";
    abrir(elIntro);
  }

  const HERO_STATS = {
    "Rick Grimes": { vida: 80, poder: 70, abs: ["Tiro firme", "Liderança", "Resiste mais um pouco"] },
    "Daryl Dixon": { vida: 70, poder: 85, abs: ["Tiro preciso", "Rastro no mapa", "Corre atrás do alvo"] },
    "Michonne": { vida: 75, poder: 80, abs: ["Golpe rápido", "Defesa curta", "Empurra o grupo"] },
    "Joel": { vida: 90, poder: 65, abs: ["Muita vida", "Protege o aliado", "Tiro pesado"] },
    "Ellie": { vida: 65, poder: 90, abs: ["Especial mais rápido", "Esquiva", "Tiro ágil"] }
  };
  const CLASSE_STATS = {
    xerife: { vida: 5, poder: 15, abs: "Tiro mais rápido e um pouco mais forte" },
    soldado: { vida: 0, poder: 20, abs: "Mais balas por disparo" },
    medico: { vida: 20, poder: 0, abs: "Mais vida e mais corações" },
    sobrevivente: { vida: 10, poder: 8, abs: "Corre mais e aguenta melhor" }
  };

  function atualizarFicha() {
    const nome = estado.heroi || "Rick Grimes";
    const base = HERO_STATS[nome] || HERO_STATS["Rick Grimes"];
    const cl = CLASSE_STATS[estado.classe] || CLASSE_STATS.sobrevivente;
    const vida = Math.min(100, base.vida + cl.vida);
    const poder = Math.min(100, base.poder + cl.poder);
    const elN = document.getElementById("fichaNome");
    const bv = document.getElementById("barVida");
    const bp = document.getElementById("barPoder");
    const lista = document.getElementById("fichaAbs");
    if (elN) elN.textContent = nome + " — " + (CLASSES.find(c => c.id === estado.classe) || {}).nome;
    if (bv) bv.style.width = vida + "%";
    if (bp) bp.style.width = poder + "%";
    if (lista) {
      lista.innerHTML = "";
      base.abs.concat([cl.abs]).forEach((a) => {
        const li = document.createElement("li");
        li.textContent = a;
        lista.appendChild(li);
      });
    }
  }

  function montarSelecaoInicial() {
    const boxH = document.getElementById("listaHerois");
    const boxC = document.getElementById("listaClasses");
    if (boxH && !boxH.dataset.ok) {
      boxH.dataset.ok = "1";
      HEROIS.forEach((nome, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (i === 0 ? " ativo" : "");
        b.textContent = nome;
        b.addEventListener("click", () => {
          boxH.querySelectorAll(".chip").forEach((x) => x.classList.remove("ativo"));
          b.classList.add("ativo");
          estado.heroi = nome;
          atualizarFicha();
        });
        boxH.appendChild(b);
      });
    }
    if (boxC && !boxC.dataset.ok) {
      boxC.dataset.ok = "1";
      CLASSES.forEach((cl) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (cl.id === estado.classe ? " ativo" : "");
        b.textContent = cl.nome;
        b.addEventListener("click", () => {
          boxC.querySelectorAll(".chip").forEach((x) => x.classList.remove("ativo"));
          b.classList.add("ativo");
          estado.classe = cl.id;
          atualizarFicha();
          const d = document.getElementById("classeDesc");
          if (d) d.textContent = cl.desc;
        });
        boxC.appendChild(b);
      });
      const d = document.getElementById("classeDesc");
      const cl = CLASSES.find((c) => c.id === estado.classe);
      if (d && cl) d.textContent = cl.desc;
      atualizarFicha();
    }
  }

  function comecarJogo() {
    const sb = document.getElementById("selectBox");
    if (sb) sb.hidden = true;
    fechar(elIntro);
    fechar(elExplica);
    if (elIntro) elIntro.style.display = "none";
    estado.invencivelAte = Date.now() + 4000;
    if (!estado.iniciado) {
      estado.iniciado = true;
      const d = cfgDiff();
      estado.vidaMaxima = d.vida;
      estado.vida = d.vida;
      aplicarClasse();
      aplicarUpgrades();
      hud.vida.textContent = estado.vida;
      estado.inicioPartida = Date.now();
      aplicarPocoes();
      spawnCaixa();
      spawnCaixa();
      spawnCaixa();
      spawnMoedas(28);
      spawnExtras(8);
      nascerAliado();
      iniciarHorda();
    }
  }

  function cfgCorpo() {
    const id = estado.corpoAcorpo || "taco";
    const tabela = {
      taco: { alcance: 52, dano: 2, espera: 420, cor: "#bcaaa4", stun: 8 },
      frigideira: { alcance: 48, dano: 2, espera: 480, cor: "#cfd8dc", stun: 22 },
      bastao: { alcance: 70, dano: 2, espera: 500, cor: "#8d6e63", stun: 10 },
      lanca: { alcance: 64, dano: 3, espera: 460, cor: "#a1887f", stun: 12 }
    };
    return tabela[id] || tabela.taco;
  }

  function atacarCorpo() {
    if (!estado.ativo || estado.emTransicao || estado.pausado) return;
    const agora = Date.now();
    if (agora - (estado.ultimoCorpo || 0) < cfgCorpo().espera) return;
    estado.ultimoCorpo = agora;
    estado.swingAte = agora + 180;
    const cfg = cfgCorpo();
    const ang = Math.atan2(estado.mouseY + camera.y - jogador.y, estado.mouseX + camera.x - jogador.x);
    estado.swingAng = ang;
    for (let i = zumbis.length - 1; i >= 0; i--) {
      const z = zumbis[i];
      const dx = z.x - jogador.x, dy = z.y - jogador.y;
      const dist = Math.hypot(dx, dy);
      if (dist > cfg.alcance + z.raio) continue;
      const angZ = Math.atan2(dy, dx);
      let dif = Math.abs(angZ - ang);
      if (dif > Math.PI) dif = 2 * Math.PI - dif;
      if (dif > 1.15) continue;
      z.vida -= cfg.dano + ((estado.upgrades && estado.upgrades.dano) || 0);
      z.stun = Math.max(z.stun || 0, cfg.stun);
      derrotarZumbi(z, i, z.tipo === "chefe" ? 1000 : 20);
    }
  }

  function atirar() {
    if (!estado.ativo || estado.emTransicao) return;
    const agora = Date.now();
    let espera = estado.intervaloTiro;
    if (estado.armaLoja === "besta") espera *= 0.7;
    if (estado.classe === "xerife") espera *= 0.8;
    if (agora - estado.ultimoTiro < espera) return;
    estado.ultimoTiro = agora;
    const alvoX = estado.mouseX + camera.x;
    const alvoY = estado.mouseY + camera.y;
    const dx = alvoX - jogador.x;
    const dy = alvoY - jogador.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    let quantidade = Math.min(1 + Math.floor(estado.nivelArma / 2), 9);
    if (estado.armaLoja === "espalha") quantidade = Math.min(quantidade + 3, 12);
    if (estado.armaLoja === "estrela") quantidade = Math.max(quantidade, 5);
    if (estado.classe === "soldado") quantidade = Math.min(quantidade + 2, 12);
    const cores = corDoNivel();
    for (let i = 0; i < quantidade; i++) {
      const extra = quantidade > 1 ? (i - (quantidade - 1) / 2) * 0.10 : 0;
      const cos = Math.cos(extra);
      const sin = Math.sin(extra);
      balas.push({
        x: jogador.x + dirX * 28,
        y: jogador.y + dirY * 28,
        vx: (dirX * cos - dirY * sin) * 12,
        vy: (dirX * sin + dirY * cos) * 12,
        raio: (estado.armaLoja === "arco" ? 7 : 5) + Math.min(estado.nivelArma * 0.12, 3),
        dano: (estado.nivelArma >= 12 ? 3 : estado.nivelArma >= 8 ? 2 : 1) + (estado.classe === "xerife" ? 1 : 0) + ((estado.upgrades && estado.upgrades.dano) || 0),
        cor: cores.bala
      });
    }
  }

  function derrotarZumbi(z, indice, pontosChefe) {
    if (z.tipo === "chefe") {
      atualizarBarraChefe();
      if (z.vida <= 0) {
        removerCorpo(z);
        zumbis.splice(indice, 1);
        estado.score += pontosChefe || 1000;
        estado.zumbisDerrotados += 1;
        estado.chefesDerrotados += 1;
        estado.moedas += 20;
        salvarLoja();
        if (z.principal) elBossBar.classList.remove("visible");
      }
      return;
    }
    if (z.vida <= 0) {
      removerCorpo(z);
      zumbis.splice(indice, 1);
      estado.score += 10 + estado.hordaAtual * 5;
      estado.zumbisDerrotados += 1;
      hud.score.textContent = estado.score;
    }
  }

  function usarEspecial() {
    if (!estado.ativo || estado.emTransicao) return;
    if (!especialPronto()) return;
    estado.ultimoEspecial = Date.now();
    const esp = especialDoNivel();
    estado.especialAnel = 32;
    for (let j = zumbis.length - 1; j >= 0; j--) {
      const z = zumbis[j];
      const dist = Math.hypot(z.x - jogador.x, z.y - jogador.y);
      if (dist < esp.raio + z.raio) {
        z.vida -= esp.dano;
        derrotarZumbi(z, j, 1000);
      }
    }
    estado.especiaisUsados += 1;
    mostrarMensagem(esp.nome.toUpperCase() + "!", 1000);
  }

  function spawnZumbi() {
    const horda = HORDAS[estado.hordaAtual];
    if (estado.zumbisSpawnados >= qtdHorda()) return;
    const pos = pontoPertoDoJogador(280, 420);
    const sorte = Math.random();
    let tipo = "normal";
    let raio = 16;
    let velocidade = velHorda() + Math.random() * 0.35;
    let vidaZumbi = horda.vida;
    let cor = "hsl(" + (95 + Math.random() * 45) + ",70%,45%)";
    if (estado.hordaAtual >= 1 && sorte < 0.11) {
      tipo = "corredor"; raio = 12; velocidade *= 1.85; cor = "#39d353";
    } else if (estado.hordaAtual >= 2 && sorte < 0.20) {
      tipo = "tanque"; raio = 27; velocidade *= 0.52; vidaZumbi = horda.vida * 4; cor = "#68752b";
    }
    const zumbi = {
            x: pos.x, y: pos.y, raio, velocidade,
      vida: vidaZumbi, vidaMaxima: vidaZumbi,
      tipo, cor, pulso: Math.random() * 100
    };
    zumbis.push(zumbi);
    criarCorpo(zumbi, "zumbi", { frictionAir: 0.08, restitution: 0.2 });
    estado.zumbisSpawnados += 1;
  }

  function criarChefe() {
    const cfg = HORDAS[estado.hordaAtual].chefe;
    const pos = pontoAleatorioBorda(100);
    const chefe = {
      x: pos.x, y: pos.y,
      raio: cfg.raio,
      velocidade: cfg.velocidade,
      vida: vidaChefe(),
      vidaMaxima: vidaChefe(),
      tipo: "chefe",
      cor: cfg.cor,
      pulso: 0,
      nome: cfg.nome,
      efeito: cfg.efeito,
      principal: true,
      arte: cfg.nome
    };
    zumbis.push(chefe);
    criarCorpo(chefe, "chefe", { frictionAir: 0.06, restitution: 0.05, density: 0.004 });
    elBossNome.textContent = cfg.nome.toUpperCase();
    elBossVida.style.width = "100%";
    elBossBar.classList.add("visible");
  }

  function spawnCaixa() {
    if (caixas.length >= 10) return;
    const pos = pontoNoMapa();
    caixas.push({ x: pos.x, y: pos.y, raio: 15, tempo: 0 });
  }

  function iniciarHorda() {
    estado.emTransicao = true;
    zumbis.forEach(removerCorpo);
    balas.forEach(removerCorpo);
    zumbis = [];
    balas = [];
    estado.zumbisSpawnados = 0;
    elBossBar.classList.remove("visible");
    const horda = HORDAS[estado.hordaAtual];
    hud.horda.textContent = horda.numero;
    mostrarMensagem("HORDA " + horda.numero, 2800);
    setTimeout(() => {
      estado.emTransicao = false;
      estado.ativo = true;
      for (let s = 0; s < 4; s++) spawnZumbi();
      setTimeout(() => {
        if (!estado.ativo) return;
        criarChefe();
        mostrarMensagem(horda.chefe.nome.toUpperCase() + " CHEGOU!", 2500);
      }, 3500 + estado.hordaAtual * 900);
    }, 2800);
  }

  function verificarHorda() {
    if (!estado.ativo || estado.emTransicao) return;
    if (estado.zumbisSpawnados >= qtdHorda() && zumbis.length === 0) {
      if (estado.hordaAtual >= 9) {
        estado.ativo = false;
        abrir(elVitoria);
        return;
      }
      estado.hordaAtual += 1;
      iniciarHorda();
    }
  }

  function moverZumbi(z, indice) {
    z.pulso += 0.08;
    if (z.stun && z.stun > 0) {
      z.stun -= 1;
      return Math.hypot(jogador.x - z.x, jogador.y - z.y) || 1;
    }
    const dx = jogador.x - z.x;
    const dy = jogador.y - z.y;
    const distJogador = Math.hypot(dx, dy) || 1;
    setarVelocidade(z, (dx / distJogador) * z.velocidade, (dy / distJogador) * z.velocidade);
    sincronizarDoCorpo(z);
    return distJogador;
  }

  function aplicarDanoJogador(dano, origem) {
    if (estado.invencivelAte && Date.now() < estado.invencivelAte) return false;
    if (estado.escudoAte && Date.now() < estado.escudoAte) return false;
    estado.vida -= dano;
    hud.vida.textContent = estado.vida;
    if (estado.vida <= 0) {
      fimDeJogo();
      return true;
    }
    return false;
  }

  function nascerAliado() {
    if (!temAmigo()) return;
    aliado = {
      x: jogador.x - 40,
      y: jogador.y,
      raio: 16,
      velocidade: 4.2,
      vida: 5,
      recarga: 0
    };
  }

  function voltarMenu() {
    estado.pausado = false;
    estado.ativo = false;
    estado.emTransicao = false;
    estado.iniciado = false;
    zumbis = [];
    balas = [];
    if (elIntro) elIntro.style.display = "";
    abrir(elIntro);
  }
  function pausarJogo() {
    if (!estado.iniciado || !estado.ativo) return;
    estado.pausado = true;
    abrir(document.getElementById("pauseBox"));
  }
  function continuarJogo() {
    estado.pausado = false;
    fechar(document.getElementById("pauseBox"));
    fechar(document.getElementById("lojaBox"));
  }

  function atualizar() {
    atualizarHudEspecial();
    if (!estado.iniciado || estado.pausado) return;
    if (!estado.ativo && !estado.emTransicao) return;

    if (FISICA_OK && engine) Matter.Engine.update(engine, 1000 / 60);
    estado.frame += 1;

    let mx = 0, my = 0;
    if (teclas.w || teclas.arrowup) my -= 1;
    if (teclas.s || teclas.arrowdown) my += 1;
    if (teclas.a || teclas.arrowleft) mx -= 1;
    if (teclas.d || teclas.arrowright) mx += 1;
    if (mx || my) {
      const tam = Math.hypot(mx, my);
      setarVelocidade(jogador, (mx / tam) * jogador.velocidade, (my / tam) * jogador.velocidade);
    } else setarVelocidade(jogador, 0, 0);
    sincronizarDoCorpo(jogador);

    camera.x = Math.max(0, Math.min(jogador.x - canvas.width / 2, MAPA.largura - canvas.width));
    camera.y = Math.max(0, Math.min(jogador.y - canvas.height / 2, MAPA.altura - canvas.height));

    if (estado.emTransicao) return;
    if (estado.atirando) atirar();

    for (let i = balas.length - 1; i >= 0; i--) {
      const b = balas[i];
      b.x += b.vx;
      b.y += b.vy;
      for (let j = zumbis.length - 1; j >= 0; j--) {
        const z = zumbis[j];
        if (Math.hypot(b.x - z.x, b.y - z.y) < b.raio + z.raio) {
          z.vida -= b.dano || 1;
          balas.splice(i, 1);
          derrotarZumbi(z, j, 1000);
          break;
        }
      }
    }

    for (let i = zumbis.length - 1; i >= 0; i--) {
      const z = zumbis[i];
      const dist = moverZumbi(z, i);
      if (dist < z.raio + jogador.raio + 8) aplicarDanoJogador(1, z);
    }

    for (let i = caixas.length - 1; i >= 0; i--) {
      const c = caixas[i];
      if (Math.hypot(jogador.x - c.x, jogador.y - c.y) < jogador.raio + c.raio) {
        caixas.splice(i, 1);
        estado.caixasColetadas += 1;
        if (estado.caixasColetadas % 2 === 0) {
          estado.nivelArma += 1;
          hud.nivelArma.textContent = estado.nivelArma;
        }
      }
    }

    if (estado.frame % 12 === 0) spawnZumbi();
    if (estado.frame % 180 === 0) spawnCaixa();
    verificarHorda();
  }

  function desenhar() {
    const cores = corDoNivel();
    ctx.fillStyle = "#0b2135";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(0, 0, MAPA.largura, MAPA.altura);

    ctx.fillStyle = "#ffd700";
    caixas.forEach((c) => ctx.fillRect(c.x - 12, c.y - 12, 24, 24));

    balas.forEach((b) => {
      ctx.fillStyle = b.cor;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.raio, 0, Math.PI * 2);
      ctx.fill();
    });

    zumbis.forEach((z) => {
      ctx.fillStyle = z.cor;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.raio, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = cores.player;
    ctx.beginPath();
    ctx.arc(jogador.x, jogador.y, jogador.raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function fimDeJogo() {
    estado.ativo = false;
    abrir(elGameOver);
  }

  function reiniciarJogo() {
    estado.score = 0;
    estado.vida = cfgDiff().vida;
    estado.nivelArma = 1;
    estado.hordaAtual = 0;
    zumbis = [];
    balas = [];
    setarPosicao(jogador, MAPA.largura / 2, MAPA.altura / 2);
    fechar(elGameOver);
    fechar(elVitoria);
    iniciarHorda();
  }

  function loop() {
    atualizar();
    desenhar();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    teclas[e.key.toLowerCase()] = true;
    if (e.code === "Space") estado.atirando = true;
    if (e.key.toLowerCase() === "e") {
      if (estado.pertoMercado) abrirLoja();
      else usarEspecial();
    }
    if (e.key.toLowerCase() === "f") atacarCorpo();
    if (e.key.toLowerCase() === "i") abrirInventario();
    if (e.key.toLowerCase() === "p" && estado.iniciado) {
      if (estado.pausado) continuarJogo();
      else pausarJogo();
    }
    if (e.key === "F9") { estado.moedas += 100; salvarLoja(); }
  });
  window.addEventListener("keyup", (e) => {
    teclas[e.key.toLowerCase()] = false;
    if (e.code === "Space") estado.atirando = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    estado.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    estado.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener("mousedown", () => { estado.atirando = true; });
  canvas.addEventListener("mouseup", () => { estado.atirando = false; });

  document.querySelectorAll(".btn-diff").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-diff").forEach((b) => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      estado.dificuldade = btn.dataset.diff;
    });
  });

  const btnLoja = document.getElementById("btnLoja");
  if (btnLoja) btnLoja.addEventListener("click", abrirLoja);
  (document.getElementById("btnJogarAgora") || { addEventListener() {} }).addEventListener("click", comecarJogo);
  (document.getElementById("btnReiniciar") || { addEventListener() {} }).addEventListener("click", reiniciarJogo);

  iniciarFisica();
  criarCorpo(jogador, "jogador", { frictionAir: 0.22, restitution: 0.02 });
  montarSelecaoInicial();
  loop();
})();
