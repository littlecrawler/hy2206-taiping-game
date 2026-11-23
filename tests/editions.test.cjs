const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

for (const [edition, page, otherPage] of [['classroom', 'index.html', 'classic.html'], ['classic', 'classic.html', 'index.html']]) {
  test(edition + ' page includes its own engine, switch links and all offline media', () => {
    const source = path.join(root, 'src', edition);
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(html.includes('href="' + otherPage + '"'));
    assert.ok(html.includes('href="' + page + '" aria-current="page"'));
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet/);
    for (const file of ['data.js', 'engine.js', 'sound.js', 'app.js']) {
      assert.ok(html.includes(fs.readFileSync(path.join(source, file), 'utf8').replace(/<\/script/gi, '<\\/script')), file);
    }
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
    const audio = JSON.parse(html.match(/window\.TAIPING_SOUND_ASSETS = (\{[^\n]+\});/)[1]);
    assert.equal(Object.keys(audio).length, 7);
    for (const [key, file] of Object.entries(require(path.join(source, 'sound.js')).files)) {
      assert.match(audio[key], /^data:audio\/mpeg;base64,/);
      assert.deepEqual(Buffer.from(audio[key].split(',')[1], 'base64'), fs.readFileSync(path.resolve(source, file)));
    }
    const maps = JSON.parse(html.match(/window\.TAIPING_MAP_ASSETS = (\{[^\n]+\});/)[1]);
    for (const phase of ['early', 'late']) {
      assert.deepEqual(Buffer.from(maps[phase].split(',')[1], 'base64'), fs.readFileSync(path.join(root, 'src/assets', phase + '-map.jpg')));
    }
    assert.doesNotMatch(html, /AudioContext|createOscillator|createBufferSource/);
  });
}

test('the classroom edition retains all five supplied troop and ending images', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const images = JSON.parse(html.match(/window\.TAIPING_IMAGE_ASSETS = (\{[^\n]+\});/)[1]);
  const names = ['taiping-troop', 'qing-troop', 'taiping-victory', 'qing-victory', 'draw-ending'];
  assert.deepEqual(Object.keys(images).sort(), names.slice().sort());
  for (const name of names) assert.deepEqual(Buffer.from(images[name].split(',')[1], 'base64'), fs.readFileSync(path.join(root, 'src/assets/images', name + '.png')));
});

test('each edition accepts its own save and rejects the other ruleset', () => {
  const current = require('../src/classroom/engine.js');
  const classic = require('../src/classic/engine.js');
  const currentSave = JSON.stringify(current.createGame({seed: 19}));
  const classicSave = JSON.stringify(classic.createGame({seed: 19}));
  assert.equal(current.parseSave(currentSave).ok, true);
  assert.equal(classic.parseSave(classicSave).ok, true);
  assert.equal(current.parseSave(classicSave).ok, false);
  assert.equal(classic.parseSave(currentSave).ok, false);
});
