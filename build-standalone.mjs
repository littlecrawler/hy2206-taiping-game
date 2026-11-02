import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const { files: audioFiles } = createRequire(import.meta.url)("./dist/sound.js");

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");
let html = (await readFile(resolve(dist, "index.html"), "utf8")).replace(/\r\n/g, "\n");
const css = await readFile(resolve(dist, "style.css"), "utf8");
const maps = {};
for (const phase of ["early", "late"]) {
  maps[phase] = "data:image/jpeg;base64," + (await readFile(resolve(dist, "assets", phase + "-map.jpg"))).toString("base64");
}
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>");
const audio = {};
for (const [name, file] of Object.entries(audioFiles)) {
  audio[name] = "data:audio/mpeg;base64," + (await readFile(resolve(dist, file))).toString("base64");
}
const images = {};
for (const name of ["taiping-troop", "qing-troop", "taiping-victory", "qing-victory"]) {
  images[name] = "data:image/png;base64," + (await readFile(resolve(dist, "assets/images", name + ".png"))).toString("base64");
}
const scripts = ['window.TAIPING_MAP_ASSETS = ' + JSON.stringify(maps) + ";", 'window.TAIPING_SOUND_ASSETS = ' + JSON.stringify(audio) + ";", 'window.TAIPING_IMAGE_ASSETS = ' + JSON.stringify(images) + ";"];
for (const name of ["data.js", "engine.js", "sound.js", "app.js"]) {
  scripts.push((await readFile(resolve(dist, name), "utf8")).replace(/<\/script/gi, "<\\/script"));
  html = html.replace('  <script defer src="' + name + '"></script>\n', "");
}
html = html.replace("</body>", function () { return "<script>\n" + scripts.join("\n") + "\n</script>\n</body>"; });
await writeFile(resolve(root, "Taiping-Classroom.html"), html, "utf8");
await writeFile(resolve(root, "index.html"), html, "utf8");
console.log("Standalone classroom game: " + resolve(root, "Taiping-Classroom.html"));
console.log("GitHub Pages homepage: " + resolve(root, "index.html"));
