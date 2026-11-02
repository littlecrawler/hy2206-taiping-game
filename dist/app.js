(function () {
  "use strict";
  const D = window.TAIPING_DATA, E = window.TaipingEngine, S = window.TaipingSound;
  const mapAssets = window.TAIPING_MAP_ASSETS || { early: "assets/early-map.jpg", late: "assets/late-map.jpg" };
  const imageAsset = name => window.TAIPING_IMAGE_ASSETS?.[name] || 'assets/images/' + name + '.png';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#icon-' + name + '"/></svg>';
  const cityName = id => D.cityById[id].en + " " + D.cityById[id].zh;
  const sideName = side => side ? D.factions[side].short : "Neutral";
  const color = side => side ? D.factions[side].color : "#858c7d";
  let game = E.createGame(), selectedArmy = "hong", selectedCity = "tianjing", route = "all", zoom = 1;
  let turnStartCities = E.copy(game.cities), lastCapture = null, undoStack = [], modalView = null, toastTimeout;
  const army = () => E.armyById(game, selectedArmy);
  function toast(message) {
    $("toast").textContent = message; $("toast").classList.add("visible");
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $("toast").classList.remove("visible"), 4500);
  }
  S.setErrorHandler(() => toast("Audio could not play. Open the settings button and choose Test sound to retry."));
  function renderSound() {
    const enabled = S.isEnabled(), button = $("sound-toggle");
    button.setAttribute("aria-pressed", String(enabled));
    button.title = enabled ? "Mute sound effects" : "Enable sound effects";
    button.innerHTML = icon(enabled ? "sound" : "muted") + "<span>Sound " + (enabled ? "on" : "off") + "</span>";
  }
  function remember() {
    undoStack.push({ game: E.copy(game), selectedArmy, selectedCity, turnStartCities: E.copy(turnStartCities), lastCapture: E.copy(lastCapture) });
    undoStack = undoStack.slice(-40);
  }
  function chooseActiveArmy() {
    selectedArmy = (game.armies.find(unit => unit.faction === game.turn && unit.strength > 0) || game.armies.find(unit => unit.faction === game.turn)).id;
    selectedCity = army().city;
  }
  function renderYears() {
    $("year-number").textContent = game.year;
    $("year-track").innerHTML = Object.keys(D.events).map(year => '<button class="year-stop' + (Number(year) === game.year ? ' current' : Number(year) < game.year ? ' past' : '') + '" data-year="' + year + '" aria-label="' + year + ': ' + esc(D.events[year].title) + '"' + (Number(year) === game.year ? ' aria-current="step"' : '') + '><i>' + (Number(year) === game.year ? '•' : Number(year) < game.year ? '✓' : '') + '</i><span>' + (year === '1853' ? year : year.slice(-2)) + '</span></button>').join('');
    $("turn-status").innerHTML = game.result
      ? '<div class="result-banner" style="color:' + color(game.result.winner) + '">' + (game.result.winner ? sideName(game.result.winner) + ' wins' : 'Draw') + '</div><p class="round-label">' + E.cityCount(game, 'taiping') + ' Taiping cities · ' + E.cityCount(game, 'qing') + ' Qing cities</p>'
      : '<div class="turn-label" style="color:' + color(game.turn) + '"><i class="owner-dot ' + game.turn + '"></i>' + sideName(game.turn) + "'s turn</div><p class=\"round-label\">Year " + (game.year - 1852) + ' of 12 · <b>' + (game.ap ? game.ap + (game.ap === 1 ? ' action left' : ' actions left') : 'Both actions used — next team') + '</b></p>';
  }
  function renderForces() {
    $("forces").innerHTML = ['taiping', 'qing'].map(side => '<section class="faction-card' + (side === game.turn && !game.result ? ' active' : '') + '" style="--side:' + color(side) + '"><div class="faction-title"><h3>' + sideName(side) + '</h3><span>' + D.factions[side].chinese + '</span></div><p class="faction-subtitle">' + (side === game.turn && !game.result ? 'YOUR TURN · CHOOSE ONE ARMY' : 'WAITING FOR NEXT TURN') + '</p><div class="resource-grid"><div><div class="value">' + E.cityCount(game, side) + '</div><div class="label">Cities / score</div></div><div><div class="value">' + E.strength(game, side) + '</div><div class="label">Army strength</div></div></div><p class="reserve-count">' + game.reserves[side] + ' reinforcement tokens <span>1 token = +2 strength</span></p><div class="army-list">' + game.armies.filter(unit => unit.faction === side).map(unit => '<button class="army-button' + (unit.id === selectedArmy ? ' selected' : '') + '" data-army="' + unit.id + '" aria-pressed="' + (unit.id === selectedArmy) + '"' + (side !== game.turn || game.result ? ' disabled' : '') + '><span class="army-monogram troop-portrait"><img src="' + imageAsset(side + '-troop') + '" alt="' + sideName(side) + ' soldier"></span><span class="army-copy"><span class="army-name">' + esc(unit.name) + '</span><span class="army-place">' + esc(cityName(unit.city)) + (unit.strength ? '' : ' · reinforce to return') + '</span></span><span class="army-strength">' + unit.strength + '</span></button>').join('') + '</div></section>').join('');
  }
  function renderTurnBanner() {
    const side = game.result ? game.result.winner : game.turn;
    const nextSide = game.turn === 'taiping' ? 'qing' : 'taiping';
    const finalTurn = game.turn === 'qing' && game.year === D.endYear;
    const title = game.result ? (side ? sideName(side) + ' wins!' : 'Draw') : sideName(side) + "'s turn";
    const remaining = game.result ? 'Game complete' : game.ap + ' / ' + D.actionsPerTurn + ' actions left';
    const detail = game.result ? 'Final score: Taiping ' + E.cityCount(game, 'taiping') + ' · Qing ' + E.cityCount(game, 'qing')
      : game.ap ? (finalTurn ? 'Use actions or End turn early to see the final score.' : 'Use actions or End turn early to hand over to ' + sideName(nextSide) + '.')
      : finalTurn ? 'Both actions used. Click Show final score.'
      : 'Both actions used. Click Next team: ' + sideName(nextSide) + '.';
    $("turn-banner").style.setProperty('--turn-color', color(side));
    $("turn-banner").innerHTML = '<div class="turn-banner-team">' + (side ? '<img src="' + imageAsset(side + '-troop') + '" alt="">' : '') + '<div><p class="turn-banner-year">' + game.year + ' · YEAR ' + (game.year - D.startYear + 1) + ' OF 12</p><h2>' + title + '</h2></div></div><div class="turn-banner-progress"><strong>' + remaining + '</strong><span>' + detail + '</span></div>';
    if (!game.result && game.year === D.resupply.year && game.resupplyReceived) $("turn-banner").querySelector('.turn-banner-progress').insertAdjacentHTML('beforeend', '<span>' + D.resupply.year + ' resupply received: +' + D.resupply.tokens + ' tokens per team.</span>');
    $("orders-title").textContent = game.result ? 'Game complete' : sideName(game.turn) + ' orders';
  }
  function renderMap() {
    const current = army(), neighbours = D.neighbours[current.city];
    const width = 495 / zoom, height = 625 / zoom;
    let vx = 285, vy = 75;
    if (zoom !== 1) { vx = Math.max(0, Math.min(777 - width, D.cityById[selectedCity].x - width / 2)); vy = Math.max(0, Math.min(950 - height, D.cityById[selectedCity].y - height / 2)); }
    $("campaign-map").setAttribute('viewBox', [vx, vy, width, height].join(' '));
    let html = '<image class="atlas-image" href="' + mapAssets.early + '" width="777" height="1139" aria-hidden="true"/><rect class="map-wash" width="777" height="1139" aria-hidden="true"/>';
    html += D.edges.map(edge => {
      const a = D.cityById[edge[0]], b = D.cityById[edge[1]];
      const available = edge[0] === current.city || edge[1] === current.city;
      const lineColor = D.routes.find(item => item.id === edge[2])?.color || '#979b8d';
      return '<path class="route-line ' + edge[2] + (available && game.ap && !game.result ? ' available' : '') + (route !== 'all' && route !== edge[2] ? ' dimmed' : '') + '" d="M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y + '" stroke="' + lineColor + '" aria-hidden="true"/>';
    }).join('');
    html += D.cities.map(city => {
      const owner = game.cities[city.id].owner;
      return '<g class="city-group' + (selectedCity === city.id ? ' selected' : '') + (neighbours.includes(city.id) && game.ap && !game.result ? ' available' : '') + '" data-map-city="' + city.id + '" data-owner="' + (owner || 'neutral') + '" role="button" tabindex="0" aria-pressed="' + (selectedCity === city.id) + '" aria-label="' + esc(cityName(city.id) + ', controlled by ' + sideName(owner)) + '"><title>' + esc(cityName(city.id) + ' — controlled by ' + sideName(owner)) + '</title><circle class="city-hit" cx="' + city.x + '" cy="' + city.y + '" r="18"/><path class="label-leader" d="M' + city.x + ' ' + city.y + ' L' + (city.lx > city.x ? city.lx - 3 : city.lx + Math.min(city.en.length * 5, 93)) + ' ' + (city.ly - 2) + '"/><circle class="city-ring" cx="' + city.x + '" cy="' + city.y + '" r="15"/><circle class="city-node" cx="' + city.x + '" cy="' + city.y + '" r="' + (owner ? 10 : 7) + '" fill="' + color(owner) + '"/>' + (city.capital ? '<text class="capital-star" x="' + city.x + '" y="' + (city.y + 4) + '" text-anchor="middle">★</text>' : '') + '<text class="city-label" x="' + city.lx + '" y="' + city.ly + '" style="fill:' + color(owner) + '">' + city.en + '<tspan class="city-label-cn" x="' + city.lx + '" dy="12">' + city.zh + (city.alias ? ' · Nanjing' : '') + '</tspan></text></g>';
    }).join('');
    game.armies.filter(unit => unit.strength > 0).forEach(unit => {
      const city = D.cityById[unit.city], index = game.armies.filter(candidate => candidate.city === unit.city && candidate.strength > 0).findIndex(candidate => candidate.id === unit.id);
      const x = city.x + 16 + index * 34, y = city.y - 15;
      html += '<g data-map-army="' + unit.id + '" data-army-city="' + unit.city + '" role="button" tabindex="0" aria-label="' + esc(unit.name + ', ' + unit.strength + ' strength at ' + cityName(unit.city)) + '"><defs><clipPath id="troop-clip-' + unit.id + '"><rect x="' + x + '" y="' + y + '" width="28" height="28" rx="4"/></clipPath></defs><rect class="troop-frame' + (selectedArmy === unit.id ? ' selected' : '') + '" x="' + (x - 1) + '" y="' + (y - 1) + '" width="30" height="30" rx="5" fill="white" stroke="' + color(unit.faction) + '"/><image href="' + imageAsset(unit.faction + '-troop') + '" x="' + x + '" y="' + y + '" width="28" height="28" preserveAspectRatio="xMidYMid slice" clip-path="url(#troop-clip-' + unit.id + ')"/><rect x="' + (x + 17) + '" y="' + (y + 19) + '" width="16" height="15" rx="3" fill="' + color(unit.faction) + '" stroke="white" stroke-width="1"/><text class="token-value" x="' + (x + 25) + '" y="' + (y + 30) + '" text-anchor="middle">' + unit.strength + '</text></g>';
    });
    $("campaign-map").innerHTML = html;
    document.querySelectorAll('[data-route]').forEach(button => { button.classList.toggle('active', button.dataset.route === route); button.setAttribute('aria-pressed', button.dataset.route === route); });
    $("zoom-out").disabled = zoom <= .8; $("zoom-in").disabled = zoom >= 1.7;
    $("capture-status").style.borderColor = lastCapture ? color(lastCapture.owner) : '#c7c6b8';
    $("capture-status").textContent = lastCapture ? sideName(lastCapture.owner) + ' captured ' + cityName(lastCapture.city) + '. ' + (lastCapture.owner === 'taiping' ? 'Red' : 'Blue') + ' city = ' + sideName(lastCapture.owner) + ' control.' : 'City circles show control. Soldier portraits show armies; numbers show strength.';
  }
  function renderOrders() {
    const unit = army(), owner = game.cities[selectedCity].owner, targetAction = E.actionFor(game, selectedArmy, selectedCity);
    const travel = E.check(game, targetAction, selectedArmy, selectedCity), recruit = E.check(game, 'recruit', selectedArmy, unit.city);
    const cannotAct = !game.result && game.ap > 0 && !E.hasLegalAction(game);
    const taking = owner !== unit.faction;
    const travelLabel = selectedCity === unit.city ? 'Choose a destination' : targetAction === 'attack' ? 'Attack city' : taking ? 'Move & capture' : 'Move army';
    $("ap-label").textContent = game.result ? 'GAME COMPLETE' : game.ap ? game.ap + (game.ap === 1 ? ' ACTION LEFT' : ' ACTIONS LEFT') : 'ACTIONS USED';
    $("selection").innerHTML = '<p class="eyebrow">1 · YOUR ARMY</p><h3 class="selected-army-name">' + esc(unit.name) + '</h3><p class="selected-army-location">From <b>' + esc(cityName(unit.city)) + '</b> · ' + unit.strength + ' strength</p><div class="city-selection"><div><p class="eyebrow">2 · SELECTED CITY</p><div class="city-name">' + esc(cityName(selectedCity)) + '</div><div class="control-pill" style="--side:' + color(owner) + '">' + (owner ? 'Controlled by ' + sideName(owner) : 'Neutral — take it by moving in') + '</div></div></div>';
    $("destinations").innerHTML = game.result || !game.ap ? '' : '<p class="eyebrow">CONNECTED DESTINATIONS</p><div class="destination-list">' + D.neighbours[unit.city].map(id => {
      const enemy = E.troopsAt(game, id, unit.faction === 'taiping' ? 'qing' : 'taiping').reduce((n, item) => n + item.strength, 0);
      return '<button data-destination="' + id + '" class="destination-button' + (selectedCity === id ? ' chosen' : '') + '" aria-pressed="' + (selectedCity === id) + '"><b>' + esc(cityName(id)) + '</b><span>' + (enemy ? 'Enemy army · ' + enemy + ' strength' : game.cities[id].owner === unit.faction ? 'Friendly city' : 'Empty city · capture on arrival') + '</span></button>';
    }).join('') + '</div>';
    $("actions").innerHTML = '<button class="action-button" data-action="' + targetAction + '"' + (travel.ok ? '' : ' disabled') + ' title="' + esc(travel.reason) + '">' + icon(targetAction) + '<span class="action-name">' + travelLabel + '</span><span class="cost">1 action</span></button><button class="action-button" data-action="recruit"' + (recruit.ok ? '' : ' disabled') + ' title="' + esc(recruit.reason) + '">' + icon('recruit') + '<span class="action-name">Reinforce +' + Math.max(0, Math.min(2, 10 - unit.strength)) + '</span><span class="cost">1 action + 1 token</span></button>';
    $("action-hint").textContent = game.result ? 'Game complete. Open Results to see the outcome.' : !game.ap ? 'Both actions are complete. Click Next team to continue.' : cannotAct ? 'No army can move, attack or reinforce. Click End turn early to continue.' : !unit.strength ? 'This army has no strength. Reinforce it with a token, choose another army, or end the turn early.' : selectedCity === unit.city ? 'Choose a connected destination above, reinforce this army, or end the turn early.' : travel.reason;
    $("end-turn").disabled = Boolean(game.result);
    $("end-turn").innerHTML = game.result ? 'Game complete' : game.ap ? 'End turn early ' + icon('arrow') : (game.turn === 'qing' && game.year === 1864 ? 'Show final score ' : 'Next team: ' + sideName(game.turn === 'taiping' ? 'qing' : 'taiping') + ' ') + icon('arrow');
    $("undo").disabled = undoStack.length === 0;
  }
  function renderEvent() {
    const event = D.events[game.year];
    $("event-card").innerHTML = '<div class="event-eyebrow"><span>HISTORY / ' + game.year + '</span><span>No game penalty</span></div><h3>' + event.title + '</h3><p>' + event.text + '</p><button class="text-button" data-year="' + game.year + '">Read historical context ↗</button>';
  }
  function render() {
    renderYears(); renderForces(); renderMap(); renderOrders(); renderEvent(); renderTurnBanner();
    $("recent-log").innerHTML = game.log.slice(-3).reverse().map(entry => '<div class="log-line"><span class="log-year">' + entry.year + '</span><span>' + esc(entry.message) + '</span></div>').join('');
  }
  function closeDialog() { $("modal").close(); modalView = null; }
  function setDialog(html, kicker, wide) {
    $("modal-body").innerHTML = html; $("modal-kicker").textContent = kicker || 'CLASSROOM EDITION · V3';
    $("modal").classList.toggle('dialog-wide', Boolean(wide));
    if (!$("modal").open) $("modal").showModal();
  }
  function openView(type, extra) { modalView = { type, ...extra }; renderModal(); $("modal").scrollTop = 0; }
  function rulesHtml() {
    return '<h2 id="modal-title">Learn the game in 30 seconds.</h2><div class="quick-rules"><div><b>1. Up to two actions each year</b><p>1853–1864: Taiping goes first, then Qing. Each team has up to two actions, shared across its armies. Click End turn early to skip unused actions, or Next team after using both. Unused actions do not carry over.</p></div><div><b>2. Take cities</b><p>Choose your army, then a connected city. Moving into an empty city captures it automatically. Red = Taiping. Blue = Qing.</p></div><div><b>3. Battles: strength + die</b><p>Each team rolls one die. Higher total wins; a tie leaves control unchanged. The game handles casualties and retreats.</p></div><div><b>4. How to win</b><p>Most cities after Qing\'s 1864 turn wins. A tie is a draw. <strong>Northern bonus: Taiping wins immediately by capturing Beijing.</strong> Capturing Tianjing counts as one city; the game continues.</p></div></div><div class="notice"><b>Reinforcements:</b> one token adds up to 2 strength, maximum 10 per army. Each reinforcement uses one action. Taiping starts with 10 strength and 2 tokens; Qing with 12 strength and 3 tokens. Both start with 3 cities. At the start of 1859, both teams receive 2 extra tokens, added to any remaining tokens. This bonus happens once.</div><p class="small muted">No money, taxes, forts or mandatory history choices. Historical cards never block your turn.</p><div class="dialog-actions"><button class="primary-button" data-close>Ready to play ' + icon('arrow') + '</button></div>';
  }
  function battleHtml() {
    const view = modalView, unit = E.armyById(game, view.armyId), battle = view.battle;
    const p = battle || E.battlePreview(game, view.armyId, view.target), defender = unit.faction === 'taiping' ? 'qing' : 'taiping';
    if (!p.ok && !battle) return '<h2 id="modal-title">Choose another action.</h2><p>' + esc(p.reason) + '</p><button class="secondary-button" data-close>Return to map</button>';
    let html = '<h2 id="modal-title">Battle for ' + esc(cityName(view.target)) + '</h2><p class="dialog-intro">Army strength + one die. Higher total wins; ties keep the current owner.</p><div class="battle-grid">' + [unit.faction, defender].map((side, index) => (index ? '<div class="battle-vs">vs</div>' : '') + '<div class="battle-side" style="--side:' + color(side) + '"><p class="eyebrow">' + sideName(side) + (index ? ' · DEFENDER' : ' · ATTACKER') + '</p><div class="battle-number">' + (battle ? index ? p.defendPower : p.attackPower : index ? p.defender : p.attacker) + '</div><p class="battle-formula">' + (index ? p.defender : p.attacker) + ' strength + ' + (battle ? index ? p.defendDie : p.attackDie : 'die') + '</p></div>').join('') + '</div>';
    if (battle) {
      const captured = battle.outcome === 'attacker', owner = game.cities[view.target].owner;
      html += '<p class="battle-result" style="color:' + color(owner) + '">' + sideName(owner) + (captured ? ' captures ' : ' keeps ') + esc(cityName(view.target)) + '.</p><div class="notice">' + (captured ? 'The city and attacking army now appear ' + (owner === 'taiping' ? 'red' : 'blue') + ' at this location. Winner loses 1 strength (minimum 1); defenders lose 2 and retreat.' : battle.outcome === 'tie' ? 'Both sides lose 1 strength. The city stays with its current owner.' : 'Attacker loses 2 strength. Defenders lose 1, retaining at least 1. City control is unchanged.') + (game.result ? '<br><b>Taiping captures Beijing and wins immediately.</b>' : '') + '</div><div class="dialog-actions"><button class="primary-button" ' + (game.result ? 'data-open="debrief">See results' : 'data-close>See the updated map') + ' ' + icon('arrow') + '</button></div>';
    } else html += '<div class="dialog-actions"><button class="primary-button" data-roll>Roll & resolve battle ' + icon('attack') + '</button><button class="secondary-button" data-close>Cancel</button></div>';
    return html;
  }
  function resultsHtml() {
    const result = game.result;
    const heading = result ? result.winner ? sideName(result.winner) + ' wins.' : 'The game is a draw.' : 'The score so far.';
    const artwork = result ? '<img class="victory-art" src="' + imageAsset(result.winner ? result.winner + '-victory' : 'draw-ending') + '" alt="' + (result.winner ? sideName(result.winner) + ' victory artwork supplied by the group' : 'Foreign Expeditionaries in China — draw ending artwork supplied by the group') + '">' : '';
    return '<h2 id="modal-title" style="color:' + color(result?.winner) + '">' + heading + '</h2>' + artwork + '<p class="dialog-intro">' + (result?.reason === 'beijing' ? 'Taiping captured Beijing: the Northern Expedition wins immediately.' : result ? 'The 1864 Qing turn has ended. Each controlled city is worth one point.' : 'Play through 1864. Each city is worth one point; Taiping can also win early by capturing Beijing.') + '</p><div class="stats-table">' + ['taiping','qing'].map(side => '<div style="--side:' + color(side) + '"><h3>' + sideName(side) + ' · ' + E.cityCount(game, side) + ' cities</h3><p>' + E.strength(game, side) + ' army strength · ' + game.reserves[side] + ' reinforcement tokens left</p></div>').join('') + '</div><div class="notice"><b>History and this game:</b> in 1864, Qing forces captured Tianjing and the Taiping state fell. Your result comes from simplified classroom rules and can differ from history.</div><div class="dialog-section"><h3>After the game</h3><p>Which route helped your team? What made the long northern advance difficult? What does a map game leave out about civilians, leadership and the costs of war?</p></div><div class="dialog-actions"><button class="primary-button" data-close>Return to map</button><button class="secondary-button" data-open="timeline">View the historical timeline</button></div>';
  }
  function renderModal() {
    const view = modalView;
    if (!view) return;
    if (view.type === 'rules') setDialog(rulesHtml(), 'TWO ACTIONS · TWELVE YEARS');
    if (view.type === 'battle') setDialog(battleHtml(), view.battle ? 'BATTLE RESOLVED' : 'BEFORE THE DICE');
    if (view.type === 'debrief') setDialog(resultsHtml(), game.result ? 'FINAL RESULT' : 'CURRENT SCORE', Boolean(game.result));
    if (view.type === 'event') {
      const event = D.events[view.year];
      setDialog('<h2 id="modal-title">' + event.title + '</h2><p class="dialog-intro">' + event.text + '</p><div class="notice">Historical context only. This card does not change strength, tokens or actions. Close it to keep playing.</div><div class="dialog-actions"><button class="primary-button" data-close>Back to the game</button><button class="secondary-button" data-open="timeline">Full timeline</button></div>', view.year + ' / HISTORY');
    }
    if (view.type === 'timeline') setDialog('<h2 id="modal-title">1853–1864: the historical story.</h2><p class="dialog-intro">The game has one turn per team in each of these twelve years. These cards explain the history without imposing game penalties.</p><div class="timeline-list">' + Object.entries(D.events).map(([year,event]) => '<article class="timeline-entry"><p class="eyebrow">' + year + '</p><h3>' + event.title + '</h3><p>' + event.text + '</p></article>').join('') + '</div>', 'HISTORICAL CONTEXT');
    if (view.type === 'atlas') {
      const late = view.phase === 'late';
      setDialog('<h2 id="modal-title">The group\'s original maps.</h2><p class="dialog-intro">These historical scans are references. Live game ownership is shown by the coloured circles on the game board.</p><div class="atlas-picker"><button class="secondary-button" data-atlas="early">1851–1856</button><button class="secondary-button" data-atlas="late">1857 onwards</button></div><img class="source-map" src="' + mapAssets[late ? 'late' : 'early'] + '" alt="Original ' + (late ? 'later' : 'early') + ' campaign map supplied by the group">', 'HISTORICAL ATLAS', true);
    }
    if (view.type === 'journal') setDialog('<h2 id="modal-title">Game log.</h2><div class="full-log">' + game.log.slice().reverse().map(entry => '<div class="log-line"><span class="log-year">' + entry.year + '</span><span>' + esc(entry.message) + '</span></div>').join('') + '</div>', 'MOVES & CITY CONTROL');
    if (view.type === 'settings') setDialog('<h2 id="modal-title">Host tools.</h2><p class="dialog-intro">Classroom v3: two actions per team per year. The current game stays in this browser tab. Copy a save before refreshing if you want to keep it.</p><div class="dialog-actions"><button class="primary-button" data-open="newconfirm">New game</button><button class="secondary-button" data-open="save">Save / restore text</button><button class="secondary-button" data-open="rules">Quick rules</button></div><div class="dialog-section"><h3>Sound check</h3><p>Sound starts on. Test the marching, battle and capture clips before presenting. The test does not use an action.</p><button class="secondary-button" id="test-sound">Test sound</button></div>', 'HOST TOOLS');
    if (view.type === 'newconfirm') setDialog('<h2 id="modal-title">Start again in 1853?</h2><p class="dialog-intro">This replaces the current game with the classroom starting position. Sound keeps its current setting.</p><div class="dialog-actions"><button class="primary-button" id="confirm-new">Start new game</button><button class="secondary-button" data-close>Keep playing</button><button class="secondary-button" data-open="save">Save current game first</button></div>', 'NEW GAME');
    if (view.type === 'save') {
      setDialog('<h2 id="modal-title">Save or restore.</h2><label class="save-label" for="save-text">Campaign save text</label><textarea id="save-text" spellcheck="false"></textarea><p class="small muted">Classroom v3 saves only. Older treasury-rule saves need a new game.</p><div class="dialog-actions"><button class="primary-button" id="copy-save">Copy save text</button><button class="secondary-button" id="restore-save">Restore this text</button><button class="secondary-button" data-close>Return to map</button></div>', 'SAVE / RESTORE');
      $("save-text").value = JSON.stringify(game);
    }
    if (view.type === 'sources') setDialog('<h2 id="modal-title">History and game choices.</h2><p class="dialog-intro">The historical text and two map scans come from the group\'s working materials. The classroom rules are deliberately simplified and do not reproduce historical troop numbers or territorial control.</p><div class="notice"><b>Classroom setup:</b> both teams begin with 3 cities. Taiping has 10 strength and 2 reinforcement tokens; Qing has 12 strength and 3 tokens. Hefei begins with Taiping; Shanghai begins neutral. All cities count equally. Beijing offers Taiping an early victory because the northern route is long; Qing\'s nearby attack on Tianjing does not end the game.</div>' + D.sources.map(source => '<div class="source-item"><a href="' + source.url + '" target="_blank" rel="noopener">' + source.title + '</a><p>' + source.note + '</p></div>').join('') + '<p class="source-caption">Original map publication details should be supplied by the group. Audio uses the seven group-provided MP3 files.</p>', 'SOURCES & CLASSROOM BALANCE');
  }
  function perform(action) {
    const target = action === 'recruit' ? army().city : selectedCity;
    const result = E.applyAction(game, action, selectedArmy, target);
    if (!result.ok) { toast(result.error); return; }
    remember(); game = result.state; selectedCity = target;
    if (result.captured) lastCapture = { city: target, owner: game.cities[target].owner };
    render(); S.play(action === 'attack' ? 'battle' : action, { battle: result.battle, result: game.result, captured: result.captured });
    if (result.battle) { modalView.battle = result.battle; renderModal(); }
    else if (game.result) openView('debrief');
    else toast((result.captured ? sideName(game.turn) + ' captured ' + cityName(target) + '. ' : 'Action complete. ') + (game.ap ? game.ap + ' action left.' : 'Click Next team.'));
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button,[data-map-city],[data-map-army]');
    if (!target || target.disabled) return;
    if (target.id === 'sound-toggle') { S.setEnabled(!S.isEnabled()); renderSound(); if (S.isEnabled()) { S.play('preview'); toast('Sound on. Moves, battles and outcomes play audio.'); } return; }
    if (target.id === 'test-sound') { S.setEnabled(true); renderSound(); S.play('test').then(ok => { if (ok) toast('Sound test playing: marching, battle, then city captured.'); }); return; }
    if (target.matches('[data-open]')) { openView(target.dataset.open, target.dataset.open === 'atlas' ? { phase: game.year >= 1857 ? 'late' : 'early' } : {}); return; }
    if (target.matches('[data-close],.close-modal')) { closeDialog(); return; }
    if (target.matches('[data-year]')) { openView('event', { year: Number(target.dataset.year) }); return; }
    if (target.matches('[data-army],[data-map-army]')) {
      const unit = E.armyById(game, target.dataset.army || target.dataset.mapArmy);
      if (unit.faction === game.turn && !game.result) selectedArmy = unit.id;
      selectedCity = unit.city; render(); return;
    }
    if (target.matches('[data-map-city],[data-destination]')) {
      const id = target.dataset.mapCity || target.dataset.destination;
      if (target.dataset.mapCity && !game.result && game.ap && id !== army().city) {
        const local = E.troopsAt(game, id, game.turn).sort((a,b) => b.strength - a.strength);
        if (local.length) selectedArmy = local[0].id;
      }
      selectedCity = id; render(); return;
    }
    if (target.matches('[data-route]')) { route = target.dataset.route; renderMap(); return; }
    if (target.matches('[data-action]')) {
      if (target.dataset.action === 'attack') openView('battle', { armyId: selectedArmy, target: selectedCity, battle: null });
      else perform(target.dataset.action);
      return;
    }
    if (target.matches('[data-roll]')) { perform('attack'); return; }
    if (target.matches('[data-atlas]')) { modalView.phase = target.dataset.atlas; renderModal(); return; }
    if (target.id === 'end-turn') {
      const result = E.endTurn(game); if (!result.ok) { toast(result.error); return; }
      remember(); game = result.state; chooseActiveArmy(); render();
      S.play('turn', { previousCities: turnStartCities, cities: game.cities, side: game.turn, result: game.result });
      turnStartCities = E.copy(game.cities);
      if (game.result) openView('debrief'); else toast(result.resupplied ? D.resupply.year + ' resupply: both teams receive +' + D.resupply.tokens + ' reinforcement tokens.' : game.year + ': ' + sideName(game.turn) + ' has 2 actions.');
      return;
    }
    if (target.id === 'undo') {
      const previous = undoStack.pop(); if (!previous) return;
      S.stop(); game = previous.game; turnStartCities = previous.turnStartCities; selectedArmy = previous.selectedArmy; selectedCity = previous.selectedCity; lastCapture = previous.lastCapture; render(); toast('Last step undone.'); return;
    }
    if (target.id === 'confirm-new') {
      S.stop(); game = E.createGame(); turnStartCities = E.copy(game.cities); lastCapture = null; undoStack = []; selectedArmy = 'hong'; selectedCity = 'tianjing'; route = 'all'; zoom = 1; closeDialog(); render(); toast('New classroom game: 1853.'); return;
    }
    if (target.id === 'copy-save') {
      const input = $("save-text"); input.focus(); input.select();
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(input.value).then(() => toast('Save copied.')).catch(() => toast('Save selected. Press Ctrl+C to copy.'));
      else toast('Save selected. Press Ctrl+C to copy.'); return;
    }
    if (target.id === 'restore-save') {
      const result = E.parseSave($("save-text").value); if (!result.ok) { toast(result.error); return; }
      remember(); S.stop(); game = result.state; turnStartCities = E.copy(game.cities); lastCapture = null; chooseActiveArmy(); zoom = 1; closeDialog(); render(); if (game.result) openView('debrief'); toast(result.resupplied ? 'Game restored. ' + D.resupply.year + ' resupply added: +' + D.resupply.tokens + ' tokens per team.' : 'Classroom game restored.'); return;
    }
    if (target.id === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => toast('Use your browser fullscreen control.'));
      else document.documentElement.requestFullscreen?.().catch(() => toast('Use your browser fullscreen control.')); return;
    }
    if (['zoom-out','zoom-in','zoom-fit'].includes(target.id)) { zoom = target.id === 'zoom-fit' ? 1 : Math.max(.8, Math.min(1.7, zoom + (target.id === 'zoom-in' ? .2 : -.2))); renderMap(); }
  });
  document.addEventListener('keydown', event => {
    const target = event.target.closest('[data-map-city],[data-map-army]');
    if (target && ['Enter',' '].includes(event.key)) { event.preventDefault(); target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  $("modal").addEventListener('close', () => { if (!$("modal").open) modalView = null; });
  $("modal").addEventListener('click', event => { if (event.target !== $("modal")) return; const r = $("modal").getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); });
  window.addEventListener('beforeunload', event => { if (undoStack.length) { event.preventDefault(); event.returnValue = ''; } });
  renderSound(); render();
})();
