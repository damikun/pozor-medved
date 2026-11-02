(function () {
  const HUNTERS = { walker: 1, posed: 1, ztmh: 1, poacher: 1 };
  const OUT = { down: 1, drop: 1, bitten: 1, flee: 1 };
  const runs = new WeakMap();

  const beaten = (s) => !!HUNTERS[s.kind] && (!!OUT[s.react] || (s.react === 'gone' && !!(s.bolt || s.clutch)));

  function watch(g) {
    const run = { hunters: new Set(), shakes: 0, climbs: 0 };
    runs.set(g, run);
    return run;
  }

  function look(g, run) {
    for (const s of g.shooters) if (beaten(s)) run.hunters.add(s);
  }

  function hear(g, name) {
    const run = runs.get(g);
    if (!run) return;
    if (name === 'standFall') run.shakes++;
    if (name === 'climb') run.climbs++;
    look(g, run);
  }

  function check(g) {
    const run = runs.get(g);
    if (run) look(g, run);
  }

  function counts(g) {
    const run = runs.get(g);
    return {
      hunters: run ? run.hunters.size : 0,
      stands: (run ? run.shakes : 0) + (g.ladders || 0),
      trees: run ? run.climbs : 0,
      photos: g.stats.selfies,
    };
  }

  function goals(g) {
    const fat = g.fat >= g.def.fatGoal, hug = g.stats.hugs + g.stats.selfies > 0;
    return { fat, hug, den: !!g.over && g.ending === 'win', ready: fat && hug };
  }

  ZS.tally = { watch, hear, check, counts, goals };
})();
