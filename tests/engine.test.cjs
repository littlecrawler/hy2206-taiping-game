const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const D = require("../dist/data.js");
const E = require("../dist/engine.js");
const fresh = (options = {}) => E.createGame({ seed: 19, ...options });
function act(state, action, armyId, target) {
  const result = E.applyAction(state, action, armyId, target);
  assert.equal(result.ok, true, result.error);
  return result.state;
}
function advanceTo(state, year) {
  while (state.year < year) {
    if (state.pending) state = E.resolveIncident(state, "loss").state;
    state = E.endTurn(state).state;
  }
  return state;
}
function battleSetup(attackerStrength, defenderStrength) {
  const state = fresh();
  state.armies.find(a => a.id === "hong").strength = attackerStrength;
  state.armies.find(a => a.id === "imperial").strength = defenderStrength;
  return state;
}
test("opening matches proposal treasury, strengths and positions", () => {
  const state = fresh();
  assert.deepEqual(state.treasury, { taiping: 12, qing: 15 });
  assert.equal(E.strength(state, "taiping"), 10); assert.equal(E.strength(state, "qing"), 12);
  assert.equal(state.year, 1853); assert.equal(state.ap, 3);
  for (const [id, city] of [["hong","tianjing"],["shi","anqing"],["zeng","changsha"],["imperial","jiangnan"]]) assert.equal(E.armyById(state, id).city, city);
});
test("all links are reciprocal and every city is reachable", () => {
  for (const city of D.cities) for (const next of D.neighbours[city.id]) assert.ok(D.neighbours[next].includes(city.id));
  const seen = new Set(["tianjing"]), queue = ["tianjing"];
  while (queue.length) for (const next of D.neighbours[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  assert.equal(seen.size, D.cities.length);
});
test("invalid moves and enemy commands do not mutate the input", () => {
  const state = fresh(), before = JSON.stringify(state);
  assert.equal(E.applyAction(state, "move", "hong", "beijing").ok, false);
  assert.equal(E.applyAction(state, "move", "zeng", "wuchang").ok, false);
  assert.equal(E.applyAction(state, "move", "hong", "jiangnan").ok, false);
  assert.equal(JSON.stringify(state), before);
});
test("moving into neutral territory and claiming it are separate paid actions", () => {
  let state = act(fresh(), "move", "hong", "hefei");
  assert.equal(state.ap, 2); assert.equal(state.treasury.taiping, 11); assert.equal(state.cities.hefei.owner, null);
  assert.equal(E.check(state, "recruit", "hong", "hefei").ok, false);
  state = act(state, "claim", "hong", "hefei");
  assert.equal(state.cities.hefei.owner, "taiping"); assert.equal(state.ap, 1); assert.equal(state.treasury.taiping, 10);
  assert.equal(E.income(state, "taiping"), 5);
});
test("treasury and AP prevent unaffordable actions", () => {
  let state = fresh(); state.treasury.taiping = 0;
  assert.equal(E.check(state, "recruit", "hong", "tianjing").ok, false);
  state = fresh(); state.ap = 0;
  assert.equal(E.check(state, "move", "hong", "hefei").ok, false);
});
test("recruit and fortify affect the selected force and city with a defence cap", () => {
  let state = act(fresh(), "recruit", "hong", "tianjing");
  assert.equal(E.armyById(state, "hong").strength, 8); assert.equal(E.armyById(state, "shi").strength, 4);
  state = act(state, "fortify", "hong", "tianjing"); state = act(state, "fortify", "hong", "tianjing");
  assert.equal(state.cities.tianjing.fort, 8);
  state.ap = 3; assert.equal(E.check(state, "fortify", "hong", "tianjing").ok, false);
});
test("both armies share three action points", () => {
  let state = act(fresh(), "recruit", "hong", "tianjing");
  state = act(state, "recruit", "shi", "anqing"); state = act(state, "fortify", "hong", "tianjing");
  assert.equal(state.ap, 0); assert.equal(E.check(state, "recruit", "shi", "anqing").ok, false);
});
test("Qing handover does not advance the year or collect income", () => {
  const state = E.endTurn(fresh()).state;
  assert.equal(state.turn, "qing"); assert.equal(state.year, 1853); assert.equal(state.ap, 3);
  assert.deepEqual(state.treasury, { taiping: 12, qing: 15 });
});
test("a new year collects income for both sides once, capped at eight", () => {
  let state = fresh();
  for (const city of D.cities) state.cities[city.id].owner = "taiping";
  state.cities.beijing.owner = "qing";
  assert.equal(E.income(state, "taiping"), 8);
  state = E.endTurn(E.endTurn(state).state).state;
  assert.equal(state.year, 1854); assert.equal(state.treasury.taiping, 20); assert.equal(state.treasury.qing, 18);
});
test("1854 attrition affects only Taiping armies north of Kaifeng", () => {
  let state = fresh(); E.armyById(state, "hong").city = "tianjin"; E.armyById(state, "shi").city = "kaifeng";
  state = E.endTurn(E.endTurn(state).state).state;
  assert.equal(E.armyById(state, "hong").strength, 4); assert.equal(E.armyById(state, "shi").strength, 4);
});
test("1856 blocks actions and income until a valid incident choice", () => {
  const state = advanceTo(fresh(), 1856), before = state.treasury.taiping;
  assert.equal(state.pending, "tianjing"); assert.equal(E.endTurn(state).ok, false);
  assert.equal(E.check(state, "recruit", "hong", "tianjing").ok, false);
  const result = E.resolveIncident(state, "contain");
  assert.equal(result.ok, true); assert.equal(result.state.treasury.taiping, before - 4 + E.income(state, "taiping"));
  assert.equal(result.state.pending, null); assert.equal(E.resolveIncident(result.state, "contain").ok, false);
});
test("an unaffordable incident response is rejected and losses stop at zero", () => {
  const state = advanceTo(fresh(), 1856); state.treasury.taiping = 1;
  E.armyById(state, "hong").strength = 1; E.armyById(state, "shi").strength = 0;
  assert.equal(E.resolveIncident(state, "contain").ok, false);
  const result = E.resolveIncident(state, "loss");
  assert.equal(result.ok, true); assert.equal(E.strength(result.state, "taiping"), 0);
  assert.equal(result.state.treasury.taiping, E.income(result.state, "taiping"));
});
test("1857 reduces the Shi Dakai piece exactly once", () => {
  let state = advanceTo(fresh(), 1857);
  assert.equal(E.armyById(state, "shi").strength, 2);
  state = E.endTurn(state).state; assert.equal(E.armyById(state, "shi").strength, 2);
});
test("attacking victory charges costs, captures the city and retreats survivors", () => {
  const state = battleSetup(20, 6);
  state.cities.anqing.owner = "qing";
  E.armyById(state, "shi").city = "tianjing";
  const before = JSON.stringify(state);
  const result = E.applyAction(state, "attack", "hong", "jiangnan");
  assert.equal(result.battle.outcome, "attacker"); assert.equal(result.state.cities.jiangnan.owner, "taiping");
  assert.equal(E.armyById(result.state, "hong").strength, 19); assert.equal(E.armyById(result.state, "imperial").strength, 3);
  assert.equal(result.state.cities[E.armyById(result.state, "imperial").city].owner, "qing");
  assert.equal(result.state.treasury.taiping, 10); assert.equal(result.state.ap, 2); assert.equal(JSON.stringify(state), before);
});
test("blocked retreat routes the defender without charging the opponent AP", () => {
  const state = battleSetup(20, 6);
  for (const city of D.cities) state.cities[city.id].owner = "taiping";
  state.cities.jiangnan.owner = "qing"; state.cities.beijing.owner = "qing";
  const result = E.applyAction(state, "attack", "hong", "jiangnan");
  assert.equal(E.armyById(result.state, "imperial").strength, 0);
  assert.equal(E.armyById(result.state, "imperial").city, "beijing"); assert.equal(result.state.ap, 2);
});
test("defender wins: attacker loses three at its origin and defender loses one", () => {
  const result = E.applyAction(battleSetup(4, 20), "attack", "hong", "jiangnan");
  assert.equal(result.battle.outcome, "defender"); assert.equal(E.armyById(result.state, "hong").strength, 1);
  assert.equal(E.armyById(result.state, "hong").city, "tianjing"); assert.equal(E.armyById(result.state, "imperial").strength, 19);
});
test("ties inflict two losses on each side without changing control", () => {
  let result;
  for (let seed = 0; seed < 1000; seed++) {
    const state = battleSetup(6, 6); state.seed = seed;
    const attempt = E.applyAction(state, "attack", "hong", "jiangnan");
    if (attempt.battle.outcome === "tie") { result = attempt; break; }
  }
  assert.ok(result); assert.equal(E.armyById(result.state, "hong").strength, 4);
  assert.equal(E.armyById(result.state, "imperial").strength, 4); assert.equal(result.state.cities.jiangnan.owner, "qing");
});
test("a one-strength victorious attacker cannot capture a capital", () => {
  let result;
  for (let seed = 0; seed < 1000; seed++) {
    const state = fresh({ seed });
    E.armyById(state, "hong").city = "tianjin"; E.armyById(state, "hong").strength = 1; state.cities.beijing.fort = 0;
    const attempt = E.applyAction(state, "attack", "hong", "beijing");
    if (attempt.battle.outcome === "no-capture") { result = attempt; break; }
  }
  assert.ok(result); assert.equal(result.state.result, null);
  assert.equal(result.state.cities.beijing.owner, "qing"); assert.equal(E.armyById(result.state, "hong").strength, 0);
});
test("capital capture ends the game immediately", () => {
  const state = fresh(); E.armyById(state, "hong").city = "tianjin"; E.armyById(state, "hong").strength = 20;
  const result = E.applyAction(state, "attack", "hong", "beijing");
  assert.equal(result.state.result.winner, "taiping"); assert.equal(result.state.result.reason, "capital");
  assert.equal(E.endTurn(result.state).ok, false);
});
test("event bonuses apply only to the correct side, city and year", () => {
  const state = fresh(); state.year = 1860;
  assert.equal(E.battlePreview(state, "hong", "jiangnan").attackerBonus, 3);
  state.year = 1861; assert.equal(E.battlePreview(state, "hong", "jiangnan").attackerBonus, 0);
  state.turn = "qing"; E.armyById(state, "imperial").city = "jiangnan";
  assert.equal(E.battlePreview(state, "imperial", "anqing").attackerBonus, 2);
  state.year = 1864; assert.equal(E.battlePreview(state, "imperial", "tianjing").attackerBonus, 2);
  state.turn = "taiping"; E.armyById(state, "hong").city = "suzhou"; state.year = 1862;
  assert.equal(E.battlePreview(state, "hong", "shanghai").defenderBonus, 2);
  state.year = 1863; assert.equal(E.battlePreview(state, "hong", "shanghai").defenderBonus, 0);
});
test("enemy armies in neutral territory block peaceful movement", () => {
  const state = fresh(); E.armyById(state, "imperial").city = "hefei";
  assert.equal(E.check(state, "move", "hong", "hefei").ok, false); assert.equal(E.check(state, "attack", "hong", "hefei").ok, true);
});
test("routed armies can recruit at the capital but cannot move first", () => {
  const state = fresh(); E.armyById(state, "hong").strength = 0;
  assert.equal(E.check(state, "move", "hong", "hefei").ok, false);
  assert.equal(E.armyById(act(state, "recruit", "hong", "tianjing"), "hong").strength, 2);
});
test("12 complete rounds end only after Qing's 1864 turn", () => {
  let state = fresh(), turns = 0;
  while (!state.result) {
    if (state.pending) state = E.resolveIncident(state, "loss").state;
    state = E.endTurn(state).state; turns++;
  }
  assert.equal(turns, 24); assert.equal(state.year, 1864); assert.equal(state.result.reason, "time"); assert.equal(state.result.winner, null);
});
test("save restore preserves dice and rejects malformed or duplicate army data", () => {
  const state = battleSetup(9, 6), parsed = E.parseSave(JSON.stringify(state));
  assert.equal(parsed.ok, true);
  assert.deepEqual(E.applyAction(parsed.state, "attack", "hong", "jiangnan"), E.applyAction(state, "attack", "hong", "jiangnan"));
  assert.equal(E.parseSave("not json").ok, false);
  const invalid = fresh(); invalid.armies[0].city = "unknown";
  assert.equal(E.parseSave(JSON.stringify(invalid)).ok, false);
  invalid.armies[0].city = "tianjing"; invalid.treasury.taiping = -1;
  assert.equal(E.parseSave(JSON.stringify(invalid)).ok, false);
  const duplicate = fresh(); duplicate.armies[1] = duplicate.armies[0];
  assert.equal(E.parseSave(JSON.stringify(duplicate)).ok, false);
  const missingCapital = fresh(); missingCapital.result = { reason: "capital", winner: "taiping" };
  assert.equal(E.parseSave(JSON.stringify(missingCapital)).ok, false);
  const falseEnding = fresh(); falseEnding.result = { reason: "time", winner: null };
  assert.equal(E.parseSave(JSON.stringify(falseEnding)).ok, false);
  const inheritedCity = fresh(); inheritedCity.armies[0].city = "constructor";
  assert.equal(E.parseSave(JSON.stringify(inheritedCity)).ok, false);
});
test("browser globals load without modules or network access", () => {
  const context = vm.createContext({});
  for (const file of ["data.js", "engine.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../dist", file), "utf8"), context, { filename: file });
  assert.equal(context.TaipingEngine.createGame({ seed: 1 }).year, 1853); assert.equal(context.TAIPING_DATA.cities.length, 14);
});
test("random campaigns preserve resource, occupancy and AP invariants", () => {
  for (let seed = 0; seed < 60; seed++) {
    let state = fresh({ seed, randomEvents: true }), steps = 0;
    while (!state.result && steps++ < 180) {
      if (state.pending) state = E.resolveIncident(state, "loss").state;
      const moves = [];
      for (const unit of state.armies.filter(a => a.faction === state.turn)) for (const city of D.cities) for (const action of Object.keys(D.actions)) if (E.check(state, action, unit.id, city.id).ok) moves.push([action, unit.id, city.id]);
      if (moves.length && steps % 4 !== 0) state = E.applyAction(state, ...moves[(seed * 17 + steps * 13) % moves.length]).state;
      else state = E.endTurn(state).state;
      assert.ok(state.ap >= 0 && state.ap <= 3); assert.ok(state.treasury.taiping >= 0 && state.treasury.qing >= 0);
      for (const unit of state.armies) {
        assert.ok(Number.isInteger(unit.strength) && unit.strength >= 0); assert.ok(D.cityById[unit.city]);
        if (unit.strength > 0) assert.notEqual(state.cities[unit.city].owner, unit.faction === "taiping" ? "qing" : "taiping");
      }
      assert.equal(E.parseSave(JSON.stringify(state)).ok, true);
    }
    assert.ok(state.result, "Campaign must terminate by 1864");
  }
});
