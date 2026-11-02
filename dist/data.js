(function (root) {
  "use strict";
  const data = {
    version: 3,
    startYear: 1853,
    endYear: 1864,
    actionsPerTurn: 2,
    maxStrength: 10,
    startingReserves: { taiping: 2, qing: 3 },
    factions: {
      taiping: { name: "Taiping Heavenly Kingdom", short: "Taiping", chinese: "太平天国", capital: "tianjing", color: "#a43e32" },
      qing: { name: "Qing Dynasty", short: "Qing", chinese: "清朝", capital: "beijing", color: "#30546a" }
    },
    cities: [
      { id: "beijing", en: "Beijing", zh: "北京", x: 443, y: 119, lx: 466, ly: 88, owner: "qing", capital: "qing" },
      { id: "tianjin", en: "Tianjin", zh: "天津", x: 467, y: 164, lx: 491, ly: 133, owner: null },
      { id: "cangzhou", en: "Cangzhou", zh: "沧州", x: 449, y: 230, lx: 477, ly: 199, owner: null },
      { id: "linqing", en: "Linqing", zh: "临清", x: 430, y: 266, lx: 345, ly: 269, owner: null },
      { id: "huaiqing", en: "Huaiqing", zh: "怀庆", x: 350, y: 330, lx: 295, ly: 305, owner: null },
      { id: "kaifeng", en: "Kaifeng", zh: "开封", x: 406, y: 350, lx: 318, ly: 344, owner: null },
      { id: "hefei", en: "Hefei", zh: "合肥", x: 522, y: 387, lx: 455, ly: 375, owner: "taiping" },
      { id: "tianjing", en: "Tianjing", zh: "天京", alias: "Nanjing 南京", x: 584, y: 420, lx: 611, ly: 386, owner: "taiping", capital: "taiping" },
      { id: "jiangnan", en: "Jiangnan Camp", zh: "江南大营", x: 566, y: 466, lx: 448, ly: 454, owner: "qing" },
      { id: "anqing", en: "Anqing", zh: "安庆", x: 520, y: 499, lx: 455, ly: 496, owner: "taiping" },
      { id: "jiujiang", en: "Jiujiang", zh: "九江", x: 482, y: 541, lx: 469, ly: 579, owner: null },
      { id: "wuchang", en: "Wuchang", zh: "武昌", x: 413, y: 521, lx: 333, ly: 518, owner: null },
      { id: "changsha", en: "Changsha", zh: "长沙", x: 351, y: 618, lx: 330, ly: 652, owner: "qing" },
      { id: "suzhou", en: "Suzhou", zh: "苏州", x: 652, y: 462, lx: 666, ly: 430, owner: null },
      { id: "shanghai", en: "Shanghai", zh: "上海", x: 690, y: 475, lx: 708, ly: 510, owner: null },
      { id: "hangzhou", en: "Hangzhou", zh: "杭州", x: 633, y: 531, lx: 569, ly: 548, owner: null },
      { id: "ningbo", en: "Ningbo", zh: "宁波", x: 686, y: 553, lx: 674, ly: 582, owner: null }
    ],
    routes: [
      { id: "north", name: "Northern Expedition", subtitle: "The northern road to Beijing", color: "#8c7250", cities: ["tianjing", "hefei", "kaifeng", "huaiqing", "linqing", "cangzhou", "tianjin", "beijing"] },
      { id: "west", name: "Western Expedition", subtitle: "Secure the Yangtze corridor", color: "#547c77", cities: ["tianjing", "anqing", "jiujiang", "wuchang", "changsha"] },
      { id: "east", name: "Eastern Campaign", subtitle: "Wealth, ports and foreign interests", color: "#9b6550", cities: ["tianjing", "suzhou", "hangzhou", "ningbo"] }
    ],
    extraEdges: [["suzhou", "shanghai", "east"], ["tianjing", "jiangnan", "link"], ["jiangnan", "anqing", "link"], ["hefei", "anqing", "link"]],
    armies: [
      { id: "hong", faction: "taiping", name: "Hong Xiuquan's forces", zh: "洪秀全", initials: "HX", city: "tianjing", strength: 6 },
      { id: "shi", faction: "taiping", name: "Shi Dakai's forces", zh: "石达开", initials: "SD", city: "anqing", strength: 4 },
      { id: "zeng", faction: "qing", name: "Zeng Guofan's army", zh: "曾国藩", initials: "ZG", city: "changsha", strength: 5 },
      { id: "imperial", faction: "qing", name: "Qing imperial forces", zh: "清军", initials: "QI", city: "jiangnan", strength: 5 },
      { id: "beijing-guard", faction: "qing", name: "Beijing garrison", zh: "北京守军", initials: "BG", city: "beijing", strength: 2 }
    ],
    actions: {
      move: { name: "Move army", ap: 1, icon: "move", detail: "Move along one connection. An empty city becomes yours immediately." },
      attack: { name: "Attack city", ap: 1, icon: "attack", detail: "Attack an enemy army in a connected city. Strength + one die; higher total wins." },
      recruit: { name: "Reinforce +2", ap: 1, icon: "recruit", detail: "Use 1 reinforcement token and 1 action to add up to 2 strength (maximum 10)." }
    },
    events: {
      1853: { title: "A new capital on the Yangtze", tag: "THE CAMPAIGN BEGINS", text: "After taking Nanjing, the Taiping establish their capital, Tianjing. Their leaders face a strategic choice: advance north, secure the west, or expand east." },
      1854: { title: "The northern supply problem", tag: "SUPPLY & GEOGRAPHY", text: "The Northern Expedition encounters isolation, supply difficulties and harsh conditions as it advances into northern China." },
      1855: { title: "A failed expedition, a wider war", tag: "STRATEGIC OVERREACH", text: "The historical Northern Expedition collapses. Meanwhile, the contest for the middle Yangtze continues, including Taiping successes near Hukou." },
      1856: { title: "The Tianjing Incident", tag: "INTERNAL DIVISION", text: "A violent struggle within the Taiping leadership damages the movement even as its armies achieve successes against Qing positions." },
      1857: { title: "Shi Dakai's departure", tag: "LEADERSHIP & COHESION", text: "Following the internal conflicts, Shi Dakai leaves Tianjing with his forces and operates separately from the main Taiping government." },
      1858: { title: "A war fought by regional armies", tag: "REGIONAL POWER", text: "New Taiping commanders revive the war effort. Qing regional forces also gain ground, including at Jiujiang." },
      1859: { title: "Hong Rengan's reform proposals", tag: "REFORM & CAPACITY", text: "Hong Rengan arrives in Tianjing and proposes administrative, economic and technological reforms in the New Treatise on Aids to Administration." },
      1860: { title: "The Jiangnan Camp is broken", tag: "MILITARY RESURGENCE", text: "Taiping armies destroy the rebuilt Jiangnan encampment and expand into the lower Yangtze region." },
      1861: { title: "The struggle for Anqing", tag: "THE YANGTZE LIFELINE", text: "The historical fall of Anqing strengthens the Qing position on the river west of Tianjing." },
      1862: { title: "Foreign support around Shanghai", tag: "FOREIGN INTERVENTION", text: "Qing-aligned regional and Western-trained forces resist the Taiping in the lower Yangtze and around Shanghai." },
      1863: { title: "Tianjing becomes isolated", tag: "ATTRITION & ENCIRCLEMENT", text: "Qing and Qing-aligned forces retake Taiping territory. The historical Taiping capital becomes increasingly isolated." },
      1864: { title: "The final siege", tag: "THE LAST CAMPAIGN YEAR", text: "In the historical campaign, Qing forces capture Tianjing in 1864 and the Taiping state collapses. Your game outcome may differ." }
    },
    sources: [
      { title: "Group research and game proposal", url: "https://docs.google.com/document/d/16j91TfVDrVVotQ70x_1nGJ4lY7VBzhzW-0e7f9FlEqI/edit?tab=t.0", note: "Historical background and original proposal. This classroom edition uses simplified rules agreed for the presentation. The group's full historical research still needs its own bibliography." },
      { title: "A diplomatic report of the fall of Nanking (1864)", url: "https://history.state.gov/historicaldocuments/frus1864p3/d433", note: "Primary source, Office of the Historian. Read the Qing and American diplomatic language critically: a contemporary report is also an interested account." },
      { title: "Second China War", url: "https://www.nam.ac.uk/explore/second-china-war", note: "National Army Museum. Context for Western pressure on the Qing in 1856–1860; useful alongside the later Shanghai intervention discussion." }
    ]
  };
  data.cityById = Object.fromEntries(data.cities.map(function (city) { return [city.id, city]; }));
  data.edges = [];
  data.routes.forEach(function (route) {
    route.cities.slice(1).forEach(function (id, index) { data.edges.push([route.cities[index], id, route.id]); });
  });
  data.edges.push.apply(data.edges, data.extraEdges);
  data.neighbours = Object.fromEntries(data.cities.map(function (city) {
    return [city.id, data.edges.filter(function (edge) { return edge[0] === city.id || edge[1] === city.id; }).map(function (edge) { return edge[0] === city.id ? edge[1] : edge[0]; })];
  }));
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else root.TAIPING_DATA = data;
})(typeof globalThis !== "undefined" ? globalThis : this);
