# The Taiping Rebellion

**English** | [简体中文](README.zh-CN.md)

A two-team browser strategy game created for our HY2206 group project. Play on a shared screen, with an English interface and bilingual city names.

## Choose a version

| Version | What to expect |
| --- | --- |
| [Classroom — new version](https://littlecrawler.github.io/hy2206-taiping-game/) | The version used in our presentation. Two actions per team each year, automatic city capture and limited reinforcements. Most cities in 1864 wins; Taiping can also win by capturing Beijing. |
| [Original — full rules](https://littlecrawler.github.io/hy2206-taiping-game/classic.html) | Three action points per team, treasury, annual income, separate city claims, recruitment, fortifications and historical event choices. Capture the opposing capital by 1864, or draw. |

Switch versions at the top of either game. Both cover **1853–1864** and include their own in-game rules. Save your game before switching; saves belong to their respective version.

## Offline / development

Download **index.html** (new) and **classic.html** (original) into the same folder. Each works offline on its own in Chrome or Edge; keeping both lets you switch between them.

Sources are in `src/classroom/` and `src/classic/`; shared maps, audio and artwork are in `src/assets/`. The original rules were restored from [e03621f](https://github.com/littlecrawler/hy2206-taiping-game/commit/e03621f3a44aff898d0dd8c61222acbbc03cad27).

```sh
node scripts/build.mjs
node scripts/preview.mjs
node --test tests/*.test.cjs
```

Historical maps, audio and artwork were supplied by the group. The game is a classroom interpretation of the Taiping Rebellion.
