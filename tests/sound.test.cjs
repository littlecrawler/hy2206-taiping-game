const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createPlayer, files, sequenceFor } = require("../dist/sound.js");
const E = require("../dist/engine.js");
const clips = (event, details) => sequenceFor(event, details).map(step => step.clip);

function fixture() {
  const calls = [], errors = [];
  const media = {
    paused: true, currentTime: 0,
    play() { this.paused = false; calls.push(this.src); return Promise.resolve(); },
    pause() { this.paused = true; },
    finish() { if (this.onended) this.onended(); }
  };
  let created = 0;
  const player = createPlayer({ createAudio: () => { created++; return media; } });
  player.setErrorHandler(error => errors.push(error));
  return { player, media, calls, errors, created: () => created };
}

test("sound defaults on without autoplay, and muting prevents audio", async () => {
  const f = fixture();
  assert.equal(f.player.isEnabled(), true);
  assert.equal(f.created(), 0);
  f.player.setEnabled(false);
  assert.equal(await f.player.play("move"), false);
  f.player.setEnabled(true);
  assert.equal(await f.player.play("select"), false);
  assert.equal(f.created(), 0);
  f.player.stop();
});

test("the first game action plays at full volume without toggling sound", async () => {
  const f = fixture();
  assert.equal(await f.player.play("move"), true);
  assert.deepEqual(f.calls, [files.move]);
  assert.equal(f.media.paused, false);
  assert.equal(f.media.muted, false);
  assert.equal(f.media.volume, 1);
  f.player.stop();
});

test("a normal turn change preserves the current movement and capture audio", async () => {
  const f = fixture();
  await f.player.play("move", { captured: true });
  f.media.currentTime = 0.4;
  assert.equal(await f.player.play("turn", {}), false);
  assert.equal(f.media.paused, false);
  assert.equal(f.media.currentTime, 0.4);
  assert.deepEqual(f.calls, [files.move]);
  f.media.finish();
  await Promise.resolve();
  assert.deepEqual(f.calls, [files.move, files.capture]);
  f.player.stop();
});

test("turn loss audio waits for the move and capture; stale endings cannot skip a clip", async () => {
  const f = fixture();
  await f.player.play("move", { captured: true });
  const moveEnded = f.media.onended;
  await f.player.play("turn", { side: "qing", previousCities: { city: { owner: "qing" } }, cities: { city: { owner: "taiping" } } });
  assert.deepEqual(f.calls, [files.move]);
  moveEnded();
  await Promise.resolve();
  assert.deepEqual(f.calls, [files.move, files.capture]);
  moveEnded();
  assert.deepEqual(f.calls, [files.move, files.capture]);
  f.media.finish();
  await Promise.resolve();
  assert.deepEqual(f.calls, [files.move, files.capture, files.loss]);
  f.player.stop();
});

test("the sound check plays the supplied marching, battle and capture clips", async () => {
  const f = fixture();
  await f.player.play("test");
  f.media.finish();
  await Promise.resolve();
  f.media.finish();
  await Promise.resolve();
  assert.deepEqual(f.calls, [files.move, files.battle, files.capture]);
  f.player.stop();
});

test("battle audio follows actual city capture and faction victory outcomes", () => {
  const state = E.createGame({ seed: 19 });
  state.armies.find(a => a.id === "hong").strength = 10;
  const captured = E.applyAction(state, "attack", "hong", "jiangnan");
  assert.equal(captured.ok, true);
  assert.deepEqual(clips("battle", { battle: captured.battle }), ["battle", "capture"]);
  for (const outcome of ["defender", "tie", "no-capture"]) {
    assert.deepEqual(clips("battle", { battle: { outcome } }), ["battle"]);
  }
  state.armies.find(a => a.id === "hong").city = "tianjin";
  const victory = E.applyAction(state, "attack", "hong", "beijing");
  assert.equal(victory.state.result.winner, "taiping");
  assert.deepEqual(clips("battle", { battle: victory.battle, result: victory.state.result }), ["battle", "taipingVictory"]);
  assert.deepEqual(clips("battle", { result: { winner: "qing" } }), ["battle", "qingVictory"]);
  assert.deepEqual(clips("turn", { result: { winner: null, reason: "time" } }), ["endgame"]);
  assert.deepEqual(clips("claim"), ["capture"]);
});

test("city loss is announced once to the returning defender, never for a neutral claim", () => {
  const before = E.createGame({ seed: 19 });
  before.armies.find(a => a.id === "hong").strength = 10;
  const after = E.applyAction(before, "attack", "hong", "jiangnan").state;
  const details = { previousCities: before.cities, cities: after.cities, side: "qing" };
  assert.deepEqual(clips("turn", details), ["loss"]);
  assert.deepEqual(clips("turn", { ...details, side: "taiping" }), []);
  assert.deepEqual(clips("turn", { ...details, previousCities: after.cities }), []);
  after.cities.huaiqing.owner = "taiping";
  assert.deepEqual(clips("turn", { previousCities: before.cities, cities: { ...before.cities, huaiqing: after.cities.huaiqing }, side: "qing" }), []);
});

test("clips queue on one full-volume media element and mute cancels the queue", async () => {
  const f = fixture();
  f.player.setEnabled(true);
  assert.equal(await f.player.play("battle", { battle: { outcome: "attacker" } }), true);
  assert.equal(f.media.volume, 1);
  assert.equal(f.media.loop, false);
  f.media.finish();
  await Promise.resolve();
  assert.deepEqual(f.calls, [files.battle, files.capture]);
  assert.equal(f.created(), 1);
  const oldEnded = f.media.onended;
  f.player.setEnabled(false);
  oldEnded();
  assert.equal(f.media.paused, true);
  assert.equal(f.media.currentTime, 0);
  assert.equal(f.calls.length, 2);
});

test("a new sound cancels the previous battle's queued victory", async () => {
  const f = fixture();
  f.player.setEnabled(true);
  await f.player.play("battle", { result: { winner: "qing" } });
  const oldEnded = f.media.onended;
  await f.player.play("move");
  oldEnded();
  assert.deepEqual(f.calls, [files.battle, files.move]);
  f.player.stop();
  assert.equal(f.media.paused, true);
});

test("playback rejection is handled and does not prevent a later retry", async () => {
  const f = fixture();
  f.player.setEnabled(true);
  f.media.play = () => Promise.reject(new Error("Playback blocked"));
  assert.equal(await f.player.play("move"), false);
  assert.equal(f.errors.length, 1);
  assert.equal(f.media.paused, true);
  f.media.play = () => Promise.resolve();
  assert.equal(await f.player.play("claim"), true);
  f.player.stop();
});

test("late rejection from an interrupted clip cannot stop newer audio", async () => {
  const f = fixture();
  let rejectOld;
  f.player.setEnabled(true);
  f.media.play = () => new Promise((_, reject) => { rejectOld = reject; });
  const pending = f.player.play("battle");
  f.media.play = function () { this.paused = false; return Promise.resolve(); };
  await f.player.play("claim");
  rejectOld(new Error("Interrupted by new media"));
  await pending;
  assert.equal(f.media.paused, false);
  assert.equal(f.errors.length, 0);
  f.player.stop();
});

test("both standalone pages embed all seven original MP3 payloads and current scripts", () => {
  const root = path.join(__dirname, "..");
  const standalone = fs.readFileSync(path.join(root, "Taiping-Classroom.html"), "utf8");
  assert.equal(standalone, fs.readFileSync(path.join(root, "index.html"), "utf8"));
  const embedded = JSON.parse(standalone.match(/window\.TAIPING_SOUND_ASSETS = (\{[^\n]+\});/)[1]);
  assert.equal(Object.keys(embedded).length, 7);
  for (const [key, file] of Object.entries(files)) {
    const original = fs.readFileSync(path.join(root, "dist", file));
    assert.ok(original.length > 1000);
    assert.match(embedded[key], /^data:audio\/mpeg;base64,/);
    assert.deepEqual(Buffer.from(embedded[key].split(",")[1], "base64"), original);
  }
  for (const file of ["data.js", "engine.js", "sound.js", "app.js"]) {
    const source = fs.readFileSync(path.join(root, "dist", file), "utf8").replace(/<\/script/gi, "<\\/script");
    assert.ok(standalone.includes(source), file + " must match the current source");
  }
  for (const match of standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  assert.doesNotMatch(standalone, /<script[^>]+src=|<link[^>]+stylesheet/);
  assert.doesNotMatch(standalone, /AudioContext|createOscillator|createBufferSource/);
});

test("standalone pages embed all four supplied troop and victory images without changes", () => {
  const root = path.join(__dirname, "..");
  const standalone = fs.readFileSync(path.join(root, "Taiping-Classroom.html"), "utf8");
  const embedded = JSON.parse(standalone.match(/window\.TAIPING_IMAGE_ASSETS = (\{[^\n]+\});/)[1]);
  const names = ["taiping-troop", "qing-troop", "taiping-victory", "qing-victory"];
  assert.deepEqual(Object.keys(embedded).sort(), names.slice().sort());
  for (const name of names) {
    assert.match(embedded[name], /^data:image\/png;base64,/);
    const original = fs.readFileSync(path.join(root, "dist", "assets", "images", name + ".png"));
    assert.deepEqual(Buffer.from(embedded[name].split(",")[1], "base64"), original);
  }
});
