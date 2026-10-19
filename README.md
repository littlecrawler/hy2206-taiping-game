# The Taiping Rebellion — HY2206 Campaign Table

**English** | [简体中文](README.zh-CN.md)

A strategy game about the Taiping Rebellion for a classroom activity with two teams and one shared screen. The interface, rules and historical event explanations are in English. Every playable city has both an English and a Chinese label.

## Getting started

For offline classroom use, open **Taiping-Classroom.html** in your browser. This single file includes both maps; copying it to another computer is enough to play.

The files in dist/ provide the version for editing. You can also open dist/index.html directly; copy the entire dist folder when transferring this version to another computer.

The game needs no installation or internet connection. The optional preview, verification and build commands below require Node.js.

To preview the game at a local address, run this command from the project directory:

    node preview.mjs

Open the address printed in the terminal, normally http://127.0.0.1:8766. Press Ctrl+C to stop the preview. If the port is busy, run node preview.mjs 8767. A preview server is optional for offline play.

## GitHub Pages

The repository's root **index.html** is the game homepage. It contains the same game as Taiping-Classroom.html. The .nojekyll file lets GitHub Pages serve the files directly.

1. Commit and push the root index.html and .nojekyll files to the main branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select **main** and **/(root)**, then click **Save**.
5. After deployment completes, click **Visit site** to open the game.

See the [official GitHub Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Classroom play

1. Divide the class into Taiping and Qing teams. A host operates the game on one computer. There is no automated opponent.
2. Select an army from the active side on the left, select a city on the map, then choose an enabled action on the right.
3. Each side shares 3 action points (AP) between its two armies each year. A side may end its turn early.
4. Attacks first show both sides' forces and modifiers. Clicking **Roll & resolve battle** pays the cost, rolls the dice and resolves combat.
5. After both sides finish, the game advances to the next year and displays its historical event. In 1856, the Taiping must choose a response to the Tianjing Incident.
6. Open **Debrief** to compare your campaign with the historical outcome. **Historical atlas** shows both original maps.

Use the fullscreen button in the top-right corner for projection. The game also includes a 60-second discussion timer, undo and a campaign log. Debrief is available in any year; set a time limit after a rehearsal so that playing every round does not crowd out historical discussion.

## Saving and restoring

The campaign is stored in the current tab's memory. Refreshing or closing the page clears the game.

Open settings in the top-right corner and choose **Save / restore text**. Copy the save text into your own notes. To resume, paste it back and click **Restore this text**.

This version does not automatically write persistent browser storage or download save files. Save text includes the dice sequence, so undoing and repeating the same battle produces the same dice results.

## Rules to confirm with the group

The detailed opening starts in 1853 and ends in 1864, giving **12 annual rounds, or 24 faction turns**. The proposal's overview also mentions “14 turns”; the group still needs to settle that discrepancy.

This version keeps the proposal's starting resources, army strengths, main routes, action costs, income cap and annual events. The following clarifications make the game playable and are also explained under **Sources & modelling choices**:

- **Starting control:** Taiping holds Tianjing and Anqing. Qing holds Beijing, Changsha, Jiangnan Camp and Shanghai. All other cities begin neutral. This is a game setup, not a complete reconstruction of territorial control in 1853.
- **City defence:** both capitals start with 4 defence, Shanghai with 2 and other cities with 0. Fortifying adds 2, up to a maximum of 8.
- **Retreat:** surviving defenders automatically retreat to the nearest reachable friendly city through non-hostile territory, without an AP or treasury cost. If no route exists, the army is routed.
- **Routed armies:** a force with zero strength regroups at its friendly capital and must recruit before acting again.
- **Combined defence:** defending armies in the same city combine their strength. Defender losses affect the strongest army first, followed by city defence.
- **Event timing:** one-time events occur when the year begins. Combat bonuses apply only during the named year.
- **Income:** 1853 uses the starting treasuries without an extra collection. From 1854 onward, the sequence is historical event → optional random event → income for both sides.
- **Time limit:** if neither capital has fallen after Qing's 1864 turn, the game ends in a stalemate.
- **Random events:** off by default and enabled before starting a new campaign. They are hypothetical game conditions, not claims about what happened in a particular year.

Army names represent associated forces, not the named leader's literal movements or continued personal command. The model cannot fully represent religion, ethnic violence, civilian experience, social mobilisation or the human costs of war. The debrief includes questions about these omissions.

**Classroom balance still needs testing.** An early ending is possible: if the Taiping leave Tianjing to advance north in 1853 without a garrison, Qing may capture the capital that year. A game may therefore finish before later events occur. The group can keep short games and use the separate chronology afterwards, or adjust capital defence, starting garrisons and supply rules after playtesting. This version retains the proposal's immediate victory for capturing the opposing capital.

## Materials and historical sources

- The two original JPG maps remain in the project root. Copies used by the editable webpage are in dist/assets/.
- references/group-proposal-snapshot.txt is a local snapshot of the discussion document read on 2026-10-19, retained for comparison with the implementation. The Google Doc was not edited. The references folder is excluded from Git.
- Event narratives follow the group's working research and should not be treated as a fully verified final teaching script.
- The game links to an [1864 diplomatic source from the Office of the Historian](https://history.state.gov/historicaldocuments/frus1864p3/d433) and [National Army Museum material about the Second China War](https://www.nam.ac.uk/explore/second-china-war). The diplomatic correspondence expresses contemporary interests and should be read critically.
- The original maps' publication, author and page details were not supplied. The group should complete those citations before presenting.

## Project structure

    tP/
      index.html             Game homepage for GitHub Pages
      .nojekyll              Serve the static files directly
      Taiping-Classroom.html Single file for offline classroom use
      dist/
        index.html           Entry point for the editable version
        style.css            Styles and responsive layout
        data.js              Cities, routes, armies and event text
        engine.js            Turns, resources, combat and save validation
        app.js               Interface interactions
        assets/              Copies of the two supplied maps
      references/            Local proposal snapshot; excluded from Git
      tests/                 Game-rule checks
      preview.mjs            Optional local preview server
      build-standalone.mjs   Generate the offline file and Pages homepage
      README.md              English documentation, shown by default
      README.zh-CN.md        Chinese documentation

Check the game rules:

    node --test tests/engine.test.cjs

After editing the source files in dist/, regenerate both the offline version and the GitHub Pages homepage:

    node build-standalone.mjs

All project files are kept within the project directory.
