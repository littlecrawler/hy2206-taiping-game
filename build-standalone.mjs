import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");
let html = await readFile(resolve(dist, "index.html"), "utf8");
const css = await readFile(resolve(dist, "style.css"), "utf8");
const maps = {};
for (const phase of ["early", "late"]) {
  maps[phase] = "data:image/jpeg;base64," + (await readFile(resolve(dist, "assets", phase + "-map.jpg"))).toString("base64");
}
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>");
const scripts = ['window.TAIPING_MAP_ASSETS = ' + JSON.stringify(maps) + ";"];
for (const name of ["data.js", "engine.js", "app.js"]) {
  scripts.push((await readFile(resolve(dist, name), "utf8")).replace(/<\/script/gi, "<\\/script"));
  html = html.replace('  <script defer src="' + name + '"></script>\n', "");
}
html = html.replace("</body>", "<script>\n" + scripts.join("\n") + "\n</script>\n</body>");
await writeFile(resolve(root, "Taiping-Classroom.html"), html, "utf8");
console.log("Standalone classroom game: " + resolve(root, "Taiping-Classroom.html"));
