import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const editionCss = await readFile(resolve(root, 'src/editions.css'), 'utf8');
const maps = {};
for (const phase of ['early', 'late']) {
  maps[phase] = 'data:image/jpeg;base64,' + (await readFile(resolve(root, 'src/assets', phase + '-map.jpg'))).toString('base64');
}
for (const [edition, output] of [['classroom', 'index.html'], ['classic', 'classic.html']]) {
  const source = resolve(root, 'src', edition);
  let html = (await readFile(resolve(source, 'index.html'), 'utf8')).replace(/\r\n/g, '\n');
  const css = await readFile(resolve(source, 'style.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + css + '\n</style>');
  html = html.replace('<link rel="stylesheet" href="../editions.css">', () => '<style>\n' + editionCss + '\n</style>');
  html = html.replaceAll('href="../../', 'href="');
  const audio = {};
  for (const [name, file] of Object.entries(require(resolve(source, 'sound.js')).files)) {
    audio[name] = 'data:audio/mpeg;base64,' + (await readFile(resolve(source, file))).toString('base64');
  }
  const scripts = ['window.TAIPING_MAP_ASSETS = ' + JSON.stringify(maps) + ';', 'window.TAIPING_SOUND_ASSETS = ' + JSON.stringify(audio) + ';'];
  if (edition === 'classroom') {
    const images = {};
    for (const name of ['taiping-troop', 'qing-troop', 'taiping-victory', 'qing-victory', 'draw-ending']) {
      images[name] = 'data:image/png;base64,' + (await readFile(resolve(root, 'src/assets/images', name + '.png'))).toString('base64');
    }
    scripts.push('window.TAIPING_IMAGE_ASSETS = ' + JSON.stringify(images) + ';');
  }
  for (const name of ['data.js', 'engine.js', 'sound.js', 'app.js']) {
    scripts.push((await readFile(resolve(source, name), 'utf8')).replace(/<\/script/gi, '<\\/script'));
    html = html.replace('  <script defer src="' + name + '"></script>\n', '');
  }
  html = html.replace('</body>', () => '<script>\n' + scripts.join('\n') + '\n</script>\n</body>');
  await writeFile(resolve(root, output), html, 'utf8');
  console.log('Built ' + output + ' (' + edition + ')');
}
