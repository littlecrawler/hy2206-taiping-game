# The Taiping Rebellion — HY2206 Classroom Game

**English** | [简体中文](README.zh-CN.md)

A two-team strategy game for a shared classroom screen. **Classroom v3** uses simplified rules: **1853–1864, two actions per team each year**. The interface is in English, with English and Chinese city names.

[Play online](https://littlecrawler.github.io/hy2206-taiping-game/)

## Play offline

Open **Taiping-Classroom.html** in Chrome or Edge. This single file contains the game, both historical maps, seven supplied MP3 clips, two soldier icons and two victory pictures. Copying this one file to another computer is enough; no installation or internet is required.

The root **index.html** is an identical copy for GitHub Pages. The editable version is in **dist/**; keep that whole folder together when using it separately.

## Explain the game in 30 seconds

1. Taiping plays first, then Qing. Each team has **two actions per year**, shared across all its armies.
2. Select your army, then a connected city. **Move** into an empty city to capture it automatically; **attack** if an enemy army is there.
3. In battle, each side adds one six-sided die to its strength. The higher total wins. The game handles losses and retreats.
4. After Qing finishes in **1864**, the team with more cities wins. Each city is one point; equal scores are a draw.
5. **Northern bonus:** Taiping wins immediately by capturing Beijing 北京. Qing capturing Tianjing 天京 earns one city and the game continues.

Each move, attack or reinforcement uses **one action**. You can use both actions with the same army or split them between armies. **End turn early** lets you hand over before using both actions; unused actions do not carry over. After using both, click **Next team**. Only the active team can act until the turn is handed over.

There is no treasury, income, fortification, separate claim action or compulsory historical decision. History cards provide context and never block play.

## Starting position and battle details

| | Taiping | Qing |
| --- | --- | --- |
| Starting cities | Tianjing 天京, Anqing 安庆, Hefei 合肥 | Beijing 北京, Jiangnan Camp 江南大营, Changsha 长沙 |
| Army strength | 6 + 4 = **10** | 5 + 5 + 2 = **12** |
| Reinforcement tokens | **2** | **3** |

Qing has a modest starting advantage in strength and tokens. All other cities start neutral. These are classroom balance choices, not historical troop counts or an exact map of territorial control.

- **Reinforce**: spend one action and one token to add up to two strength to the selected army, capped at ten. At the start of **1859**, both teams receive **2 additional reinforcement tokens**, added to any tokens they still have. This supply bonus happens once; other years do not refill tokens.
- **Attacker wins**: the attacker moves into and captures the city, loses one strength (minimum one), and the defending force loses two strength and retreats.
- **Defender wins**: the attacker stays where it was and loses two strength. The defending force loses one strength, retaining at least one.
- **Tie**: each force loses one strength; city control does not change.
- Multiple armies in a city combine their strength when defending. Losses are taken from the strongest army first.
- Retreat is automatic to the nearest friendly city; its route does not cost actions. If no friendly city remains, that army has zero strength.
- An army with zero strength can return by reinforcing at a friendly city. If it cannot act, choose another army or click **End turn early**.

## The three campaign routes

| Route | Cities and connections | Strategic focus |
| --- | --- | --- |
| Northern Expedition | Tianjing 天京 → Hefei 合肥 → Kaifeng 开封 → Huaiqing 怀庆 → Linqing 临清 → Cangzhou 沧州 → Tianjin 天津 → Beijing 北京 | Advance toward Beijing. Taiping wins immediately if it captures Beijing. |
| Western Expedition | Tianjing 天京 → Anqing 安庆 → Jiujiang 九江 → Wuchang 武昌 → Changsha 长沙 | Expand west through the Yangtze corridor toward Changsha and gain cities for the final score. |
| Eastern Campaign | Tianjing 天京 → Suzhou 苏州 → Hangzhou 杭州 → Ningbo 宁波; branch: Suzhou 苏州 → Shanghai 上海 | Expand through the eastern cities, with Shanghai available as a branch from Suzhou. Each captured city adds one point. |

Each move or attack across **one connection costs 1 action**. Both teams can use any connected route and change direction. The North, West and East buttons highlight the routes; choosing a highlight does not restrict movement. Western and eastern captures contribute to the final city score; the Taiping capture of Beijing is the special immediate-win condition.

## Reading and operating the map

**Red circles and labels = Taiping control. Blue = Qing. Grey = neutral.** Soldier portraits show the armies' current locations; the number on each portrait is its strength. A city remains yours when its army leaves.

The red or blue turn banner stays visible while scrolling. It names the active team and shows actions remaining. The opposing team waits until **End turn early** or **Next team** is clicked.

Click an army in the left roster, or click a friendly city containing your troops. Use **Connected destinations** on the right to choose where that army should go. The available move/attack button follows the destination. Capturing a city updates its colour, the army position, the score and the capture message together.

**Quick rules** opens the short explanation. **Historical atlas** shows the original maps. The year markers open history cards. **Results** shows the current score or final outcome. Undo, fullscreen, the campaign log and text saves are also available.

## Sound and artwork

Sound starts **on** and begins playing when you perform a movement or battle action. Click the sound control to mute it. Settings → **Test sound** plays marching, battle and capture clips without spending an action. The game uses the group's seven supplied MP3s, with no synthesized audio.

| Event | Audio |
| --- | --- |
| Move | Marching, a 2.5-second excerpt |
| Battle | Sword fighting, a 3-second excerpt |
| Capture | City Captured, after movement or battle |
| A defending team's next turn after losing a city | City Lost, once per turn |
| Taiping victory, by Beijing capture or final score | Taiping Victory |
| Qing victory by final score | Qing Victory |
| Final-score draw | Endgame |

Audio never blocks an action. A new move or battle replaces the previous sequence, but changing teams lets the current action and capture sounds finish; any turn-loss announcement follows them. Muting, undoing, restoring or starting a new game stops playback. Refreshing resets sound to on; loading the page alone does not autoplay audio.

The supplied Taiping and Qing soldiers appear on the map and in the roster. Each team's victory shows its corresponding supplied picture. A draw currently uses a text result.

## Save and restore

The current game lives in the browser tab. **Refreshing or closing the page clears it.**

Open the settings button → **Save / restore text**, then copy the save into your own notes. Paste it back and choose **Restore this text** to continue. Saves include the dice sequence, so undoing and repeating a battle gives the same dice.

**Version 1 and 2 saves use the old treasury rules and cannot be restored in Classroom v3. Start a new game for this edition.** Version 3 saves preserve the remaining actions in that turn.

Older version 3 saves from 1859 onward receive the missing supply bonus once when restored, provided the game is still in progress. New saves remember whether it has already been received.

## Edit, build and verify

Node.js is only needed for development commands; there are no package dependencies.

    node preview.mjs

Open the address printed in the terminal, normally http://127.0.0.1:8766. To use another port, run **node preview.mjs 8767**. Stop the server with Ctrl+C.

After changing files in **dist/**, rebuild both complete HTML files:

    node build-standalone.mjs

Run the rule, simulation, audio and embedded-asset checks:

    node --test tests/engine.test.cjs tests/sound.test.cjs

The tests include 400 simulated campaigns covering legal moves, city ownership, turn limits, saves and game endings. These are correctness checks, not a prediction of balanced human win rates.

| File | Purpose |
| --- | --- |
| dist/index.html, dist/style.css | Layout and appearance |
| dist/data.js | Cities, connections, starting armies and history text |
| dist/engine.js | Actions, battles, turns and saves |
| dist/app.js | Controls, map rendering, dialogs and results |
| dist/sound.js | Supplied-audio playback |
| dist/assets/ | Maps, audio and artwork |
| build-standalone.mjs | Embeds all assets into both complete HTML files |
| tests/ | Automated checks |
| qa/ | Local verification artifacts; excluded from Git |

GitHub Pages serves the root **index.html**. Push the rebuilt file with the source changes; the published page updates after deployment finishes. Look for **CLASSROOM v3** and **Two actions per team each year** in the header.

## Materials and historical context

- Original maps and audio remain in the project root. Web copies are under **dist/assets/**. The four PNG pictures supplied by the group are under **dist/assets/images/**.
- **references/group-proposal-snapshot.txt** preserves the earlier working proposal locally; the references folder is excluded from Git. Classroom v3 deliberately simplifies that proposal.
- Historical text follows the group's working research. The game also links to an [1864 diplomatic report](https://history.state.gov/historicaldocuments/frus1864p3/d433) and [National Army Museum material on the Second China War](https://www.nam.ac.uk/explore/second-china-war).
- Army names represent associated forces, not the named leaders' literal movements or continued personal command. The rules and artwork are classroom representations; they do not reproduce the full historical experience.
- The original map publication details and the group's complete research bibliography still need to accompany the presentation.
