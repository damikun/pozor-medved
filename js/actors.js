// The bear, hunters with their crosshairs, people in the forest and the army's drones (side view).
(function () {
  const { CFG } = ZS;
  const GY = CFG.GROUND;
  const { clamp } = ZS.util;
  const HALF = 38;

  ZS.makeBear = function () {
    return {
      x: 240, y: GY, vy: 0, dir: 1, onGround: true, hiding: null, crouch: false, moving: false, running: false,
      inv: 0, walkT: 0, birchCd: 0, pose: 'stiff', hideT: 0, quipCd: 0, sweatT: 0, danger: false, peekSide: 1,
      stamina: 1, tired: false, noiseT: 0, eating: false, eatT: 0,
      climbing: null, climbV: 0, climbT: 0, inCanopy: false, covered: false,
    };
  };

  function startHiding(g, b, t) {
    b.pose = ZS.POSES[Math.floor(t.shade * ZS.POSES.length) % ZS.POSES.length];
    b.hideT = 0;
    if (b.quipCd <= 0) {
      const list = ZS.QUIPS[b.pose];
      g.bubble = { text: list[Math.floor(Math.random() * list.length)], t: 2.4 };
      b.quipCd = 5;
    }
  }

  // Cosmetic only: the bear sweats when a crosshair comes close and peeks toward the nearest hunter.
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

  // --- Climbing: slow and exposed on the trunk, invisible once the leaves cover it ---

  const CLIMB_UP = 110, CLIMB_DOWN = 170;
  // y of the hind feet where the crown starts to cover the bear, and the highest it can go.
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
    // ↓ wins over ↑, so holding both never leaves the bear stuck halfway.
    b.climbV = down ? 1 : up ? -1 : 0;
    if (b.climbV < 0) b.y = Math.max(topY(t), b.y - CLIMB_UP * dt);
    if (b.climbV > 0) b.y += CLIMB_DOWN * dt;
    if (b.y >= GY) {
      b.y = GY; b.vy = 0; b.onGround = true;
      b.climbing = null; b.inCanopy = false; b.covered = false; b.climbV = 0;
      // ↓ is still held from climbing down; it must be released before it means "hide" again.
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

  // Logs block the way unless the bear jumps on or over them.
  function blockByLogs(L, b, nx) {
    for (const lg of L.logs) {
      if (b.y <= GY - lg.h + 2) continue;
      const half = lg.w / 2 + HALF * 0.6;
      if (b.x <= lg.x - half && nx > lg.x - half) return lg.x - half;
      if (b.x >= lg.x + half && nx < lg.x + half) return lg.x + half;
    }
    return nx;
  }

  ZS.updateBear = function (g, dt) {
    const b = g.bear, k = g.input.keys, L = g.level;
    const left = k.has('ArrowLeft') || k.has('KeyA');
    const right = k.has('ArrowRight') || k.has('KeyD');
    const hide = k.has('ArrowDown') || k.has('KeyS');
    const jump = g.input.jumpPressed;
    g.input.jumpPressed = false;
    // Sprinting costs breath: about three seconds of it, then the bear has to walk until it recovers.
    if (b.tired && b.stamina > 0.35) b.tired = false;
    b.running = (k.has('ShiftLeft') || k.has('ShiftRight')) && !b.tired && (left || right) && !hide;
    b.stamina = b.running ? Math.max(0, b.stamina - 0.33 * dt) : Math.min(1, b.stamina + 0.22 * dt);
    if (b.stamina === 0) b.tired = true;
    b.inv = Math.max(0, b.inv - dt);
    b.birchCd -= dt;
    b.quipCd -= dt;
    if (b.climbing) { climb(g, b, dt, k.has('ArrowUp') || k.has('KeyW'), hide, jump && g.input.jumpKey === 'Space'); return; }

    if (!hide || g.input.downReleased) b.hideLatch = false;
    g.input.downReleased = false;
    if (hide && b.onGround && !b.hideLatch) {
      if (!b.hiding) {
        // The nearest thick trunk wins, even when a birch stands closer.
        const near = L.trees.filter((tr) => Math.abs(tr.x - b.x) < tr.w / 2 + 40);
        const t = near.filter((tr) => tr.hide).sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x))[0];
        if (t) { b.hiding = t; startHiding(g, b, t); }
        else if (near.length && b.birchCd <= 0) { b.birchCd = 2; ZS.float(g, b.x, GY - 95, 'Breza ťa neschová!', '#a3261f'); }
      }
    } else {
      b.hiding = null;
    }
    b.crouch = hide && !b.hiding && b.onGround && !b.hideLatch;
    b.covered = !!b.hiding;
    // A short cross-fade between "in front of the tree" and "behind it", so hiding never pops.
    if (b.hiding) b.hideTree = b.hiding;
    b.hideBlend = clamp((b.hideBlend || 0) + (b.hiding ? dt : -dt) / 0.18, 0, 1);
    if (!b.hiding && b.hideBlend === 0) b.hideTree = null;

    if (b.hiding) {
      b.x += (b.hiding.x - b.x) * Math.min(1, dt * 12);
      b.moving = false;
      whileHiding(g, b, dt);
    } else {
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      if (dx) b.dir = dx;
      // ↓ with ← or → creeps low; the bear slips behind the first thick trunk it reaches.
      b.moving = dx !== 0;
      if (b.inWater) b.running = false;
      if (b.moving) {
        const speed = (b.crouch ? CFG.CREEP : b.running ? CFG.RUN : CFG.WALK) * (b.inWater ? 0.6 : 1);
        const nx = b.x + dx * speed * dt;
        b.x = clamp(blockByLogs(L, b, nx), 40, CFG.LEVEL_W - 40);
        b.walkT += dt * (b.running ? 1.5 : b.crouch ? 0.6 : 1);
      }
      // Holding ↑ at a thick trunk climbs it, walking or not; the hold counts, not just the press, so ↑ held
      // while still hidden climbs as soon as ↓ is let go. ↓ always wins, and a log right ahead means jump.
      const up = k.has('ArrowUp') || k.has('KeyW');
      const logAhead = L.logs.some((lg) => {
        const f = b.dir > 0 ? lg.x - lg.w / 2 - b.x : b.x - (lg.x + lg.w / 2);
        return f > -10 && f < 90;
      });
      const trunk = b.onGround && !hide && !logAhead && (up || (jump && g.input.jumpKey !== 'Space'))
        && L.trees.find((tr) => tr.hide && Math.abs(tr.x - b.x) < tr.w / 2 + 30);
      if (trunk) {
        b.climbing = trunk; b.climbT = 0; b.climbV = -1; b.inCanopy = false; b.onGround = false; b.vy = 0; b.y = GY - 6;
        b.hideBlend = 0; b.hideTree = null;
        ZS.fx.onShot(g, trunk.x);   // birds leave the crown when a bear starts up the trunk
      } else if ((jump || b.jumpBuffer > 0) && (b.onGround || b.coyote > 0)) {
        // Water drags at the legs, so a jump out of the river is lower.
        b.vy = -CFG.JUMP * (b.inWater ? 0.8 : 1); b.onGround = false; b.coyote = 0; b.jumpBuffer = 0;
      } else if (jump) {
        // Pressed a moment too early, still in the air: jump as soon as the feet touch down.
        b.jumpBuffer = 0.14;
      }
    }

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
    // A few frames of grace after walking off a log or a stone, and a short memory of an early jump press.
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

    // A sprint is loud: hunters within range swing their crosshairs toward the noise.
    b.noiseT -= dt;
    if (b.running && b.moving && b.noiseT <= 0) {
      b.noiseT = 0.6;
      for (const s of g.shooters) if (Math.abs(s.x - b.x) < s.range + 100) s.alertX = b.x;
    }

    pickUp(g, b);

    // Human food is a choice: the bear has to stop at a bin or a hive for half a second to raid it.
    const it = b.onGround && !b.moving && !b.hiding
      ? L.items.find((i) => !i.eaten && !i.locked && !ZS.FOOD[i.type].natural && Math.abs(i.x - b.x) < 30) : null;
    b.eating = !!it;
    if (it) {
      b.eatT += dt;
      if (b.eatT >= 0.5) { ZS.eat(g, it); b.eatT = 0; }
    } else {
      b.eatT = 0;
    }
  };

  // Forest food is picked up on touch: walking, mid-jump, or on the way up a tree. Apples up in a crown
  // count as human food (somebody's orchard) but are taken the same way, by climbing to them.
  function pickUp(g, b) {
    for (const it of g.level.items) {
      if (it.eaten || it.hidden || (!ZS.FOOD[it.type].natural && it.y === undefined)) continue;
      // Trout are caught the way bears fish: standing still in the stream, or with a leap.
      if (it.type === 'fish' && b.moving && b.onGround) continue;
      if (it.y === undefined) {
        if (Math.abs(it.x - b.x) < 34) ZS.eat(g, it);
      } else if (Math.hypot(it.x - b.x, it.y - (b.y - 45)) < 55) {
        ZS.eat(g, it);
      }
    }
  }

  // --- Hunters: each one sweeps a crosshair along the ground ----------------------

  const KIND = {
    posed:   { aim: 1.25, sweep: 125, range: 480, speed: 0,   label: 'poľovník' },
    walker:  { aim: 1.1,  sweep: 115, range: 380, speed: 48,  label: 'poľovník' },
    ztmh:    { aim: 0.95, sweep: 150, range: 420, speed: 230, label: 'zásahový tím' },
    poacher: { aim: 0.8,  sweep: 130, range: 400, speed: 70,  label: 'pytliak' },
  };

  ZS.makeShooter = function (g, kind, o) {
    const k = KIND[kind];
    const s = Object.assign({
      kind, label: k.label, aimTime: k.aim, sweep: k.sweep, range: k.range, speed: k.speed,
      x: 0, dir: -1, from: null, to: null, crossDir: 1, lock: 0, reload: 0, life: Infinity, pause: 0, lost: 0, alertX: null,
      sweepPause: 0, scaredT: 0,
    }, o);
    s.y = kind === 'posed' ? GY - 150 : GY;
    s.cross = s.x + s.dir * 200;
    return s;
  };

  function sweepLimits(s) {
    if (s.kind === 'posed') return [s.x - s.range, s.x + s.range];
    const a = s.x + s.dir * 60, b = s.x + s.dir * s.range;
    return a < b ? [a, b] : [b, a];
  }

  ZS.alertShooters = function (g, x) {
    for (const s of g.shooters) if (Math.abs(s.x - x) < 1000) s.alertX = x;
  };

  function move(g, s, dt) {
    const L = g.level;
    if (s.scaredT > 0) {
      s.scaredT -= dt;
      s.x = clamp(s.x + s.dir * s.speed * 2.2 * dt, 40, CFG.LEVEL_W - 40);
      return;
    }
    if (s.kind === 'walker' || s.kind === 'poacher') {
      if (s.pause > 0) { s.pause -= dt; return; }
      s.x += s.dir * s.speed * (g.flags.meat ? 1.25 : 1) * dt;
      if (s.from !== null && (s.x < s.from || s.x > s.to)) {
        s.dir *= -1; s.x = clamp(s.x, s.from, s.to); s.pause = 1.5;
      } else if (L.rng() < dt * 0.12) {
        s.pause = 1 + L.rng() * 2;
        if (L.rng() < 0.5) s.dir *= -1;
      }
    } else if (s.kind === 'ztmh') {
      if (!g.problem || s.lost > 14) {
        s.dir = -1; s.x -= 260 * dt;
        if (s.x < g.cam - 300) s.dead = true;
        return;
      }
      const tx = g.lastKnown !== null ? g.lastKnown : g.bear.x;
      if (Math.abs(tx - s.x) > 380) { s.dir = Math.sign(tx - s.x); s.x += s.dir * s.speed * dt; }
      else s.dir = Math.sign(g.bear.x - s.x) || s.dir;
    }
  }

  ZS.updateShooters = function (g, dt) {
    const b = g.bear;
    const quick = g.flags.cull ? 0.85 : g.flags.emergency ? 0.92 : 1;
    const courtPause = g.time < g.courtUntil;
    // Only one hunter aims at a time, so two crosshairs never close on the bear together.
    let aiming = g.shooters.find((s) => s.lock > 0) || null;
    for (const s of g.shooters) {
      s.reload -= dt;
      if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 4);
      if (s.life !== Infinity && (s.life -= dt) <= 0) { s.dead = true; continue; }
      if (s.kind !== 'ztmh' && Math.abs(s.x - b.x) > 1500) continue;
      move(g, s, dt);
      if (s.dead) continue;

      const d = Math.abs(b.x - s.x);
      // A hunter who walks into a bear behind a tree gets the fright of his life and runs.
      if (b.hiding && d < 32 && s.kind !== 'posed' && s.scaredT <= 0) {
        s.scaredT = 4; s.dir = Math.sign(s.x - b.x) || 1; s.lock = 0; s.pause = 0;
        ZS.float(g, s.x, GY - 110, 'Poľovník sa zľakol!', '#a3261f');
        ZS.addPanic(g, 10, ZS.NEWS.hunterScared);
      }
      const facing = s.kind === 'posed' || Math.sign(b.x - s.x) === s.dir || d < 60;
      const allowed = (s.kind === 'poacher' || !courtPause) && s.scaredT <= 0;
      const free = !aiming || aiming === s;
      const [lo, hi] = sweepLimits(s);
      s.blocked = !allowed;

      // Nobody can aim straight down from a raised hide, so right under it is a blind spot.
      const blind = s.kind === 'posed' && d < 70;
      const close = s.kind !== 'posed' && d < 90;
      if (allowed && free && !blind && !b.covered && facing && d < s.range && b.inv <= 0 && (Math.abs(s.cross - b.x) < 40 || close)) {
        aiming = s;
        s.cross += (b.x - s.cross) * Math.min(1, dt * 8);
        s.lock += dt;
        s.lost = 0;
        g.lastKnown = b.x;
        if (s.lock >= s.aimTime * quick && s.reload <= 0) { ZS.fire(g, s); s.lock = 0; s.reload = 3; aiming = null; }
        continue;
      }
      // The bear ducked behind a trunk at the last moment: the shot hits the tree.
      if (allowed && b.covered && s.lock > s.aimTime * quick * 0.6 && s.reload <= 0 && Math.abs(s.cross - b.x) < 60) {
        ZS.fire(g, s, 'tree'); s.reload = 3;
      }
      s.lock = Math.max(0, s.lock - dt * 2);
      if (aiming === s && s.lock === 0) aiming = null;
      if (s.kind === 'ztmh') s.lost += dt;
      if (s.alertX !== null) {
        const t = clamp(s.alertX, lo, hi);
        s.cross += Math.sign(t - s.cross) * Math.min(Math.abs(t - s.cross), 420 * dt);
        if (Math.abs(t - s.cross) < 5) s.alertX = null;
      } else if (s.sweepPause > 0) {
        s.sweepPause -= dt;
      } else {
        // At each end of the sweep the hunter lingers a moment, which is the window to slip past.
        s.cross += s.crossDir * s.sweep * dt;
        if (s.cross > hi || s.cross < lo) {
          s.cross = clamp(s.cross, lo, hi); s.crossDir *= -1;
          s.sweepPause = 0.8 + Math.random() * 1.2;
        }
      }
    }
    g.shooters = g.shooters.filter((s) => !s.dead);
    b.warn = !b.covered && g.shooters.some((s) => s.lock > 0 || (Math.abs(s.cross - b.x) < 200 && Math.abs(s.x - b.x) < s.range));
  };

  // --- People: mushroom pickers run, tourists film ---------------------------------

  ZS.makePerson = function (g, kind, o) {
    return Object.assign({ kind, x: (o.from + o.to) / 2, dir: 1, speed: kind === 'tourist' ? 25 : 35, state: 'walk', pause: 0, filmCd: 0, dropCd: 8 }, o);
  };

  ZS.updatePeople = function (g, dt) {
    const b = g.bear, L = g.level;
    for (const p of g.people) {
      p.filmCd -= dt; p.dropCd -= dt;
      if (p.state === 'flee') {
        p.x += p.dir * 210 * dt;
        if (Math.abs(p.x - b.x) > 1600) p.dead = true;
        continue;
      }
      if (p.pause > 0) p.pause -= dt;
      else {
        p.x += p.dir * p.speed * dt;
        if (p.x < p.from || p.x > p.to) { p.dir *= -1; p.x = clamp(p.x, p.from, p.to); p.pause = 2; }
      }
      const d = Math.abs(b.x - p.x);
      const ahead = Math.sign(b.x - p.x) === p.dir;
      const sees = (!b.covered || (b.hiding && d < 55)) && (d < 110 || (ahead && d < (p.kind === 'tourist' ? 380 : 300)));
      if (sees && p.kind === 'picker') {
        p.state = 'flee';
        p.dir = Math.sign(p.x - b.x) || 1;
        ZS.addPanic(g, 8, ZS.NEWS.pickerSeen);
        ZS.spotted(g, p.x, GY - 100, 'Medveď!');
        ZS.alertShooters(g, b.x);
      } else if (sees && p.filmCd <= 0) {
        p.filmCd = 10;
        ZS.addPanic(g, 12, ZS.NEWS.touristSeen);
        ZS.spotted(g, p.x, GY - 100, '📱 Video!');
      }
      if (p.kind === 'tourist' && p.dropCd <= 0) {
        p.dropCd = 18;
        if (L.items.filter((it) => it.type === 'sandwich' && !it.eaten).length < 3) {
          L.items.push({ type: 'sandwich', x: p.x + 30 * p.dir, eaten: false, locked: false });
        }
      }
    }
    g.people = g.people.filter((p) => !p.dead);
  };

  // --- Drones light the ground; only a trunk hides the bear from them --------------

  ZS.makeDrone = function (g, phase) {
    return { x: g.bear.x + 300, y: 120, speed: 130, beam: 70, cd: 0, t: 0, phase };
  };

  ZS.updateDrones = function (g, dt) {
    const b = g.bear;
    for (const d of g.drones) {
      d.cd -= dt; d.t += dt;
      const target = b.x + Math.sin(d.t * 0.45 + d.phase) * 420;
      d.x += clamp(target - d.x, -d.speed * dt, d.speed * dt);
      if (!b.covered && Math.abs(b.x - d.x) < d.beam && d.cd <= 0) {
        d.cd = 4;
        g.lastKnown = b.x;
        ZS.alertShooters(g, b.x);
        ZS.addPanic(g, 3, ZS.NEWS.droneSeen);
        ZS.spotted(g, d.x, d.y + 50, 'Dron ťa vidí');
      }
    }
  };

  // --- The river: trout jump out between the stones and can be caught mid-air -------

  ZS.updateFish = function (g, dt) {
    for (const it of g.level.items) {
      if (it.type !== 'fish' || it.eaten) continue;
      if (it.jump < 0) {
        it.jumpT -= dt;
        if (it.jumpT <= 0) { it.jump = 0; it.hidden = false; it.dir = Math.random() < 0.5 ? -1 : 1; it.x0 = it.x0 || it.x; }
        continue;
      }
      it.jump += dt / 0.95;
      const k = Math.min(1, it.jump);
      it.y = GY + 8 - Math.sin(Math.PI * k) * 92;
      it.x = it.x0 + it.dir * (k - 0.5) * 36;
      if (it.jump >= 1) { it.jump = -1; it.hidden = true; it.y = GY + 30; it.jumpT = 1.5 + Math.random() * 2.5; }
    }
  };

  // --- The salaš: a shepherd dog that barks at bears, and sheep behind an electric fence ---

  ZS.makeDog = function (o) {
    return { x: (o.from + o.to) / 2, from: o.from, to: o.to, dir: 1, state: 'walk', alert: 0, barkCd: 0, id: 'dog' };
  };

  ZS.updateDogs = function (g, dt) {
    const b = g.bear;
    for (const d of g.dogs) {
      d.barkCd -= dt;
      const dist = Math.abs(b.x - d.x);
      const sees = !b.covered && (dist < 150 || (dist < 430 && Math.sign(b.x - d.x) === d.dir));
      if (sees) d.alert = 3.5;
      if (d.alert > 0) {
        d.alert -= dt;
        d.dir = Math.sign(b.x - d.x) || d.dir;
        // A guard dog closes in, then holds its ground and barks; it never attacks.
        if (dist > 160 && sees) { d.x += d.dir * 170 * dt; d.state = 'run'; } else d.state = 'bark';
        if (sees && d.barkCd <= 0) {
          d.barkCd = 4;
          ZS.addPanic(g, 6, ZS.NEWS.dogBark);
          ZS.spotted(g, d.x, GY - 80, 'Haf! Haf!');
          ZS.alertShooters(g, b.x);
        }
      } else {
        d.state = 'walk';
        d.x += d.dir * 42 * dt;
        if (d.x < d.from || d.x > d.to) { d.dir *= -1; d.x = clamp(d.x, d.from, d.to); }
      }
      d.x = clamp(d.x, d.from - 250, d.to + 250);
    }
  };

  ZS.makeSheep = function (o, i) {
    return { x: o.x, from: o.from, to: o.to, dir: i % 2 ? -1 : 1, state: 'graze', t: Math.random() * 4, id: 'sheep' + i };
  };

  // Sheep graze inside the pen and bunch away from a bear on the other side of the fence.
  ZS.updateSheep = function (g, dt) {
    const b = g.bear;
    for (const s of g.sheep) {
      s.t -= dt;
      if (Math.abs(b.x - s.x) < 220 && !b.covered) {
        s.state = 'flee'; s.dir = Math.sign(s.x - b.x) || 1;
        s.x = clamp(s.x + s.dir * 95 * dt, s.from, s.to);
        continue;
      }
      if (s.t <= 0) { s.t = 2 + Math.random() * 4; s.state = Math.random() < 0.6 ? 'graze' : 'walk'; if (Math.random() < 0.4) s.dir *= -1; }
      if (s.state === 'flee') s.state = 'walk';
      if (s.state === 'walk') s.x = clamp(s.x + s.dir * 22 * dt, s.from, s.to);
    }
  };
})();
