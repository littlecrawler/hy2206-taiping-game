(function (root) {
  "use strict";
  const D = typeof module !== "undefined" && module.exports ? require("./data.js") : root.TAIPING_DATA;
  const copy = value => JSON.parse(JSON.stringify(value));
  const other = side => side === "taiping" ? "qing" : "taiping";
  const armyById = (state, id) => state.armies.find(army => army.id === id);
  const troopsAt = (state, city, side) => state.armies.filter(army => army.city === city && army.faction === side && army.strength > 0);
  const strength = (state, side) => state.armies.filter(army => army.faction === side).reduce((sum, army) => sum + army.strength, 0);
  const cityCount = (state, side) => D.cities.filter(city => state.cities[city.id].owner === side).length;
  const scores = state => ({ taiping: cityCount(state, "taiping"), qing: cityCount(state, "qing") });
  function log(state, message) {
    state.log.push({ year: state.year, side: state.turn, message });
    state.log = state.log.slice(-100);
  }
  function random(state) {
    state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }
  function createGame(options) {
    const state = {
      version: D.version, year: D.startYear, turn: "taiping", ap: D.actionsPerTurn,
      reserves: copy(D.startingReserves), resupplyReceived: false, cities: {}, armies: copy(D.armies),
      seed: ((options || {}).seed === undefined ? Date.now() : options.seed) >>> 0,
      result: null, log: []
    };
    D.cities.forEach(city => { state.cities[city.id] = { owner: city.owner }; });
    log(state, "1853: each team starts with 3 cities. Two actions per team each year.");
    return state;
  }
  function actionFor(state, armyId, target) {
    const army = armyById(state, armyId);
    return army && troopsAt(state, target, other(army.faction)).length ? "attack" : "move";
  }
  function check(state, action, armyId, targetId) {
    if (state.result) return { ok: false, reason: "This game is complete. Start a new game to play again." };
    if (!D.actions[action]) return { ok: false, reason: "Choose Move, Attack or Reinforce." };
    const army = armyById(state, armyId);
    if (!army || army.faction !== state.turn) return { ok: false, reason: "Choose one of the active team's armies." };
    if (state.ap === 0) return { ok: false, reason: "Both actions are used. Click Next team." };
    const cityId = targetId || army.city;
    if (!Object.prototype.hasOwnProperty.call(state.cities, cityId)) return { ok: false, reason: "Choose a destination on the map." };
    if (action === "recruit") {
      if (state.reserves[state.turn] < 1) return { ok: false, reason: "No reinforcement tokens remain. Move or attack with a surviving army." };
      if (cityId !== army.city || state.cities[army.city].owner !== army.faction) return { ok: false, reason: "Reinforce at the army's own city." };
      if (army.strength >= D.maxStrength) return { ok: false, reason: "This army already has the maximum 10 strength." };
    } else {
      if (!army.strength) return { ok: false, reason: "This army has no strength. Reinforce it or select another army." };
      if (!D.neighbours[army.city].includes(cityId)) return { ok: false, reason: "Choose one of the connected destinations listed below." };
      const expected = actionFor(state, armyId, cityId);
      if (action !== expected) return { ok: false, reason: expected === "attack" ? "An enemy army is here. Choose Attack city." : "No enemy army is here. Move in to take the city without a battle." };
    }
    return { ok: true, cityId, reason: D.actions[action].detail };
  }
  function battlePreview(state, armyId, target) {
    const valid = check(state, "attack", armyId, target);
    if (!valid.ok) return valid;
    const army = armyById(state, armyId), defenders = troopsAt(state, target, other(army.faction));
    return { ok: true, attacker: army.strength, defender: defenders.reduce((sum, unit) => sum + unit.strength, 0), defenderIds: defenders.map(unit => unit.id) };
  }
  function hasLegalAction(state) {
    return state.armies.some(army => army.faction === state.turn && (
      check(state, "recruit", army.id, army.city).ok ||
      D.neighbours[army.city].some(target => check(state, actionFor(state, army.id, target), army.id, target).ok)
    ));
  }
  function damage(armies, amount) {
    armies.slice().sort((a, b) => b.strength - a.strength).forEach(army => {
      const lost = Math.min(amount, army.strength);
      army.strength -= lost; amount -= lost;
    });
  }
  function nearestFriendly(state, from, side) {
    const queue = [from], seen = new Set([from]);
    while (queue.length) {
      const id = queue.shift();
      if (state.cities[id].owner === side && !troopsAt(state, id, other(side)).length) return id;
      for (const next of D.neighbours[id]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return null;
  }
  function regroup(state, army) {
    const destination = nearestFriendly(state, army.city, army.faction);
    if (destination) army.city = destination;
    else army.strength = 0;
  }
  function applyAction(input, action, armyId, targetId) {
    const valid = check(input, action, armyId, targetId);
    if (!valid.ok) return { ok: false, error: valid.reason };
    const state = copy(input), army = armyById(state, armyId), target = valid.cityId;
    const previousOwner = state.cities[target].owner;
    state.ap--;
    let battle = null, captured = false;
    if (action === "move") {
      army.city = target;
      captured = previousOwner !== army.faction;
      state.cities[target].owner = army.faction;
      log(state, army.name + (captured ? " captured " : " moved to ") + D.cityById[target].en + ".");
    }
    if (action === "recruit") {
      const added = Math.min(2, D.maxStrength - army.strength);
      army.strength += added; state.reserves[army.faction]--;
      log(state, army.name + ": reinforced by " + added + ". " + state.reserves[army.faction] + " reinforcement tokens remain.");
    }
    if (action === "attack") {
      const preview = battlePreview(input, armyId, target);
      const attackDie = Math.floor(random(state) * 6) + 1, defendDie = Math.floor(random(state) * 6) + 1;
      const attackPower = preview.attacker + attackDie, defendPower = preview.defender + defendDie;
      const defenders = preview.defenderIds.map(id => armyById(state, id));
      const notes = [];
      let outcome;
      if (attackPower > defendPower) {
        outcome = "attacker";
        army.strength = Math.max(1, army.strength - 1);
        damage(defenders, 2);
        state.cities[target].owner = army.faction; army.city = target; captured = true;
        defenders.forEach(unit => {
          regroup(state, unit);
          notes.push(unit.name + (unit.strength ? " retreats to " + D.cityById[unit.city].en + "." : " has no strength; reinforce to return."));
        });
      } else if (attackPower < defendPower) {
        outcome = "defender";
        army.strength = Math.max(0, army.strength - 2);
        // A winning force always keeps at least one soldier.
        if (preview.defender > 1) damage(defenders, 1);
      } else {
        outcome = "tie";
        army.strength = Math.max(0, army.strength - 1);
        damage(defenders, 1);
      }
      state.armies.filter(unit => unit.strength === 0).forEach(unit => regroup(state, unit));
      battle = { ...preview, attackDie, defendDie, attackPower, defendPower, outcome, notes, target, armyId };
      log(state, army.name + ": " + attackPower + " vs " + defendPower + " at " + D.cityById[target].en + ". " + (captured ? D.factions[army.faction].short + " captures the city." : "Defender keeps the city."));
    }
    if (captured && target === "beijing" && army.faction === "taiping") {
      state.result = { winner: "taiping", reason: "beijing", city: "beijing", scores: scores(state) };
      log(state, "Taiping captures Beijing: Northern Expedition victory.");
    }
    return { ok: true, state, battle, captured, previousOwner };
  }
  function endTurn(input) {
    if (input.result) return { ok: false, error: "This game is already complete." };
    const state = copy(input);
    if (state.ap > 0) log(state, D.factions[state.turn].short + " ends its turn early with " + state.ap + (state.ap === 1 ? " unused action." : " unused actions."));
    if (state.turn === "qing" && state.year === D.endYear) {
      const total = scores(state);
      state.result = { winner: total.taiping === total.qing ? null : total.taiping > total.qing ? "taiping" : "qing", reason: "cities", scores: total };
      state.ap = 0;
      log(state, "1864 ends: Taiping " + total.taiping + " cities, Qing " + total.qing + " cities. " + (state.result.winner ? D.factions[state.result.winner].short + " wins." : "The game is a draw."));
      return { ok: true, state, newYear: false };
    }
    const newYear = state.turn === "qing";
    if (newYear) state.year++;
    state.turn = other(state.turn); state.ap = D.actionsPerTurn;
    const resupplied = grantResupply(state);
    log(state, D.factions[state.turn].short + " acts in " + state.year + ": 2 actions available.");
    return { ok: true, state, newYear, resupplied };
  }
  function grantResupply(state) {
    if (state.result || state.year < D.resupply.year || state.resupplyReceived) return false;
    for (const side of ["taiping", "qing"]) state.reserves[side] += D.resupply.tokens;
    state.resupplyReceived = true;
    log(state, D.resupply.year + " resupply: Taiping and Qing each receive " + D.resupply.tokens + " reinforcement tokens.");
    return true;
  }
  function parseSave(text) {
    let saved;
    try { saved = JSON.parse(text); } catch (_) { return { ok: false, error: "This is not valid save text." }; }
    if (saved && [1, 2].includes(saved.version)) return { ok: false, error: "This save uses the older treasury rules. Start a new game for the two-action classroom edition." };
    const integer = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
    if (!saved || saved.version !== D.version || !Number.isSafeInteger(saved.year) || !integer(saved.year - D.startYear, D.endYear - D.startYear) || !["taiping", "qing"].includes(saved.turn) || !integer(saved.ap, D.actionsPerTurn)) return { ok: false, error: "Invalid version, year or turn." };
    if ((saved.resupplyReceived !== undefined && typeof saved.resupplyReceived !== "boolean") || (saved.resupplyReceived && saved.year < D.resupply.year)) return { ok: false, error: "Invalid resupply status." };
    const tokenBonus = saved.resupplyReceived ? D.resupply.tokens : 0;
    if (!saved.reserves || !["taiping", "qing"].every(side => integer(saved.reserves[side], D.startingReserves[side] + tokenBonus))) return { ok: false, error: "Invalid reinforcement tokens." };
    if (!saved.cities || !D.cities.every(city => saved.cities[city.id] && [null, "taiping", "qing"].includes(saved.cities[city.id].owner))) return { ok: false, error: "Invalid city control." };
    if (!Array.isArray(saved.armies) || saved.armies.length !== D.armies.length || !D.armies.every(unit => {
      const matches = saved.armies.filter(army => army && army.id === unit.id);
      return matches.length === 1 && matches[0].faction === unit.faction && Object.prototype.hasOwnProperty.call(D.cityById, matches[0].city) && integer(matches[0].strength, D.maxStrength);
    })) return { ok: false, error: "Invalid army values." };
    if (!integer(saved.seed, 4294967295)) return { ok: false, error: "Invalid dice sequence." };
    if (saved.armies.some(army => army.strength > 0 && saved.cities[army.city].owner !== army.faction)) return { ok: false, error: "An active army must occupy its own city." };
    const total = scores(saved), expectedWinner = total.taiping === total.qing ? null : total.taiping > total.qing ? "taiping" : "qing";
    if (saved.result !== null) {
      const result = saved.result;
      if (!result || !["beijing", "cities"].includes(result.reason)) return { ok: false, error: "Invalid game outcome." };
      if (result.reason === "beijing" && (result.winner !== "taiping" || result.city !== "beijing" || saved.cities.beijing.owner !== "taiping")) return { ok: false, error: "Beijing has not been captured by Taiping." };
      if (result.reason === "cities" && (saved.year !== 1864 || saved.turn !== "qing" || saved.ap !== 0 || result.winner !== expectedWinner)) return { ok: false, error: "The final score does not match this outcome." };
    }
    if (saved.cities.beijing.owner === "taiping" && (!saved.result || saved.result.reason !== "beijing")) return { ok: false, error: "Capturing Beijing must end the game." };
    const clean = createGame({ seed: saved.seed });
    for (const key of ["year", "turn", "ap", "reserves", "result"]) clean[key] = copy(saved[key]);
    clean.resupplyReceived = saved.resupplyReceived === true;
    D.cities.forEach(city => { clean.cities[city.id] = { owner: saved.cities[city.id].owner }; });
    clean.armies = D.armies.map(unit => {
      const army = saved.armies.find(savedArmy => savedArmy.id === unit.id);
      return { ...unit, city: army.city, strength: army.strength };
    });
    if (clean.result) clean.result.scores = total;
    clean.log = Array.isArray(saved.log) ? saved.log.filter(entry => entry && typeof entry.message === "string" && integer(entry.year - D.startYear, 11) && ["taiping", "qing"].includes(entry.side)).slice(-100).map(entry => ({ year: entry.year, side: entry.side, message: entry.message.slice(0, 1000) })) : [];
    const resupplied = grantResupply(clean);
    return { ok: true, state: clean, resupplied };
  }
  const api = { createGame, check, applyAction, endTurn, battlePreview, actionFor, hasLegalAction, cityCount, scores, strength, armyById, troopsAt, parseSave, copy };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TaipingEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
