const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const D = require('../dist/data.js');
const fresh = () => E.createGame({seed:19});
const act = (s,a,id,target) => { const r=E.applyAction(s,a,id,target); assert.equal(r.ok,true,r.error); return r; };
// Fixture advancement is separate from the real action/turn regression tests.
const finishFixtureTurn = s => E.endTurn({...E.copy(s),ap:0}).state;
const nextYear = s => finishFixtureTurn(finishFixtureTurn(s));
function atYear(year) { let s=fresh(); while(s.year<year) s=nextYear(s); return s; }

test('opening has a small Qing advantage, equal cities and two actions',()=>{
 const s=fresh(); assert.equal(s.ap,2); assert.equal(E.strength(s,'taiping'),10); assert.equal(E.strength(s,'qing'),12);
 assert.deepEqual(s.reserves,{taiping:2,qing:3}); assert.deepEqual(E.scores(s),{taiping:3,qing:3});
 assert.equal(s.version,3); assert.equal('treasury' in s,false); assert.equal('pending' in s,false);
});
test('all cities remain connected through reciprocal links and the full northern route',()=>{
 const seen=new Set(['tianjing']),q=['tianjing']; while(q.length) for(const n of D.neighbours[q.shift()]) if(!seen.has(n)){seen.add(n);q.push(n);}
 assert.equal(seen.size,17); for(const c of D.cities) for(const n of D.neighbours[c.id]) assert.ok(D.neighbours[n].includes(c.id));
 assert.deepEqual(D.routes.find(r=>r.id==='north').cities,['tianjing','hefei','kaifeng','huaiqing','linqing','cangzhou','tianjin','beijing']);
});
test('moving captures a neutral city, moves the army and spends exactly one action',()=>{
 const s=fresh(), before=JSON.stringify(s); const r=act(s,'move','hong','suzhou');
 assert.equal(r.captured,true); assert.equal(r.state.cities.suzhou.owner,'taiping'); assert.equal(E.armyById(r.state,'hong').city,'suzhou'); assert.equal(r.state.ap,1);
 assert.deepEqual(r.state.reserves,s.reserves); assert.equal(JSON.stringify(s),before); assert.equal(E.cityCount(r.state,'taiping'),4);
});
test('two actions can be combined and every team receives a fresh pool',()=>{
 let s=act(fresh(),'move','hong','suzhou').state; s=act(s,'move','hong','shanghai').state;
 assert.equal(s.ap,0); assert.equal(E.check(s,'move','hong','suzhou').ok,false);
 s=E.endTurn(s).state; assert.equal(s.turn,'qing'); assert.equal(s.year,1853); assert.equal(s.ap,2);
 s=act(s,'move','zeng','wuchang').state; s=act(s,'move','zeng','jiujiang').state;
 s=E.endTurn(s).state; assert.equal(s.turn,'taiping'); assert.equal(s.year,1854); assert.equal(s.ap,2);
});

test('early handoffs discard unused actions and only advance the year after Qing',()=>{
 for(const unused of [1,2]){
  let s=fresh();
  if(unused===1) s=act(s,'move','hong','hefei').state;
  assert.equal(s.turn,'taiping'); assert.equal(s.ap,unused);
  assert.equal(E.applyAction(s,'move','zeng','wuchang').ok,false);
  const before=JSON.stringify(s), result=E.endTurn(s);
  assert.equal(result.ok,true); assert.equal(JSON.stringify(s),before);
  s=result.state; assert.equal(s.turn,'qing'); assert.equal(s.year,1853); assert.equal(s.ap,2);
  assert.match(s.log.at(-2).message,new RegExp(unused+' unused action'));
  assert.equal(E.applyAction(s,'recruit','hong',E.armyById(s,'hong').city).ok,false);
  if(unused===1) s=act(s,'move','zeng','wuchang').state;
  assert.equal(s.turn,'qing'); assert.equal(s.ap,unused);
  s=E.endTurn(s).state;
  assert.equal(s.year,1854); assert.equal(s.turn,'taiping'); assert.equal(s.ap,2);
  assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
 }
});
test('invalid commands are rejected without changing the game',()=>{
 const s=fresh(),before=JSON.stringify(s);
 for(const args of [['move','hong','beijing'],['move','zeng','wuchang'],['claim','hong','tianjing'],['fortify','hong','tianjing'],['move','hong','jiangnan']]) assert.equal(E.applyAction(s,...args).ok,false);
 assert.equal(JSON.stringify(s),before);
});
test('empty enemy cities are captured without phantom defenders or extra claim actions',()=>{
 let s=finishFixtureTurn(fresh()); E.armyById(s,'hong').city='hefei';
 assert.equal(E.actionFor(s,'imperial','tianjing'),'move');
 const r=act(s,'move','imperial','tianjing'); assert.equal(r.captured,true); assert.equal(r.battle,null);
 assert.equal(r.state.cities.tianjing.owner,'qing'); assert.equal(E.armyById(r.state,'imperial').city,'tianjing'); assert.equal(r.state.result,null);
});
test('a successful attack updates ownership and army position together',()=>{
 const s=fresh(); E.armyById(s,'hong').strength=10;
 const r=act(s,'attack','hong','jiangnan'); assert.equal(r.battle.outcome,'attacker');
 assert.equal(r.state.cities.jiangnan.owner,'taiping'); assert.equal(E.armyById(r.state,'hong').city,'jiangnan');
 assert.ok(r.state.armies.filter(a=>a.faction==='qing'&&a.strength>0).every(a=>a.city!=='jiangnan'));
 assert.equal(E.parseSave(JSON.stringify(r.state)).ok,true);
});
test('Qing capture of Tianjing is blue ownership and does not end the game',()=>{
 const s=finishFixtureTurn(fresh()); E.armyById(s,'imperial').strength=10;
 const r=act(s,'attack','imperial','tianjing'); assert.equal(r.state.cities.tianjing.owner,'qing');
 assert.equal(D.factions[r.state.cities.tianjing.owner].color,'#30546a'); assert.equal(E.armyById(r.state,'imperial').city,'tianjing');
 assert.equal(r.state.result,null); assert.equal(E.parseSave(JSON.stringify(r.state)).ok,true);
});
test('Taiping capture of Beijing immediately wins the northern expedition',()=>{
 const s=fresh(); E.armyById(s,'hong').city='tianjin'; s.cities.tianjin.owner='taiping'; E.armyById(s,'hong').strength=10;
 const r=act(s,'attack','hong','beijing'); assert.equal(r.state.result.reason,'beijing'); assert.equal(r.state.result.winner,'taiping');
 assert.equal(r.state.cities.beijing.owner,'taiping'); assert.equal(E.endTurn(r.state).ok,false); assert.equal(E.parseSave(JSON.stringify(r.state)).ok,true);
});
test('an undefended Beijing is also an immediate Taiping victory on entry',()=>{
 const s=fresh(); E.armyById(s,'hong').city='tianjin'; s.cities.tianjin.owner='taiping'; E.armyById(s,'beijing-guard').city='changsha';
 const r=act(s,'move','hong','beijing'); assert.equal(r.state.result.winner,'taiping'); assert.equal(r.state.result.reason,'beijing');
});
test('reinforcement spends one token and one action, with a cap of ten',()=>{
 let s=fresh(); E.armyById(s,'hong').strength=9;
 s=act(s,'recruit','hong','tianjing').state; assert.equal(E.armyById(s,'hong').strength,10); assert.equal(s.reserves.taiping,1); assert.equal(s.ap,1);
 assert.equal(E.check(s,'recruit','hong','tianjing').ok,false);
 s=act(s,'recruit','shi','anqing').state; assert.equal(s.reserves.taiping,0); s=nextYear(s);
 assert.equal(E.check(s,'recruit','shi','anqing').ok,false); assert.equal(s.reserves.taiping,0);
});
test('zero-strength armies can reinforce and a team with no legal action can end early',()=>{
 let s=fresh(); E.armyById(s,'hong').strength=0;
 assert.equal(E.check(s,'move','hong','suzhou').ok,false);
 assert.equal(E.armyById(act(s,'recruit','hong','tianjing').state,'hong').strength,2);
 E.armyById(s,'shi').strength=0;
 assert.equal(E.hasLegalAction(s),true);
 s.reserves.taiping=0;
 assert.equal(E.hasLegalAction(s),false);
 const result=E.endTurn(s); assert.equal(result.ok,true); s=result.state;
 assert.equal(s.turn,'qing'); assert.equal(s.ap,2); assert.equal(s.year,1853);
 assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
});

test('entering 1859 adds two tokens to both teams without spending actions or changing armies',()=>{
 for(const reserves of [{taiping:0,qing:0},{taiping:1,qing:2},{taiping:2,qing:3}]){
  let s=atYear(1858); s.reserves=E.copy(reserves);
  const taipingEnd=E.endTurn(s); assert.equal(taipingEnd.resupplied,false);
  s=taipingEnd.state; assert.equal(s.year,1858); assert.deepEqual(s.reserves,reserves);
  const before=JSON.stringify(s), r=E.endTurn(s);
  assert.equal(r.ok,true); assert.equal(r.resupplied,true); assert.equal(JSON.stringify(s),before);
  assert.equal(r.state.year,1859); assert.equal(r.state.turn,'taiping'); assert.equal(r.state.ap,2);
  assert.deepEqual(r.state.reserves,{taiping:reserves.taiping+2,qing:reserves.qing+2});
  assert.deepEqual(r.state.armies,s.armies); assert.equal(r.state.resupplyReceived,true);
  assert.equal(E.parseSave(JSON.stringify(r.state)).ok,true);
  // Undo restores the complete pre-handoff snapshot; replay cannot stack the bonus.
  assert.deepEqual(E.endTurn(E.copy(s)).state,r.state);
 }
});

test('the resupply is granted once across team handoffs, restores and later years',()=>{
 let s=atYear(1859); assert.deepEqual(s.reserves,{taiping:4,qing:5});
 s=act(s,'recruit','hong','tianjing').state;
 const savedReserves=E.copy(s.reserves);
 while(!s.result){
  const loaded=E.parseSave(JSON.stringify(s)); assert.equal(loaded.ok,true); assert.equal(loaded.resupplied,false);
  s=E.endTurn(loaded.state).state; assert.deepEqual(s.reserves,savedReserves);
 }
 assert.equal(s.log.filter(entry=>entry.message.startsWith('1859 resupply:')).length,1);
});

test('old v3 saves receive missing resupply only when eligible and never after a finished game',()=>{
 const old=fresh(); delete old.resupplyReceived;
 old.year=1858;
 let loaded=E.parseSave(JSON.stringify(old)); assert.equal(loaded.ok,true); assert.equal(loaded.resupplied,false);
 assert.deepEqual(loaded.state.reserves,{taiping:2,qing:3});
 for(const year of [1859,1861]){
  old.year=year; old.reserves={taiping:0,qing:1};
  loaded=E.parseSave(JSON.stringify(old)); assert.equal(loaded.ok,true); assert.equal(loaded.resupplied,true);
  assert.deepEqual(loaded.state.reserves,{taiping:2,qing:3});
  const again=E.parseSave(JSON.stringify(loaded.state)); assert.equal(again.resupplied,false);
  assert.deepEqual(again.state,loaded.state);
 }
 old.year=1864; old.turn='qing'; old.ap=0; old.result={reason:'cities',winner:null};
 loaded=E.parseSave(JSON.stringify(old)); assert.equal(loaded.ok,true); assert.equal(loaded.resupplied,false);
 assert.deepEqual(loaded.state.reserves,old.reserves);
});

test('save validation accepts the higher token totals only after a valid resupply',()=>{
 let s=atYear(1859); assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
 for(const side of ['taiping','qing']){
  const invalid=E.copy(s); invalid.reserves[side]++; assert.equal(E.parseSave(JSON.stringify(invalid)).ok,false);
 }
 s=fresh(); s.resupplyReceived=true; assert.equal(E.parseSave(JSON.stringify(s)).ok,false);
 s=fresh(); s.reserves.taiping=3; assert.equal(E.parseSave(JSON.stringify(s)).ok,false);
 s=atYear(1859); s.resupplyReceived='true'; assert.equal(E.parseSave(JSON.stringify(s)).ok,false);
});
test('1856 never locks the Taiping turn; history creates no deductions or bonuses',()=>{
 const opening=fresh(), s=atYear(1856);
 assert.equal(s.ap,2); assert.equal(s.turn,'taiping'); assert.equal('pending' in s,false);
 assert.deepEqual(s.armies,opening.armies); assert.deepEqual(s.reserves,opening.reserves);
 assert.equal(E.check(s,'move','hong','suzhou').ok,true);
 for(const year of [1854,1856,1857,1860,1861,1862,1864]) assert.deepEqual(E.battlePreview(atYear(year),'hong','jiangnan'),E.battlePreview(opening,'hong','jiangnan'));
});
test('a complete game has twelve years, twenty-four team turns and forty-eight actions',()=>{
 let s=fresh(), turns=0, actions=0;
 while(!s.result){
  assert.equal(s.ap,2); const side=s.turn;
  const [id,away,back]=side==='taiping'?['hong','hefei','tianjing']:['zeng','wuchang','changsha'];
  for(const target of [away,back]) {s=act(s,'move',id,target).state;actions++;assert.equal(s.turn,side);}
  s=E.endTurn(s).state; turns++;
 }
 assert.equal(turns,24); assert.equal(actions,48); assert.equal(s.year,1864); assert.equal(s.result.reason,'cities');
});
test('final city count correctly awards either winner or a draw',()=>{
 for(const side of ['taiping','qing',null]){
  let s=finishFixtureTurn(atYear(1864)); if(side)s.cities.suzhou.owner=side;
  s=finishFixtureTurn(s); assert.equal(s.result.winner,side); assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
 }
});

test('ending Qing early in 1864 still produces the final score once',()=>{
 let s=finishFixtureTurn(atYear(1864)); s.cities.suzhou.owner='qing';
 assert.equal(s.ap,2); const result=E.endTurn(s); assert.equal(result.ok,true);
 s=result.state; assert.equal(s.year,1864); assert.equal(s.ap,0);
 assert.equal(s.result.reason,'cities'); assert.equal(s.result.winner,'qing');
 assert.equal(E.endTurn(s).ok,false); assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
});
test('battle dice are reproducible after undo or restoring a save',()=>{
 const s=fresh(), loaded=E.parseSave(JSON.stringify(s)).state;
 assert.deepEqual(act(s,'attack','hong','jiangnan').battle,act(loaded,'attack','hong','jiangnan').battle);
});
test('failed and tied attacks retain the city and have no victory side effects',()=>{
 const found=new Set();
 for(let seed=0;seed<300&&found.size<2;seed++){
  const s=E.createGame({seed}); E.armyById(s,'hong').strength=5;
  const r=act(s,'attack','hong','jiangnan'); if(r.battle.outcome==='attacker')continue;
  found.add(r.battle.outcome); assert.equal(r.state.cities.jiangnan.owner,'qing'); assert.equal(r.captured,false); assert.equal(r.state.result,null);
 }
 assert.deepEqual([...found].sort(),['defender','tie']);
});
test('older rules and malformed saves are rejected with usable messages',()=>{
 assert.match(E.parseSave(JSON.stringify({...fresh(),version:2})).error,/older treasury rules/);
 for(const change of [s=>s.year='1853',s=>s.ap=3,s=>s.reserves.qing=-1,s=>s.armies[0]=null,s=>s.armies[0].strength=11,s=>s.armies[0].city='constructor',s=>s.cities.tianjing.owner='qing',s=>s.result={reason:'cities',winner:'qing'}]){
  const s=fresh(); change(s); assert.equal(E.parseSave(JSON.stringify(s)).ok,false);
 }
});
test('400 complete campaigns preserve actions, ownership, saves and termination',()=>{
 const outcomes={taiping:0,qing:0,draw:0};
 for(let seed=0;seed<400;seed++){
  let s=E.createGame({seed}), turns=0, actions=0;
  while(!s.result&&turns<24){
   while(s.ap&&!s.result){
    const options=[];
    for(const a of s.armies.filter(a=>a.faction===s.turn)){
     if(E.check(s,'recruit',a.id,a.city).ok) options.push(['recruit',a.id,a.city]);
     for(const target of D.neighbours[a.city]){const action=E.actionFor(s,a.id,target);if(E.check(s,action,a.id,target).ok)options.push([action,a.id,target]);}
    }
    if(!options.length)break;
    const before=JSON.stringify(s),ap=s.ap,side=s.turn;
    const r=E.applyAction(s,...options[(seed*13+actions*7+turns*3)%options.length]);
    assert.equal(r.ok,true,r.error); assert.equal(JSON.stringify(s),before);
    s=r.state; actions++; assert.equal(s.ap,ap-1); assert.equal(s.turn,side);
    assert.ok(s.armies.every(a=>a.strength>=0&&a.strength<=10&&(a.strength===0||s.cities[a.city].owner===a.faction)));
    assert.equal(E.parseSave(JSON.stringify(s)).ok,true);
   }
   if(!s.result){s=E.endTurn(s).state;turns++;assert.equal(E.parseSave(JSON.stringify(s)).ok,true);}
  }
  assert.ok(s.result,'campaign '+seed+' must finish'); assert.ok(actions<=48); outcomes[s.result.winner||'draw']++;
 }
 console.log('400 simulated campaigns:',outcomes);
});
