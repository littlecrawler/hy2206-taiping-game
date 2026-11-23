(function () {
  "use strict";
  const D = window.TAIPING_DATA, E = window.TaipingEngine, S = window.TaipingSound;
  const mapAssets = window.TAIPING_MAP_ASSETS || { early: "../assets/early-map.jpg", late: "../assets/late-map.jpg" };
  let game = E.createGame({ randomEvents: true }), selectedArmy = "hong", selectedCity = "tianjing", route = "all", zoom = 1;
  let turnStartCities = E.copy(game.cities);
  let undoStack = [], modalView = null, toastTimeout, timerId = null, seconds = 60;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (value) { return String(value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; }); };
  const icon = function (name) { return '<svg class="icon" aria-hidden="true"><use href="#icon-' + name + '"/></svg>'; };
  const cityName = function (id) { const city = D.cityById[id]; return city ? city.en + " " + city.zh : "Unknown city"; };
  const sideName = function (side) { return side ? D.factions[side].short : "Neutral"; };
  const army = function () { return E.armyById(game, selectedArmy); };
  function renderSound() {
    const enabled = S.isEnabled(), button = $("sound-toggle");
    button.setAttribute("aria-pressed", String(enabled));
    button.title = enabled ? "Mute sound effects" : "Enable sound effects";
    button.innerHTML = icon(enabled ? "sound" : "muted") + "<span>Sound " + (enabled ? "on" : "off") + "</span>";
  }
  function toast(message) {
    $("toast").textContent = message; $("toast").classList.add("visible");
    clearTimeout(toastTimeout); toastTimeout = setTimeout(function () { $("toast").classList.remove("visible"); }, 4000);
  }
  S.setErrorHandler(function () { toast("Audio could not play. Turn sound off and on, then try again."); });
  function remember() {
    undoStack.push({ game: E.copy(game), selectedArmy: selectedArmy, selectedCity: selectedCity, turnStartCities: E.copy(turnStartCities) });
    undoStack = undoStack.slice(-35);
  }
  function chooseActiveArmy() {
    selectedArmy = game.armies.find(function (unit) { return unit.faction === game.turn && unit.strength > 0; })?.id || game.armies.find(function (unit) { return unit.faction === game.turn; }).id;
    selectedCity = army().city;
  }
  function renderYears() {
    $("year-number").textContent = game.year;
    $("year-track").innerHTML = Object.keys(D.events).map(function (year) {
      const current = Number(year) === game.year, past = Number(year) < game.year;
      return '<button class="year-stop' + (current ? " current" : past ? " past" : "") + ([1854, 1856, 1857, 1860, 1861, 1862, 1864].includes(Number(year)) ? " has-event" : "") + '" data-year="' + year + '" aria-label="' + year + ": " + esc(D.events[year].title) + '"' + (current ? ' aria-current="step"' : "") + '><i>' + (current ? "•" : past ? "✓" : "") + "</i><span>" + (year === "1853" ? year : year.slice(-2)) + "</span></button>";
    }).join("");
    $("turn-status").innerHTML = game.result
      ? '<div class="result-banner">Campaign complete</div><p class="round-label">' + (game.result.reason === "capital" ? "Taiping captures Beijing" : game.result.winner ? sideName(game.result.winner) + " wins on cities" : "Equal city scores · Draw") + "</p>"
      : '<div class="turn-label"><i class="owner-dot ' + game.turn + '"></i>' + sideName(game.turn) + "'s turn <span class=\"ap-pips\">" + [0, 1, 2].map(function (n) { return '<i class="' + (n < game.ap ? "filled" : "") + '"></i>'; }).join("") + '</span></div><p class="round-label">Round ' + (game.year - 1852) + " of 12 · " + game.ap + " AP remaining</p>";
  }
  function renderForces() {
    $("forces").innerHTML = ["taiping", "qing"].map(function (side) {
      const faction = D.factions[side];
      return '<section class="faction-card' + (game.turn === side && !game.result ? " active" : "") + '" style="--side:' + faction.color + '"><div class="faction-title"><h3>' + faction.short + "</h3><span>" + faction.chinese + '</span></div><p class="faction-subtitle">' + (side === "taiping" ? "THE HEAVENLY KINGDOM" : "THE IMPERIAL DYNASTY") + '</p><span class="side-turn-tag">' + (game.turn === side && !game.result ? "Now commanding" : "Awaiting orders") + '</span><div class="resource-grid"><div><div class="value">' + game.treasury[side] + ' <small>+' + E.income(game, side) + '/yr</small></div><div class="label">Treasury</div></div><div><div class="value">' + E.strength(game, side) + '</div><div class="label">Army strength</div></div></div>' +
        '<div class="city-score"><span>Cities / score</span><strong>' + E.cityCount(game, side) + '</strong></div><div class="army-list">' + game.armies.filter(function (unit) { return unit.faction === side; }).map(function (unit) {
          return '<button class="army-button' + (unit.id === selectedArmy ? " selected" : "") + '" data-army="' + unit.id + '" aria-pressed="' + (unit.id === selectedArmy) + '"' + (game.turn !== side || game.result ? " disabled" : "") + '><span class="army-monogram">' + unit.initials + '</span><span class="army-copy"><span class="army-name">' + esc(unit.name) + '</span><span class="army-place">' + esc(D.cityById[unit.city].en) + " · " + (unit.strength ? D.cityById[unit.city].zh : "routed; recruit") + '</span></span><span class="army-strength" aria-label="' + unit.strength + ' strength">' + unit.strength + "</span></button>";
        }).join("") + "</div></section>";
    }).join("");
  }
  function renderMap() {
    const current = army(), neighbours = D.neighbours[current.city];
    const width = 495 / zoom, height = 625 / zoom;
    let vx = 285, vy = 75;
    if (zoom !== 1) { vx = Math.max(0, Math.min(777 - width, D.cityById[selectedCity].x - width / 2)); vy = Math.max(0, Math.min(950 - height, D.cityById[selectedCity].y - height / 2)); }
    $("campaign-map").setAttribute("viewBox", [vx, vy, width, height].join(" "));
    let html = '<image class="atlas-image" href="' + mapAssets.early + '" x="0" y="0" width="777" height="1139" aria-hidden="true"/><rect class="map-wash" x="0" y="0" width="777" height="1139" aria-hidden="true"/>';
    html += D.edges.map(function (edge) {
      const a = D.cityById[edge[0]], b = D.cityById[edge[1]];
      const available = neighbours.includes(edge[0]) && current.city === edge[1] || neighbours.includes(edge[1]) && current.city === edge[0];
      const color = D.routes.find(function (item) { return item.id === edge[2]; })?.color || "#9a9d90";
      return '<path class="route-line ' + edge[2] + (available ? " available" : "") + (route !== "all" && route !== edge[2] ? " dimmed" : "") + '" d="M' + a.x + " " + a.y + " L" + b.x + " " + b.y + '" stroke="' + color + '" aria-hidden="true"/>';
    }).join("");
    html += D.cities.map(function (city) {
      const entry = game.cities[city.id], color = entry.owner ? D.factions[entry.owner].color : "#969e8e";
      const labelEnd = city.lx > city.x ? city.lx - 3 : city.lx + Math.min(city.en.length * 5, 76);
      return '<g class="city-group' + (selectedCity === city.id ? " selected" : "") + (neighbours.includes(city.id) ? " available" : "") + '" data-map-city="' + city.id + '" role="button" tabindex="0" aria-pressed="' + (selectedCity === city.id) + '" aria-label="' + esc(cityName(city.id) + ", " + sideName(entry.owner) + ", defence " + entry.fort) + '"><title>' + esc(cityName(city.id) + (city.alias ? " / " + city.alias : "") + " · " + sideName(entry.owner) + " · Defence " + entry.fort) + '</title><circle class="city-hit" cx="' + city.x + '" cy="' + city.y + '" r="15"/><path class="label-leader" d="M' + city.x + " " + city.y + " L" + labelEnd + " " + (city.ly - 2) + '"/><circle class="city-ring" cx="' + city.x + '" cy="' + city.y + '" r="12"/><circle class="city-node" cx="' + city.x + '" cy="' + city.y + '" r="' + (city.capital ? 8.5 : 6.5) + '" fill="' + color + '"/>' + (city.capital ? '<text class="capital-star" x="' + city.x + '" y="' + (city.y + 4) + '" text-anchor="middle">☆</text>' : "") + '<text class="city-label" x="' + city.lx + '" y="' + city.ly + '">' + city.en + '<tspan class="city-label-cn" x="' + city.lx + '" dy="12">' + city.zh + (city.alias ? " · Nanjing" : "") + "</tspan></text></g>";
    }).join("");
    game.armies.filter(function (unit) { return unit.strength > 0; }).forEach(function (unit) {
      const city = D.cityById[unit.city], others = game.armies.filter(function (candidate) { return candidate.city === unit.city && candidate.strength > 0; });
      const index = others.findIndex(function (candidate) { return candidate.id === unit.id; });
      const x = city.x + 13 + index * 17, y = city.y - 8;
      html += '<g data-map-army="' + unit.id + '" role="button" tabindex="0" aria-label="' + esc(unit.name + ", " + unit.strength + " strength at " + cityName(unit.city)) + '" style="cursor:pointer"><title>' + esc(unit.name + " · " + unit.strength + " strength") + '</title><rect class="army-token' + (selectedArmy === unit.id ? " selected" : "") + '" x="' + (x - 7) + '" y="' + (y - 8) + '" width="15" height="18" rx="3" fill="' + D.factions[unit.faction].color + '"/><text class="token-value" x="' + (x + .5) + '" y="' + (y + 4) + '" text-anchor="middle">' + unit.strength + "</text></g>";
    });
    $("campaign-map").innerHTML = html;
    document.querySelectorAll("[data-route]").forEach(function (button) { button.classList.toggle("active", button.dataset.route === route); button.setAttribute("aria-pressed", button.dataset.route === route); });
    $("zoom-out").disabled = zoom <= .8; $("zoom-in").disabled = zoom >= 1.7;
  }
  function renderEvent() {
    const event = D.events[game.year];
    $("event-card").innerHTML = '<div class="event-eyebrow"><span>' + event.tag + '</span><span>' + game.year + '</span></div><h3>' + event.title + "</h3><p>" + event.text + '</p><p class="event-effect"><b>Game effect.</b> ' + event.effect + '</p><button class="text-button" data-current-event>' + (game.pending ? "Decision required — resolve incident →" : "Read this event ↗") + "</button>";
  }
  function renderOrders() {
    const unit = army(), target = D.cityById[selectedCity], city = game.cities[selectedCity];
    $("ap-label").textContent = game.ap + " / 3 AP LEFT";
    $("selection").innerHTML = '<h3 class="selected-army-name">' + esc(unit.name) + '</h3><p class="selected-army-location">At ' + esc(cityName(unit.city)) + " · " + unit.strength + ' strength</p><div class="city-selection"><div><p class="eyebrow">SELECTED CITY</p><div class="city-name">' + esc(cityName(selectedCity)) + '</div><div class="city-owner">' + sideName(city.owner) + (target.capital ? " · Capital" : "") + (target.alias ? " · " + esc(target.alias) : "") + '</div></div><span class="defence-badge" title="City defence">' + icon("fort") + city.fort + "</span></div>";
    $("actions").innerHTML = Object.keys(D.actions).map(function (key) {
      const spec = D.actions[key], validity = E.check(game, key, unit.id, selectedCity);
      return '<button class="action-button" data-action="' + key + '"' + (validity.ok ? "" : " disabled") + ' title="' + esc(validity.reason) + '">' + icon(spec.icon) + '<span class="action-name">' + spec.name + '</span><span class="cost">' + spec.ap + " AP · " + spec.money + " treasury</span></button>";
    }).join("");
    let hint;
    if (game.result) hint = "Campaign complete. Open Debrief to compare your decisions with the historical outcome.";
    else if (game.pending) hint = "Resolve the Tianjing Incident before either side can act. Income follows the decision.";
    else if (game.ap === 0) hint = "All 3 action points have been spent. End this side's turn to continue.";
    else if (unit.strength === 0) hint = "This army is routed. Select its friendly city and recruit to restore 2 strength.";
    else if (selectedCity === unit.city) hint = city.owner === null ? "You occupy this neutral city. Claim it for 1 AP + 1 treasury to collect its future income." : "Recruit or fortify here, or select a connected city on the map.";
    else if (D.neighbours[unit.city].includes(selectedCity)) {
      const preview = E.battlePreview(game, unit.id, selectedCity);
      hint = preview.ok ? "Attack power: " + (preview.attacker + preview.attackerBonus) + " + die. Defence: " + (preview.defender + preview.fort + preview.defenderBonus) + " + die. Inspect the battle before rolling." : "Move costs 1 AP + 1 treasury." + (city.owner === null ? " Claiming this city is a separate action after you arrive." : " This is a friendly city.");
    } else hint = "This city is not directly connected to your army. Follow the highlighted connections one step at a time.";
    $("action-hint").textContent = hint;
    $("end-turn").disabled = Boolean(game.result || game.pending);
    $("end-turn").innerHTML = "End " + sideName(game.turn) + " turn " + icon("arrow");
    $("undo").disabled = undoStack.length === 0;
  }
  function renderLog() {
    $("recent-log").innerHTML = game.log.slice(-3).reverse().map(function (entry) { return '<div class="log-line"><span class="log-year">' + entry.year + "</span><span>" + esc(entry.message) + "</span></div>"; }).join("");
  }
  function render() { renderYears(); renderForces(); renderMap(); renderEvent(); renderOrders(); renderLog(); }
  function setDialog(html, kicker, wide) {
    $("modal-body").innerHTML = html; $("modal-kicker").textContent = kicker || "THE CAMPAIGN TABLE";
    $("modal").classList.toggle("dialog-wide", Boolean(wide));
    if (!$("modal").open) $("modal").showModal();
  }
  function openView(type, extra) {
    modalView = Object.assign({ type: type }, extra || {});
    renderModal(); $("modal").scrollTop = 0;
  }
  function closeDialog() { $("modal").close(); modalView = null; }
  function eventHtml(year) {
    const event = D.events[year], pending = game.pending && Number(year) === game.year;
    return '<h2 id="modal-title">' + event.title + '</h2><p class="dialog-intro">' + event.text + '</p><div class="event-modal-effect"><b>In this game</b><br>' + event.effect + (Number(year) !== game.year ? "<br><small>Reading this card does not change the game year.</small>" : "") + '</div>' + (pending
      ? '<div class="choice-list"><button class="choice-button" data-incident="loss"><b>Accept the disruption</b><span>Lose 3 treasury and 2 total army strength. Losses stop at zero.</span></button><button class="choice-button" data-incident="contain"' + (game.treasury.taiping < 4 ? " disabled" : "") + '><b>Spend to contain the penalty</b><span>Pay 4 treasury. Current Taiping treasury: ' + game.treasury.taiping + '.</span></button></div><p class="small muted" style="margin-top:13px">This choice is a classroom mechanic. It does not imply that paying money could have prevented the historical incident. Random events and annual income follow your choice.</p>'
      : (Number(year) === game.year && game.randomEvent ? '<div class="notice"><b>Optional random event: ' + esc(game.randomEvent.title) + "</b><br>" + esc(game.randomEvent.text) + "</div>" : "") + '<div class="event-year-nav"><button class="secondary-button" data-view-year="' + (Number(year) - 1) + '"' + (Number(year) === 1853 ? " disabled" : "") + '>← Previous year</button><button class="secondary-button" data-view-year="' + (Number(year) + 1) + '"' + (Number(year) === 1864 ? " disabled" : "") + '>Next year →</button></div>');
  }
  function rulesHtml() {
    return '<h2 id="modal-title">The complete older-version rules.</h2><p class="dialog-intro">A shared-screen game for two teams. One host operates the map; there is no automated opponent. The campaign covers 1853–1864, with 12 annual rounds.</p>' +
      '<div class="dialog-section"><h3>1. How to win</h3><p><b>Each controlled city or camp is worth 1 point.</b> Neutral locations score nothing. After Qing ends its turn in <b>1864</b>, the team controlling more locations wins. Equal counts are a draw. Treasury, army strength and fortifications do not add points.</p><div class="notice"><b>Northern victory:</b> Taiping wins immediately by capturing <b>Beijing 北京</b> with a surviving army.<br><b>Tianjing 天京 / Nanjing 南京:</b> Qing can capture it for 1 point, but the campaign continues. Taiping can recapture it.</div></div>' +
      '<div class="dialog-section"><h3>2. Starting position</h3><p>Both teams start with <b>3 cities and +5 annual income</b>. Qing retains an initial treasury and army advantage.</p><table class="rules-table"><thead><tr><th>Team</th><th>Controlled cities</th><th>Resources and armies</th></tr></thead><tbody><tr><td>Taiping</td><td>Tianjing 天京, Anqing 安庆, Hefei 合肥</td><td>12 treasury; Hong Xiuquan: 6 strength at Tianjing; Shi Dakai: 4 at Anqing. Total: 10.</td></tr><tr><td>Qing</td><td>Beijing 北京, Changsha 长沙, Jiangnan Camp 江南大营</td><td>15 treasury; Zeng Guofan: 6 strength at Changsha; imperial forces: 6 at Jiangnan Camp; Beijing garrison: 2. Total: 14.</td></tr></tbody></table><p>All other locations, including Shanghai 上海, start neutral. Beijing and Tianjing each start with 4 city defence; all other locations start with 0.</p></div>' +
      '<div class="dialog-section"><h3>3. Turns and orders</h3><p>Each year, <b>Taiping acts first, then Qing</b>. Each team shares <b>3 action points (AP)</b> across all its armies; this is not 3 AP per army. Each action below costs 1 AP. You may use one army repeatedly or divide the actions between armies.</p><ol><li>Select an army belonging to the active team.</li><li>Select its current city for Claim, Recruit or Fortify; select a directly connected city for Move or Attack.</li><li>Choose an enabled action. When finished, press End turn. You may end early; unused AP do not carry over.</li></ol><p>Only the active team can issue orders. Choosing a city does not automatically select the army there. Route filters only highlight routes; they do not restrict which connected city you can choose.</p><table class="rules-table"><thead><tr><th>Action</th><th>Cost</th><th>Effect</th></tr></thead><tbody>' +
      Object.values(D.actions).map(function (spec) { return '<tr><td><b>' + spec.name + '</b></td><td>' + spec.ap + ' AP + ' + spec.money + ' treasury</td><td>' + spec.detail + '</td></tr>'; }).join('') +
      '</tbody></table><p><b>Move:</b> travel one connection into friendly or neutral territory without an enemy army. Moving into a neutral city does not claim it or earn income or points.</p><p><b>Claim:</b> spend a separate action while standing in an uncontested neutral city. Enemy-controlled cities must be attacked, even when they have no army.</p><p><b>Recruit:</b> add 2 strength in a city your team controls. This also restores a routed army with 0 strength. There are no reinforcement tokens or gameplay recruitment cap in this version; each recruitment costs treasury and AP.</p><p><b>Fortify:</b> add 2 city defence where your army stands in a friendly city, up to a maximum of 8. Fortifications protect that city, not the army when it moves away.</p></div>' +
      '<div class="dialog-section"><h3>4. Treasury, income and city score</h3><p>Income is collected once per year from <b>1854</b>: <b>+3 for your own capital and +1 for every other controlled location, capped at +8 per team</b>. A captured enemy capital provides +1 income. Losing your own capital removes its +3 income until you retake it. All locations are still worth only 1 victory point each.</p><p>At the opening, both sides earn +3 +1 +1 = <b>+5 per year</b>. The +/yr display updates as city ownership changes. The initial 12 / 15 treasury is the entire 1853 opening budget; no extra income is paid in 1853. All action costs must be affordable before acting. Army strength and treasury never fall below zero.</p></div>' +
      '<div class="dialog-section"><h3>5. Battles, losses and retreats</h3><p>Attack a directly connected enemy-controlled or enemy-occupied city. Inspect the preview, then press Roll &amp; resolve battle. One six-sided die is rolled for each team.</p><div class="notice"><b>Attack power</b> = attacking army strength + die + historical attack bonus<br><b>Defence power</b> = all defending armies in that city + city defence + die + historical defence bonus</div><table class="rules-table"><thead><tr><th>Result</th><th>Losses and control</th></tr></thead><tbody><tr><td>Attacker wins</td><td>Attacker loses 1 strength; defending armies lose 3 in total. A surviving attacker moves in and captures the city, clears its fortifications, and forces surviving defenders to retreat.</td></tr><tr><td>Defender wins</td><td>Attacker loses 3 strength and stays at its starting city. Defenders lose 1. City ownership does not change.</td></tr><tr><td>Tie</td><td>Attacker and defenders each lose 2 strength. The attacker stays at its starting city; ownership does not change.</td></tr></tbody></table><p><b>An attacker must survive to occupy.</b> An army with 1 strength that wins the roll loses its last soldier and does not capture the city or win the campaign.</p><p>Defender losses are taken from the strongest defending army first, then other defenders; losses are shared in total, not charged to every army. On a defending victory or tie, any damage remaining after the defending armies are exhausted reduces city defence.</p><p><b>Retreat:</b> surviving defenders move through non-hostile connections to the nearest reachable friendly city for free. If none is reachable, they are routed to 0 strength. Routed armies regroup at their friendly capital if available, otherwise a reachable friendly city, and must recruit before moving or attacking. All armies can share a friendly city and defend it together.</p></div>' +
      '<div class="dialog-section"><h3>6. The annual sequence</h3><p>After Qing ends its turn, the next year begins in this order:</p><ol><li>Apply that year\'s fixed historical event. In 1856, resolve the Tianjing Incident choice before either team can act.</li><li>Draw and apply one random game event, if enabled.</li><li>Pay annual income to both teams.</li><li>Taiping receives 3 AP, then Qing receives 3 AP.</li></ol><p>There is no income or random draw when switching from Taiping to Qing within the same year. After Qing ends 1864, count cities and finish the game; there is no 1865 event or income.</p></div>' +
      '<div class="dialog-section"><h3>7. Fixed historical events</h3><p>These effects occur in the stated year regardless of the random-event setting. Losses apply once at the start of the year; combat bonuses apply to qualifying battles throughout that year. Bonuses change battle calculations, not permanent army strength. Opening or browsing a historical card does not advance the year or apply an effect again.</p><table class="rules-table"><thead><tr><th>Year</th><th>Event</th><th>Game effect</th></tr></thead><tbody>' +
      Object.keys(D.events).map(function (year) { const event = D.events[year]; return '<tr><td>' + year + '</td><td>' + esc(event.title) + '</td><td>' + esc(event.effect) + '</td></tr>'; }).join('') +
      '</tbody></table><p>The 1854 northern supply penalty applies to each Taiping army at <b>Huaiqing 怀庆, Linqing 临清, Cangzhou 沧州, Tianjin 天津 or Beijing 北京</b>; it does not apply at Kaifeng 开封 or farther south. The 1857 loss applies specifically to Shi Dakai\'s army, wherever it is.</p></div>' +
      '<div class="dialog-section"><h3>8. The Tianjing Incident — 1856</h3><p>This is a required Taiping decision. Both teams\' actions and that year\'s income wait until it is resolved. Choose one response:</p><table class="rules-table"><thead><tr><th>Response</th><th>Effect</th></tr></thead><tbody><tr><td>Accept the losses</td><td>Taiping loses 3 treasury and 2 total army strength. Losses come from its strongest army first and stop at zero.</td></tr><tr><td>Contain the penalty</td><td>Spend 4 treasury and lose no army strength to this incident. You must already have 4 treasury before the 1856 income payment.</td></tr></tbody></table><p>The decision itself costs no AP. After the choice, apply the year\'s random event, then income, then begin Taiping\'s turn. Choosing a response does not disable other years\' historical effects.</p></div>' +
      '<div class="dialog-section"><h3>9. Random game events</h3><p><b>Enabled by default.</b> From 1854 onward, one of four outcomes is drawn each year, with an equal chance for each. The same event affects both teams. It is additional to the fixed historical event, and happens before income.</p><table class="rules-table"><thead><tr><th>Random outcome</th><th>Effect on both teams</th></tr></thead><tbody><tr><td>Flooding</td><td>Each team loses 2 treasury, down to a minimum of 0.</td></tr><tr><td>Famine</td><td>Each team loses 1 total army strength, taken from its strongest army first.</td></tr><tr><td>Successful harvest</td><td>Each team gains 2 treasury.</td></tr><tr><td>An uneventful year</td><td>No additional effect.</td></tr></tbody></table><p>These are fictional gameplay modifiers, not claims about what happened in that exact historical year. The drawn result appears on that year\'s event card and in the campaign log.</p><p>To disable them, open Campaign settings, untick Optional random game events, and start a new campaign. Changing the checkbox does not change a campaign already in progress. Fixed historical events remain active.</p></div>' +
      '<div class="dialog-section"><h3>10. Routes</h3><div class="route-explainer">' + D.routes.map(function (r) { return '<div style="--route:' + r.color + '"><h4>' + r.name + '</h4><p>' + r.subtitle + '<br>' + r.cities.map(cityName).join(' → ') + '</p></div>'; }).join('') + '</div><p style="margin-top:15px">Suzhou 苏州 also connects to Shanghai 上海. Grey links connect Jiangnan Camp 江南大营 to Tianjing 天京 and Anqing 安庆, and Hefei 合肥 to Anqing. Each connection takes a separate Move or Attack action. Connections are simplified for play.</p></div>' +
      '<div class="dialog-section"><h3>11. Undo and saves</h3><p>Undo last step restores the previous game state. Dice and random-event sequences are preserved, so undoing and repeating the same action does not reroll it. The game lives in this browser tab; copy the save text before refreshing, closing the tab or switching versions. Restore older-version saves in this version, not the Classroom version.</p></div>' +
      '<div class="dialog-actions"><button class="primary-button" data-close>Return to the campaign</button><button class="secondary-button" data-open="sources">Modelling choices &amp; sources</button></div>';
  }
  function battleHtml() {
    const view = modalView, unit = E.armyById(game, view.armyId), battle = view.battle, preview = battle || E.battlePreview(game, view.armyId, view.target);
    if (!preview.ok) return '<h2 id="modal-title">This attack is unavailable</h2><p>' + esc(preview.reason || "The game state has changed.") + '</p><div class="dialog-actions"><button class="primary-button" data-close>Return to map</button></div>';
    const defence = preview.defender + preview.fort;
    const side = unit.faction, defendingSide = side === "taiping" ? "qing" : "taiping";
    let html = '<h2 id="modal-title">Battle for ' + esc(cityName(view.target)) + '</h2><p class="dialog-intro">' + esc(unit.name) + ": attacking from " + esc(cityName(view.origin)) + ". One die is rolled for each side. The roll resolves the battle immediately.</p><div class=\"battle-grid\"><div class=\"battle-side\" style=\"--side:" + D.factions[side].color + '"><p class="eyebrow">' + sideName(side) + ' · ATTACKER</p><div class="battle-number">' + (battle ? battle.attackPower : preview.attacker + preview.attackerBonus) + '</div><div class="battle-formula">' + preview.attacker + " army + " + preview.attackerBonus + " bonus" + (battle ? " + " + battle.attackDie + " die" : " + die") + '</div><div class="dice">' + (battle ? String.fromCodePoint(0x267F + battle.attackDie) : "?") + '</div></div><div class="battle-vs">vs.</div><div class="battle-side" style="--side:' + D.factions[defendingSide].color + '"><p class="eyebrow">' + sideName(defendingSide) + ' · DEFENDER</p><div class="battle-number">' + (battle ? battle.defendPower : defence + preview.defenderBonus) + '</div><div class="battle-formula">' + preview.defender + " army + " + preview.fort + " city defence<br>+ " + preview.defenderBonus + " bonus" + (battle ? " + " + battle.defendDie + " die" : " + die") + '</div><div class="dice">' + (battle ? String.fromCodePoint(0x267F + battle.defendDie) : "?") + "</div></div></div>";
    if (battle) {
      const labels = { attacker: "The attacker takes the city.", defender: "The defender holds.", tie: "A tie. The defender holds.", "no-capture": "The attacker cannot occupy." };
      html += '<p class="battle-result">' + labels[battle.outcome] + '</p><div class="notice">' + ({ attacker: "Attacker: −1 strength. Defending armies: −3 total strength; survivors retreat. City fortifications cleared.", defender: "Attacker: −3 strength. Defenders: −1 strength. City control is unchanged.", tie: "Both sides: −2 strength. City control is unchanged.", "no-capture": "The attacker loses its final strength. Defending armies lose up to 3 strength, but retain the city." }[battle.outcome]) + (battle.notes.length ? "<br>" + battle.notes.map(esc).join("<br>") : "") + '</div><div class="dialog-actions"><button class="primary-button" ' + (game.result ? 'data-open="debrief">Open the debrief' : "data-close>Return to map") + " " + icon("arrow") + "</button></div>";
    } else html += '<div class="notice">Cost: <b>1 AP + 2 treasury</b>. A city is captured only if the attacker wins and has at least 1 strength left.</div><div class="dialog-actions"><button class="primary-button" data-roll>Roll &amp; resolve battle ' + icon("attack") + '</button><button class="secondary-button" data-close>Cancel attack</button></div>';
    return html;
  }
  function debriefHtml() {
    const result = game.result;
    const heading = result ? result.reason === "capital" ? "Taiping captures Beijing." : result.winner ? sideName(result.winner) + " wins on cities." : "Equal city scores — a draw." : "Pause the game. Examine the history.";
    const scoreLine = result ? '<div class="notice"><b>City score: Taiping ' + E.cityCount(game, "taiping") + " · Qing " + E.cityCount(game, "qing") + "</b><br>" + (result.reason === "capital" ? "Capturing Beijing gives Taiping an immediate victory." : "After Qing ends 1864, each controlled location counts as 1 point. Equal counts are a draw.") + "</div>" : "";
    return '<h2 id="modal-title">' + heading + '</h2><p class="dialog-intro">' + (result ? "Your campaign has reached its game outcome. " : "This panel can be used at any point without ending your campaign. ") + 'Now move from winning the game to explaining the rebellion.</p>' + scoreLine + '<div class="stats-table">' + ["taiping", "qing"].map(function (side) { return '<div style="--side:' + D.factions[side].color + '"><h3>' + sideName(side) + "</h3><p>" + game.treasury[side] + " treasury · " + E.strength(game, side) + " army strength<br>" + D.cities.filter(function (city) { return game.cities[city.id].owner === side; }).length + " cities · +" + E.income(game, side) + " annual income</p></div>"; }).join("") + '</div><div class="notice"><b>Historical outcome:</b> Tianjing fell to Qing forces in 1864 and the Taiping state collapsed. A different result in this game is a counterfactual outcome produced by simplified rules, choices and dice.</div><div class="dialog-section"><h3>Four questions for the room</h3><ol class="debrief-questions"><li><b>Strategy and supply.</b> Which route did you choose? How did distance, treasury and reinforcement affect that choice?</li><li><b>Internal cohesion.</b> How did the 1856–1857 events affect your ability to act? What political and social dimensions cannot be represented by subtracting resources?</li><li><b>Changing military power.</b> How did regional armies and foreign support change the balance? Who gained power within the Qing system?</li><li><b>What the game leaves out.</b> Where are civilians, religious belief, ethnic violence, displacement and the human costs of war in this model? How would including them change the definition of “success”?</li></ol></div><div class="dialog-section"><h3>Read a contemporary voice</h3><p>An 1864 Qing–American diplomatic exchange reports the fall of Nanking and expresses satisfaction at the result. Whose interests does this language reveal, and whose experiences are absent?</p><p><a href="' + D.sources.find(function (source) { return source.id === 'nanking-report'; }).url + '" target="_blank" rel="noopener">Read the primary source · Office of the Historian ↗</a></p></div><div class="dialog-actions"><button class="primary-button" data-close>Return to the campaign</button><button class="secondary-button" data-open="timeline">Compare the chronology</button></div>';
  }
  function sourcesHtml() {
    return '<h2 id="modal-title">History, sources &amp; the model.</h2><p class="dialog-intro">Historical context for the campaign. Resources, combat bonuses and routes are simplified for play.</p>' + D.sources.map(function (source) { return '<div class="source-item"><a href="' + source.url + '" target="_blank" rel="noopener">' + source.title + " ↗</a><p>" + source.note + "</p></div>"; }).join("") +
      '<div class="dialog-section"><h3>Historical maps</h3><p>The historical atlas includes two map scans: <b>Taiping Rebellion Route (51–56)</b> and <b>Taiping Rebellion Route (57 onwards)</b>. The early scan underlies the interactive board; both originals can be viewed in the atlas.</p></div><div class="dialog-actions"><button class="primary-button" data-close>Return to map</button></div>';
  }
  function renderModal() {
    if (!modalView) return;
    const view = modalView;
    if (view.type === "rules") setDialog(rulesHtml(), "THE RULES OF THE TABLE");
    if (view.type === "event") setDialog(eventHtml(view.year), view.year + " / " + D.events[view.year].tag);
    if (view.type === "battle") setDialog(battleHtml(), view.battle ? "BATTLE RESOLVED" : "BEFORE THE DICE ARE CAST");
    if (view.type === "debrief") setDialog(debriefHtml(), "FROM STRATEGY TO HISTORICAL EXPLANATION");
    if (view.type === "sources") setDialog(sourcesHtml(), "EVIDENCE & INTERPRETATION");
    if (view.type === "atlas") {
      const late = view.phase === "late";
      setDialog('<h2 id="modal-title">The historical atlas.</h2><p class="dialog-intro">The original maps supplied by your group. The printed routes and shaded territories are historical reference material, separate from your game\'s current control.</p><div class="atlas-picker"><button class="secondary-button' + (!late ? " active" : "") + '" data-atlas="early">1851–1856 · Early phase</button><button class="secondary-button' + (late ? " active" : "") + '" data-atlas="late">1857 onwards · Later phase</button></div><img class="source-map" src="' + mapAssets[late ? "late" : "early"] + '" alt="' + (late ? "Later-phase" : "Early-phase") + ' historical map of Taiping campaigns, with Chinese place names and a printed route legend"><p class="source-caption">Chinese map labels are preserved in the original scan. All playable city names have English and Chinese labels on the interactive board.</p>', "THE TWO ORIGINAL MAPS", true);
    }
    if (view.type === "timeline") setDialog('<h2 id="modal-title">Twelve years of choices.</h2><p class="dialog-intro">Before the game: the movement grows in Guangxi, rises at Jintian in 1851 and campaigns north in 1852. The playable campaign begins after the capture of Nanjing in 1853.</p><div class="timeline-list">' + Object.keys(D.events).map(function (year) { const event = D.events[year]; return '<article class="timeline-entry"><p class="eyebrow">' + year + " / " + event.tag + "</p><h3>" + event.title + "</h3><p>" + event.text + '</p><button class="text-button" data-view-year="' + year + '">View event & game effect ↗</button></article>'; }).join("") + "</div>", "HISTORICAL CHRONOLOGY");
    if (view.type === "journal") setDialog('<h2 id="modal-title">Dispatches from the field.</h2><p class="dialog-intro">Actions, battle rolls, events and income from this campaign. Most recent dispatches appear first.</p><div class="full-log">' + game.log.slice().reverse().map(function (entry) { return '<div class="log-line"><span class="log-year">' + entry.year + '</span><span><b>' + sideName(entry.side) + "</b> · " + esc(entry.message) + "</span></div>"; }).join("") + "</div>", "THE CAMPAIGN RECORD");
    if (view.type === "settings") setDialog('<h2 id="modal-title">Prepare the table.</h2><p class="dialog-intro">A shared-screen game for two teams and one host. There is no automated opponent. All game controls and map assets work offline.</p><div class="dialog-section"><h3>Start a new campaign</h3><label class="setting-row"><span>Optional random game events<p>On by default; changes apply when starting a new campaign. From 1854, each year brings flooding (both treasuries −2), famine (both sides lose 1 total strength), harvest (both treasuries +2), or no effect. These are fictional gameplay modifiers.</p></span><input id="random-setting" type="checkbox" aria-label="Optional random game events"' + (game.randomEvents ? " checked" : "") + '></label><div class="dialog-actions"><button class="primary-button" id="new-campaign">New campaign ' + icon("arrow") + '</button></div></div><div class="dialog-section"><h3>Keep a campaign for later</h3><p>The current game stays in this tab\'s memory. Refreshing or closing the tab clears it. Use the copy-and-paste save text to keep a campaign in your own notes and restore it later.</p><div class="dialog-actions"><button class="secondary-button" data-open="save">Save / restore text</button></div></div>', "HOST TOOLS");
    if (view.type === "newconfirm") setDialog('<h2 id="modal-title">Begin a fresh campaign?</h2><p class="dialog-intro">This resets the current armies, resources and action history. Start in 1853 with 12 annual rounds through 1864. Optional random events: <b>' + (view.randomEvents ? "on" : "off") + '</b>.</p><div class="dialog-actions"><button class="primary-button" id="confirm-new">Start in 1853 ' + icon("arrow") + '</button><button class="secondary-button" data-close>Keep current campaign</button><button class="secondary-button" data-open="save">Copy current save first</button></div>', "RESET THE CAMPAIGN");
    if (view.type === "save") {
      setDialog('<h2 id="modal-title">Save or restore the campaign.</h2><p class="dialog-intro">Copy this text into your own notes to keep the current campaign. To restore another campaign, paste its text below and select Restore. The game does not automatically write save files.</p><label class="save-label" for="save-text">Campaign save text</label><textarea id="save-text" spellcheck="false" aria-describedby="save-help"></textarea><p class="small muted" id="save-help" style="margin-top:9px">Includes forces, resources, year, event state and the dice sequence. Restoring replaces this tab\'s current campaign.</p><div class="dialog-actions"><button class="primary-button" id="copy-save">Copy save text</button><button class="secondary-button" id="restore-save">Restore this text</button><button class="secondary-button" data-close>Return to map</button></div>', "SAVE / RESTORE");
      $("save-text").value = JSON.stringify(game);
    }
  }
  function perform(action) {
    const result = E.applyAction(game, action, selectedArmy, selectedCity);
    if (!result.ok) { toast(result.error); return; }
    remember(); game = result.state;
    if (action !== "attack") selectedCity = army().city;
    render();
    S.play(action === "attack" ? "battle" : action, { battle: result.battle, result: game.result });
    if (result.battle) { modalView.battle = result.battle; renderModal(); }
    else toast(D.actions[action].name + " complete. " + game.ap + " AP remaining.");
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null; seconds = 60;
    $("timer").classList.remove("running"); $("timer-label").textContent = "Start a 60-second discussion"; $("timer-status").textContent = "60s";
  }
  document.addEventListener("click", function (event) {
    const target = event.target.closest("button,[data-map-city],[data-map-army]");
    if (!target || target.disabled) return;
    if (target.id === "sound-toggle") {
      S.setEnabled(!S.isEnabled()); renderSound();
      if (S.isEnabled()) { S.play("preview"); toast("Sound on. Movement, battles and campaign outcomes now play audio."); }
      return;
    }
    if (target.matches("[data-open]")) { openView(target.dataset.open, target.dataset.open === "atlas" ? { phase: game.year >= 1857 ? "late" : "early" } : {}); return; }
    if (target.matches("[data-close],.close-modal")) { closeDialog(); return; }
    if (target.matches("[data-year],[data-view-year],[data-current-event]")) { openView("event", { year: Number(target.dataset.year || target.dataset.viewYear || game.year) }); return; }
    if (target.matches("[data-army],[data-map-army]")) {
      const id = target.dataset.army || target.dataset.mapArmy, unit = E.armyById(game, id);
      if (unit.faction !== game.turn || game.result) { selectedCity = unit.city; render(); toast("Select one of " + sideName(game.turn) + "'s armies to issue orders."); return; }
      selectedArmy = id; selectedCity = unit.city; render(); return;
    }
    if (target.matches("[data-map-city]")) { selectedCity = target.dataset.mapCity; renderMap(); renderOrders(); return; }
    if (target.matches("[data-route]")) { route = target.dataset.route; renderMap(); return; }
    if (target.matches("[data-action]")) {
      if (target.dataset.action === "attack") openView("battle", { armyId: selectedArmy, target: selectedCity, origin: army().city, battle: null });
      else perform(target.dataset.action);
      return;
    }
    if (target.matches("[data-roll]")) { perform("attack"); return; }
    if (target.matches("[data-incident]")) {
      const result = E.resolveIncident(game, target.dataset.incident);
      if (!result.ok) { toast(result.error); return; }
      remember(); game = result.state; render(); renderModal(); toast("Incident resolved. Random event and annual income processed."); return;
    }
    if (target.matches("[data-atlas]")) { modalView.phase = target.dataset.atlas; renderModal(); return; }
    if (target.id === "end-turn") {
      const result = E.endTurn(game);
      if (!result.ok) { toast(result.error); return; }
      remember(); game = result.state; chooseActiveArmy(); stopTimer(); render();
      S.stop();
      S.play("turn", { previousCities: turnStartCities, cities: game.cities, side: game.turn, result: game.result });
      turnStartCities = E.copy(game.cities);
      if (game.result) openView("debrief"); else if (result.newYear) openView("event", { year: game.year }); else toast("Qing's turn begins. Choose an army and discuss your move.");
      return;
    }
    if (target.id === "undo") {
      const previous = undoStack.pop(); if (!previous) return;
      S.stop(); game = previous.game; turnStartCities = previous.turnStartCities; selectedArmy = previous.selectedArmy; selectedCity = previous.selectedCity; stopTimer(); render();
      toast("Last step undone. Dice results remain reproducible."); return;
    }
    if (target.id === "new-campaign") { openView("newconfirm", { randomEvents: $("random-setting").checked }); return; }
    if (target.id === "confirm-new") {
      S.stop(); game = E.createGame({ randomEvents: modalView.randomEvents }); turnStartCities = E.copy(game.cities); undoStack = []; selectedArmy = "hong"; selectedCity = "tianjing"; route = "all"; zoom = 1; stopTimer(); closeDialog(); render(); toast("A new campaign begins in 1853."); return;
    }
    if (target.id === "copy-save") {
      const input = $("save-text"); input.focus(); input.select();
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(input.value).then(function () { toast("Campaign save copied."); }).catch(function () { toast("Save text selected. Press Ctrl+C or Command+C to copy."); });
      else toast("Save text selected. Press Ctrl+C or Command+C to copy.");
      return;
    }
    if (target.id === "restore-save") {
      const result = E.parseSave($("save-text").value);
      if (!result.ok) { toast(result.error); return; }
      remember(); S.stop(); game = result.state; turnStartCities = E.copy(game.cities); chooseActiveArmy(); stopTimer(); zoom = 1; closeDialog(); render();
      if (game.pending) openView("event", { year: game.year }); else if (game.result) openView("debrief");
      toast(result.migrated ? "Save updated to city scoring. Capturing Tianjing no longer ends play. Existing positions and resources are preserved." : "Campaign restored. You can undo this restore if needed."); return;
    }
    if (target.id === "fullscreen") {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () { toast("Use your browser's fullscreen control."); });
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { toast("Use your browser's fullscreen control for projection."); });
      else toast("Use your browser's fullscreen control for projection.");
      return;
    }
    if (["zoom-out", "zoom-in", "zoom-fit"].includes(target.id)) {
      zoom = target.id === "zoom-fit" ? 1 : Math.max(.8, Math.min(1.7, zoom + (target.id === "zoom-in" ? .2 : -.2)));
      renderMap(); return;
    }
    if (target.id === "timer") {
      if (timerId) { stopTimer(); return; }
      seconds = 60; $("timer").classList.add("running"); $("timer-label").textContent = "Discussion in progress · click to reset"; $("timer-status").textContent = "60s";
      timerId = setInterval(function () {
        seconds--; $("timer-status").textContent = seconds + "s";
        if (seconds <= 0) { stopTimer(); $("timer-label").textContent = "Discussion time is up · start again"; toast("Discussion time is up. Agree on an order before acting."); }
      }, 1000);
    }
  });
  document.addEventListener("keydown", function (event) {
    const target = event.target.closest("[data-map-city],[data-map-army]");
    if (target && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  $("modal").addEventListener("click", function (event) {
    if (event.target !== $("modal")) return;
    const rect = $("modal").getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });
  $("modal").addEventListener("close", function () { if (!$("modal").open) modalView = null; });
  window.addEventListener("beforeunload", function (event) {
    if (undoStack.length > 0) { event.preventDefault(); event.returnValue = ""; }
  });
  renderSound(); render();
})();
