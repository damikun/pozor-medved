(function () {
  const { CFG, COLORS, LABELS } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const rules = () => ZS.sim.rules;
  const HALF = 38;
  const CLIMB_UP = 110, CLIMB_DOWN = 170;

  function create() {
    return {
      x: 240, y: GY, vy: 0, dir: 1, onGround: true, hiding: null, crouch: false, moving: false, running: false,
      inv: 0, walkT: 0, birchCd: 0, pose: 'stiff', hideT: 0, quipCd: 0, sweatT: 0, danger: false, peekSide: 1,
      stamina: 1, tired: false, noiseT: 0, eating: false, eatT: 0,
      climbing: null, climbV: 0, climbT: 0, inCanopy: false, covered: false,
    };
  }

  function startHiding(g, b, t) {
    b.pose = ZS.POSES[Math.floor(t.shade * ZS.POSES.length) % ZS.POSES.length];
    b.hideT = 0;
    if (b.quipCd <= 0) {
      const list = ZS.QUIPS[b.pose];
      g.bubble = { text: list[Math.floor(Math.random() * list.length)], t: 2.4 };
      b.quipCd = 5;
    }
  }

  function whileHiding(g, b, dt) {
    b.hideT += dt;
    let near = null;
    for (const s of g.shooters) if (!near || Math.abs(s.x - b.x) < Math.abs(near.x - b.x)) near = s;
    b.peekSide = near ? Math.sign(near.x - b.x) || 1 : b.dir;
    b.danger = g.shooters.some((s) => s.lock > 0 || Math.abs(s.cross - b.x) < 150);
    b.sweatT -= dt;
    if ((b.pose === 'sweat' || b.danger) && b.sweatT <= 0) {
      b.sweatT = 0.12;
      const side = Math.random() < 0.5 ? -1 : 1;
      g.particles.push({ x: b.x + side * 20, y: GY - 134, vx: side * (40 + Math.random() * 60), vy: -60 - Math.random() * 60, t: 0.8, color: '#5bc0eb', round: true });
    }
  }

  function coverY(t) {
    if (t.kind === 'smrek') return GY - t.h * 0.3 - 25;
    if (t.kind === 'jablon') return GY - 70;
    return GY - t.h + t.r * 0.55;
  }

  function topY(t) {
    if (t.kind === 'smrek') return GY - t.h * 0.55;
    if (t.kind === 'jablon') return GY - 100;
    return GY - t.h - t.r * 0.1;
  }

  function climb(g, b, dt, up, down, jump) {
    const t = b.climbing;
    b.running = false; b.moving = false; b.crouch = false; b.hiding = null; b.eating = false;
    b.climbT += dt;
    b.x += (t.x - b.x) * Math.min(1, dt * 12);
    if (jump) {
      b.climbing = null; b.inCanopy = false; b.covered = false;
      b.x = t.x + b.dir * (t.w / 2 + 24); b.vy = -150; b.onGround = false;
      return;
    }
    b.climbV = down ? 1 : up ? -1 : 0;
    if (b.climbV < 0) b.y = Math.max(topY(t), b.y - CLIMB_UP * dt);
    if (b.climbV > 0) b.y += CLIMB_DOWN * dt;
    if (b.y >= GY) {
      b.y = GY; b.vy = 0; b.onGround = true;
      b.climbing = null; b.inCanopy = false; b.covered = false; b.climbV = 0;
      b.hideLatch = true;
      return;
    }
    const was = b.inCanopy;
    b.inCanopy = b.y <= coverY(t);
    b.covered = b.inCanopy;
    pickUp(g, b);
    if (b.inCanopy && !was && b.quipCd <= 0) {
      const list = ZS.QUIPS.climb;
      g.bubble = { text: list[Math.floor(Math.random() * list.length)], t: 2.4 };
      b.quipCd = 6;
    }
  }

  function blockByLogs(L, b, nx) {
    for (const lg of L.logs) {
      if (b.y <= GY - lg.h + 2) continue;
      const half = lg.w / 2 + HALF * 0.6;
      if (b.x <= lg.x - half && nx > lg.x - half) return lg.x - half;
      if (b.x >= lg.x + half && nx < lg.x + half) return lg.x + half;
    }
    return nx;
  }

  function updateStamina(b, keys, dt, left, right, hide) {
    if (b.tired && b.stamina > 0.35) b.tired = false;
    b.running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !b.tired && (left || right) && !hide;
    b.stamina = b.running ? Math.max(0, b.stamina - 0.33 * dt) : Math.min(1, b.stamina + 0.22 * dt);
    if (b.stamina === 0) b.tired = true;
  }

  function updateHiding(g, b, dt, hide) {
    const L = g.level;
    if (!hide || g.input.downReleased) b.hideLatch = false;
    g.input.downReleased = false;
    if (hide && b.onGround && !b.hideLatch) {
      if (!b.hiding) {
        const near = L.trees.filter((tr) => Math.abs(tr.x - b.x) < tr.w / 2 + 40);
        const t = near.filter((tr) => tr.hide).sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x))[0];
        if (t) { b.hiding = t; startHiding(g, b, t); }
        else if (near.length && b.birchCd <= 0) { b.birchCd = 2; rules().float(g, b.x, GY - 95, LABELS.birch, COLORS.bad); }
      }
    } else {
      b.hiding = null;
    }
    b.crouch = hide && !b.hiding && b.onGround && !b.hideLatch;
    b.covered = !!b.hiding;
    if (b.hiding) b.hideTree = b.hiding;
    b.hideBlend = clamp((b.hideBlend || 0) + (b.hiding ? dt : -dt) / 0.18, 0, 1);
    if (!b.hiding && b.hideBlend === 0) b.hideTree = null;
  }

  function walkClimbOrJump(g, b, dt, keys, left, right, hide, jump) {
    const L = g.level;
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    if (dx) b.dir = dx;
    b.moving = dx !== 0;
    if (b.inWater) b.running = false;
    if (b.moving) {
      const speed = (b.crouch ? CFG.CREEP : b.running ? CFG.RUN : CFG.WALK) * (b.inWater ? 0.6 : 1);
      const nx = b.x + dx * speed * dt;
      b.x = clamp(blockByLogs(L, b, nx), 40, CFG.LEVEL_W - 40);
      b.walkT += dt * (b.running ? 1.5 : b.crouch ? 0.6 : 1);
    }
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const logAhead = L.logs.some((lg) => {
      const f = b.dir > 0 ? lg.x - lg.w / 2 - b.x : b.x - (lg.x + lg.w / 2);
      return f > -10 && f < 90;
    });
    const trunk = b.onGround && !hide && !logAhead && (up || (jump && g.input.jumpKey !== 'Space'))
      && L.trees.find((tr) => tr.hide && Math.abs(tr.x - b.x) < tr.w / 2 + 30);
    if (trunk) {
      b.climbing = trunk; b.climbT = 0; b.climbV = -1; b.inCanopy = false; b.onGround = false; b.vy = 0; b.y = GY - 6;
      b.hideBlend = 0; b.hideTree = null;
      ZS.fx.onShot(g, trunk.x);
    } else if ((jump || b.jumpBuffer > 0) && (b.onGround || b.coyote > 0)) {
      b.vy = -CFG.JUMP * (b.inWater ? 0.8 : 1); b.onGround = false; b.coyote = 0; b.jumpBuffer = 0;
    } else if (jump) {
      b.jumpBuffer = 0.14;
    }
  }

  function updatePhysics(g, b, dt) {
    const L = g.level;
    b.vy += CFG.GRAVITY * dt;
    let floor = GY;
    for (const lg of L.logs) {
      if (Math.abs(b.x - lg.x) < lg.w / 2 + HALF * 0.5 && b.y <= GY - lg.h + 6) floor = Math.min(floor, GY - lg.h);
    }
    for (const st of L.stones) {
      if (Math.abs(b.x - st.x) < st.w / 2 + 8 && b.y <= GY - 10 + 6) floor = Math.min(floor, GY - 10);
    }
    const wasOnGround = b.onGround;
    b.y += b.vy * dt;
    if (b.y >= floor) {
      if (!b.onGround && b.vy > 250) ZS.fx.dust(g, b.x, floor, 6);
      b.y = floor; b.vy = 0; b.onGround = true;
    } else {
      b.onGround = false;
    }
    b.coyote = b.onGround ? 0.1 : wasOnGround && b.vy >= 0 ? 0.1 : Math.max(0, (b.coyote || 0) - dt);
    b.jumpBuffer = Math.max(0, (b.jumpBuffer || 0) - dt);
    const r = L.river;
    b.inWater = !!r && b.onGround && b.y >= GY - 1 && b.x > r.from + 15 && b.x < r.to - 15;
    if (b.inWater && b.moving && (b.splashT = (b.splashT || 0) - dt) <= 0) {
      b.splashT = 0.1;
      g.particles.push({ x: b.x + (Math.random() - 0.5) * 60, y: GY - 8, vx: (Math.random() - 0.5) * 90, vy: -90 - Math.random() * 80, t: 0.6, color: '#bfe3f5', round: true });
    }
    if (b.running && b.moving && b.onGround && !b.inWater && (b.dustT = (b.dustT || 0) - dt) <= 0) {
      b.dustT = 0.08;
      ZS.fx.dust(g, b.x - b.dir * 26, b.y, 1, b.dir);
    }
  }

  function pickUp(g, b) {
    for (const it of g.level.items) {
      if (it.eaten || it.hidden || (!ZS.FOOD[it.type].natural && it.y === undefined)) continue;
      if (it.type === 'fish' && b.moving && b.onGround) continue;
      if (it.y === undefined) {
        if (Math.abs(it.x - b.x) < 34) rules().eat(g, it);
      } else if (Math.hypot(it.x - b.x, it.y - (b.y - 45)) < 55) {
        rules().eat(g, it);
      }
    }
  }

  function raidHumanFood(g, b, dt) {
    const it = b.onGround && !b.moving && !b.hiding
      ? g.level.items.find((i) => !i.eaten && !i.locked && !ZS.FOOD[i.type].natural && Math.abs(i.x - b.x) < 30) : null;
    b.eating = !!it;
    if (it) {
      b.eatT += dt;
      if (b.eatT >= 0.5) { rules().eat(g, it); b.eatT = 0; }
    } else {
      b.eatT = 0;
    }
  }

  function update(g, dt) {
    const b = g.bear, keys = g.input.keys;
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const hide = keys.has('ArrowDown') || keys.has('KeyS');
    const jump = g.input.jumpPressed;
    g.input.jumpPressed = false;
    updateStamina(b, keys, dt, left, right, hide);
    b.inv = Math.max(0, b.inv - dt);
    b.birchCd -= dt;
    b.quipCd -= dt;
    if (b.climbing) { climb(g, b, dt, keys.has('ArrowUp') || keys.has('KeyW'), hide, jump && g.input.jumpKey === 'Space'); return; }

    updateHiding(g, b, dt, hide);
    if (b.hiding) {
      b.x += (b.hiding.x - b.x) * Math.min(1, dt * 12);
      b.moving = false;
      whileHiding(g, b, dt);
    } else {
      walkClimbOrJump(g, b, dt, keys, left, right, hide, jump);
    }
    updatePhysics(g, b, dt);

    b.noiseT -= dt;
    if (b.running && b.moving && b.noiseT <= 0) {
      b.noiseT = 0.6;
      for (const s of g.shooters) if (Math.abs(s.x - b.x) < s.range + 100) s.alertX = b.x;
    }

    pickUp(g, b);
    raidHumanFood(g, b, dt);
  }

  ZS.sim = ZS.sim || {};
  ZS.sim.bear = { create, update };
})();
