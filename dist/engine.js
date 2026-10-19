(function (root) {
  "use strict";
  const D = typeof module !== "undefined" && module.exports ? require("./data.js") : root.TAIPING_DATA;
  const copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  const other = function (side) { return side === "taiping" ? "qing" : "taiping"; };
  const armyById = function (state, id) { return state.armies.find(function (army) { return army.id === id; }); };
  const troopsAt = function (state, city, side) { return state.armies.filter(function (army) { return army.city === city && army.faction === side && army.strength > 0; }); };
  function log(state, message) {
    state.log.push({ year: state.year, side: state.turn, message: message });
    state.log = state.log.slice(-160);
  }
  function strength(state, side) {
    return state.armies.filter(function (army) { return army.faction === side; }).reduce(function (sum, army) { return sum + army.strength; }, 0);
  }
  function income(state, side) {
    return Math.min(8, D.cities.reduce(function (sum, city) { return sum + (state.cities[city.id].owner === side ? (city.capital === side ? 3 : 1) : 0); }, 0));
  }
  function random(state) {
    state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }
  function createGame(options) {
    options = options || {};
    const state = {
      version: 1, year: D.startYear, turn: "taiping", ap: 3,
      treasury: { taiping: 12, qing: 15 }, cities: {},
      armies: copy(D.armies), seed: (options.seed === undefined ? Date.now() : options.seed) >>> 0,
      randomEvents: Boolean(options.randomEvents), randomEvent: null, pending: null, result: null, log: []
    };
    D.cities.forEach(function (city) { state.cities[city.id] = { owner: city.owner, fort: city.fort }; });
    log(state, "The campaign begins in 1853. Starting treasuries: Taiping 12; Qing 15.");
    return state;
  }
  function check(state, action, armyId, targetId) {
    if (state.result) return { ok: false, reason: "This campaign has ended." };
    if (state.pending) return { ok: false, reason: "Resolve the Tianjing Incident first." };
    const spec = D.actions[action];
    if (!spec) return { ok: false, reason: "Unknown action." };
    const army = armyById(state, armyId);
    if (!army || army.faction !== state.turn) return { ok: false, reason: "Select an army belonging to the active side." };
    const cityId = targetId || army.city;
    const city = state.cities[cityId];
    if (!city) return { ok: false, reason: "Select a city on the map." };
    if (state.ap < spec.ap) return { ok: false, reason: "No action points remain. End this side's turn." };
    if (state.treasury[state.turn] < spec.money) return { ok: false, reason: "Not enough treasury for this action." };
    if (army.strength === 0 && action !== "recruit") return { ok: false, reason: "This army is routed. Recruit in its friendly city first." };
    const enemies = troopsAt(state, cityId, other(state.turn));
    if (action === "move" || action === "attack") {
      if (!D.neighbours[army.city].includes(cityId)) return { ok: false, reason: "Choose a city directly connected to this army." };
      const hostile = city.owner === other(state.turn) || enemies.length > 0;
      if (action === "move" && hostile) return { ok: false, reason: "Enemy forces or ownership block this route. Use Attack." };
      if (action === "attack" && !hostile) return { ok: false, reason: "This city is friendly or undefended neutral territory. Use Move." };
    } else {
      if (cityId !== army.city) return { ok: false, reason: "Select the city your army currently occupies." };
      if (action === "claim") {
        if (city.owner !== null) return { ok: false, reason: "Only neutral cities can be claimed." };
        if (enemies.length) return { ok: false, reason: "An enemy army contests this city." };
      } else if (city.owner !== state.turn) return { ok: false, reason: "Recruiting and fortifying require a friendly city." };
      if (action === "fortify" && city.fort >= 8) return { ok: false, reason: "This city already has the maximum 8 defence." };
    }
    return { ok: true, reason: spec.detail, cityId: cityId };
  }
  function attackBonus(state, army, target) {
    if (state.year === 1860 && army.faction === "taiping" && target === "jiangnan") return 3;
    if (state.year === 1861 && army.faction === "qing" && target === "anqing") return 2;
    if (state.year === 1864 && army.faction === "qing" && target === "tianjing") return 2;
    return 0;
  }
  function defenceBonus(state, side, target) {
    return state.year === 1862 && side === "qing" && ["shanghai", "suzhou"].includes(target) ? 2 : 0;
  }
  function battlePreview(state, armyId, target) {
    const valid = check(state, "attack", armyId, target);
    if (!valid.ok) return valid;
    const army = armyById(state, armyId);
    const defenders = troopsAt(state, target, other(army.faction));
    const fort = state.cities[target].fort;
    return {
      ok: true, attacker: army.strength, attackerBonus: attackBonus(state, army, target),
      defender: defenders.reduce(function (sum, unit) { return sum + unit.strength; }, 0),
      fort: fort, defenderBonus: defenceBonus(state, other(army.faction), target),
      defenderIds: defenders.map(function (unit) { return unit.id; })
    };
  }
  function damageArmies(armies, amount) {
    armies.slice().sort(function (a, b) { return b.strength - a.strength; }).forEach(function (army) {
      const loss = Math.min(army.strength, amount);
      army.strength -= loss;
      amount -= loss;
    });
    return amount;
  }
  function nearestFriendly(state, from, side, exclude) {
    const queue = [from], seen = new Set([from]);
    while (queue.length) {
      const id = queue.shift();
      if (id !== exclude && state.cities[id].owner === side && troopsAt(state, id, other(side)).length === 0) return id;
      D.neighbours[id].forEach(function (next) {
        if (!seen.has(next) && next !== exclude && state.cities[next].owner !== other(side) && troopsAt(state, next, other(side)).length === 0) {
          seen.add(next); queue.push(next);
        }
      });
    }
    return null;
  }
  function reorganise(state, army) {
    if (army.strength > 0) return;
    const capital = D.factions[army.faction].capital;
    const destination = state.cities[capital].owner === army.faction ? capital : nearestFriendly(state, army.city, army.faction, null);
    if (destination) army.city = destination;
  }
  function applyAction(input, action, armyId, targetId) {
    const valid = check(input, action, armyId, targetId);
    if (!valid.ok) return { ok: false, error: valid.reason };
    const state = copy(input), army = armyById(state, armyId), target = valid.cityId;
    const spec = D.actions[action], side = army.faction;
    state.ap -= spec.ap; state.treasury[side] -= spec.money;
    let battle = null;
    if (action === "move") {
      army.city = target;
      log(state, army.name + ": moved to " + D.cityById[target].en + (state.cities[target].owner === null ? " (neutral; not yet claimed)." : "."));
    }
    if (action === "claim") {
      state.cities[target].owner = side;
      log(state, D.factions[side].short + " claims " + D.cityById[target].en + ".");
    }
    if (action === "recruit") {
      army.strength += 2;
      log(state, army.name + ": recruited 2 strength at " + D.cityById[target].en + ".");
    }
    if (action === "fortify") {
      state.cities[target].fort = Math.min(8, state.cities[target].fort + 2);
      log(state, D.cityById[target].en + " is fortified to " + state.cities[target].fort + " defence.");
    }
    if (action === "attack") {
      const preview = battlePreview(input, armyId, target);
      const attackDie = Math.floor(random(state) * 6) + 1, defendDie = Math.floor(random(state) * 6) + 1;
      const attackPower = preview.attacker + preview.attackerBonus + attackDie;
      const defendPower = preview.defender + preview.fort + preview.defenderBonus + defendDie;
      const defenders = preview.defenderIds.map(function (id) { return armyById(state, id); });
      const notes = [];
      let outcome;
      if (attackPower > defendPower) {
        outcome = "attacker";
        damageArmies(defenders, 3);
        army.strength = Math.max(0, army.strength - 1);
        if (army.strength > 0) {
          state.cities[target].fort = 0;
          state.cities[target].owner = side;
          army.city = target;
          defenders.forEach(function (unit) {
            const destination = nearestFriendly(state, target, unit.faction, target);
            if (destination && unit.strength > 0) {
              unit.city = destination;
              notes.push(unit.name + ": retreated to " + D.cityById[destination].en + ".");
            } else {
              unit.strength = 0; reorganise(state, unit);
              notes.push(unit.name + ": routed; recruitment is required before acting.");
            }
          });
          if (D.cityById[target].capital === other(side)) state.result = { winner: side, reason: "capital", city: target };
        } else {
          outcome = "no-capture";
          notes.push("The attacker's last strength is lost. The city is not captured.");
        }
      } else if (attackPower < defendPower) {
        outcome = "defender";
        army.strength = Math.max(0, army.strength - 3);
        const remainder = damageArmies(defenders, 1);
        state.cities[target].fort = Math.max(0, state.cities[target].fort - remainder);
      } else {
        outcome = "tie";
        army.strength = Math.max(0, army.strength - 2);
        const remainder = damageArmies(defenders, 2);
        state.cities[target].fort = Math.max(0, state.cities[target].fort - remainder);
      }
      state.armies.forEach(function (unit) { reorganise(state, unit); });
      battle = Object.assign({}, preview, { attackDie: attackDie, defendDie: defendDie, attackPower: attackPower, defendPower: defendPower, outcome: outcome, notes: notes, target: target, armyId: armyId });
      const resultText = { attacker: "attacker wins", defender: "defender holds", tie: "tie; defender holds", "no-capture": "attacker wins the roll but cannot occupy" }[outcome];
      log(state, army.name + ": attack on " + D.cityById[target].en + ", " + attackPower + " vs " + defendPower + "; " + resultText + ". " + notes.join(" "));
    }
    return { ok: true, state: state, battle: battle };
  }
  function applyYearEvent(state) {
    state.pending = null;
    if (state.year === 1854) {
      state.armies.filter(function (army) { return army.faction === "taiping" && ["tianjin", "beijing"].includes(army.city); }).forEach(function (army) {
        army.strength = Math.max(0, army.strength - 2); reorganise(state, army);
        log(state, army.name + ": lost 2 strength to northern supply difficulties.");
      });
    }
    if (state.year === 1856) state.pending = "tianjing";
    if (state.year === 1857) {
      const army = armyById(state, "shi");
      army.strength = Math.max(0, army.strength - 2); reorganise(state, army);
      log(state, "Shi Dakai's departure: his game piece loses 2 strength.");
    }
  }
  function drawRandomEvent(state) {
    state.randomEvent = null;
    if (!state.randomEvents) return;
    const index = Math.floor(random(state) * 4);
    if (index === 0) {
      state.randomEvent = { title: "Flooding", text: "Both sides lose 2 treasury (minimum 0)." };
      ["taiping", "qing"].forEach(function (side) { state.treasury[side] = Math.max(0, state.treasury[side] - 2); });
    } else if (index === 1) {
      state.randomEvent = { title: "Famine", text: "Each side loses 1 total army strength." };
      ["taiping", "qing"].forEach(function (side) { damageArmies(state.armies.filter(function (army) { return army.faction === side; }), 1); });
      state.armies.forEach(function (army) { reorganise(state, army); });
    } else if (index === 2) {
      state.randomEvent = { title: "Successful harvest", text: "Both sides gain 2 treasury." };
      ["taiping", "qing"].forEach(function (side) { state.treasury[side] += 2; });
    } else state.randomEvent = { title: "An uneventful year", text: "No additional random effect." };
    log(state, "Optional random event: " + state.randomEvent.title + ". " + state.randomEvent.text);
  }
  function finishYearSetup(state) {
    drawRandomEvent(state);
    const receipts = {};
    ["taiping", "qing"].forEach(function (side) { receipts[side] = income(state, side); state.treasury[side] += receipts[side]; });
    log(state, "Annual income collected: Taiping +" + receipts.taiping + "; Qing +" + receipts.qing + ".");
  }
  function endTurn(input) {
    if (input.result) return { ok: false, error: "This campaign has ended." };
    if (input.pending) return { ok: false, error: "Resolve the Tianjing Incident first." };
    const state = copy(input);
    if (state.turn === "taiping") {
      state.turn = "qing"; state.ap = 3;
      log(state, "Qing's turn begins: 3 action points.");
      return { ok: true, state: state, newYear: false };
    }
    if (state.year === D.endYear) {
      state.result = { winner: null, reason: "time" };
      log(state, "The 1864 Qing turn ends. Neither capital has fallen: the classroom game is a stalemate.");
      return { ok: true, state: state, newYear: false };
    }
    state.year++; state.turn = "taiping"; state.ap = 3;
    log(state, String(state.year) + ": " + D.events[state.year].title + ".");
    applyYearEvent(state);
    if (!state.pending) finishYearSetup(state);
    return { ok: true, state: state, newYear: true };
  }
  function resolveIncident(input, choice) {
    if (input.pending !== "tianjing") return { ok: false, error: "No incident is awaiting a choice." };
    if (!["contain", "loss"].includes(choice)) return { ok: false, error: "Choose a valid response." };
    if (choice === "contain" && input.treasury.taiping < 4) return { ok: false, error: "Taiping needs 4 treasury to contain the penalty." };
    const state = copy(input);
    if (choice === "contain") {
      state.treasury.taiping -= 4;
      log(state, "Tianjing Incident: Taiping spends 4 treasury to contain the game penalty.");
    } else {
      state.treasury.taiping = Math.max(0, state.treasury.taiping - 3);
      damageArmies(state.armies.filter(function (army) { return army.faction === "taiping"; }), 2);
      state.armies.forEach(function (army) { reorganise(state, army); });
      log(state, "Tianjing Incident: Taiping loses 3 treasury and 2 total army strength.");
    }
    state.pending = null;
    finishYearSetup(state);
    return { ok: true, state: state };
  }
  function parseSave(text) {
    let state;
    try { state = JSON.parse(text); } catch (_) { return { ok: false, error: "This is not valid save text." }; }
    const integer = function (n, max) { return Number.isSafeInteger(n) && n >= 0 && n <= max; };
    if (!state || state.version !== 1 || !Number.isSafeInteger(state.year) || !integer(state.year - D.startYear, D.endYear - D.startYear) || !["taiping", "qing"].includes(state.turn) || !integer(state.ap, 3)) return { ok: false, error: "The save has an invalid version, year or turn." };
    if (!state.treasury || !["taiping", "qing"].every(function (side) { return integer(state.treasury[side], 100000); })) return { ok: false, error: "Invalid treasury values." };
    if (!state.cities || !D.cities.every(function (city) { const entry = state.cities[city.id]; return entry && [null, "taiping", "qing"].includes(entry.owner) && integer(entry.fort, 8); })) return { ok: false, error: "Invalid city values." };
    if (!Array.isArray(state.armies) || state.armies.length !== 4 || !D.armies.every(function (unit) {
      const matches = state.armies.filter(function (army) { return army.id === unit.id; });
      return matches.length === 1 && matches[0].faction === unit.faction && D.cities.some(function (city) { return city.id === matches[0].city; }) && integer(matches[0].strength, 10000);
    })) return { ok: false, error: "Invalid army values." };
    if (!integer(state.seed, 4294967295) || typeof state.randomEvents !== "boolean" || ![null, "tianjing"].includes(state.pending)) return { ok: false, error: "Invalid event state." };
    if (state.pending && (state.year !== 1856 || state.turn !== "taiping" || state.result)) return { ok: false, error: "The incident does not match this campaign year." };
    if (state.result !== null && (!state.result || ![null, "taiping", "qing"].includes(state.result.winner) || !["capital", "time"].includes(state.result.reason))) return { ok: false, error: "Invalid campaign outcome." };
    if (state.result && state.result.reason === "capital") {
      if (!["taiping", "qing"].includes(state.result.winner) || state.result.city !== D.factions[other(state.result.winner)].capital || state.cities[state.result.city].owner !== state.result.winner) return { ok: false, error: "The captured capital does not match this outcome." };
    }
    if (state.result && state.result.reason === "time" && (state.result.winner !== null || state.year !== D.endYear || state.turn !== "qing")) return { ok: false, error: "A time-limit outcome must follow Qing's 1864 turn." };
    if (state.armies.some(function (army) { return army.strength > 0 && state.cities[army.city].owner === other(army.faction); })) return { ok: false, error: "An army cannot occupy an enemy-controlled city." };
    if ((!state.result || state.result.reason === "time") && ["taiping", "qing"].some(function (side) { return state.cities[D.factions[side].capital].owner !== side; })) return { ok: false, error: "Capital ownership does not match an unfinished campaign or stalemate." };
    const clean = createGame({ seed: state.seed, randomEvents: state.randomEvents });
    ["year", "turn", "ap", "treasury", "pending", "result"].forEach(function (key) { clean[key] = copy(state[key]); });
    D.cities.forEach(function (city) { clean.cities[city.id] = { owner: state.cities[city.id].owner, fort: state.cities[city.id].fort }; });
    clean.armies = D.armies.map(function (unit) {
      const saved = state.armies.find(function (army) { return army.id === unit.id; });
      return Object.assign({}, unit, { city: saved.city, strength: saved.strength });
    });
    clean.log = Array.isArray(state.log) ? state.log.filter(function (entry) { return entry && typeof entry.message === "string" && integer(entry.year - D.startYear, D.endYear - D.startYear) && ["taiping", "qing"].includes(entry.side); }).slice(-160).map(function (entry) { return { year: entry.year, side: entry.side, message: entry.message.slice(0, 1500) }; }) : [];
    clean.randomEvent = state.randomEvent && typeof state.randomEvent.title === "string" && typeof state.randomEvent.text === "string" ? { title: state.randomEvent.title.slice(0, 120), text: state.randomEvent.text.slice(0, 500) } : null;
    return { ok: true, state: clean };
  }
  const api = { createGame: createGame, check: check, applyAction: applyAction, endTurn: endTurn, resolveIncident: resolveIncident, battlePreview: battlePreview, income: income, strength: strength, armyById: armyById, troopsAt: troopsAt, parseSave: parseSave, copy: copy };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TaipingEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
