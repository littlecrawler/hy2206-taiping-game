# 太平天国运动

[English](README.md) | **简体中文**

为 HY2206 小组作业制作的双阵营网页策略游戏。适合共用屏幕游玩，界面为英文，地名提供中英对照。

## 选择版本

| 版本 | 主要规则 |
| --- | --- |
| [Classroom 课堂版（简化规则）](https://littlecrawler.github.io/hy2206-taiping-game/) | 展示时使用的版本。每年每队 2 次行动，移动自动占领，增援次数有限。1864 年城市多的一方获胜；太平军占领北京也可直接获胜。 |
| [旧版（更多规则）](https://littlecrawler.github.io/hy2206-taiping-game/classic.html) | 每队 3 点行动，保留国库、年度收入、单独占领、招募、筑城、历史事件选择和随机事件（默认开启）。1864 年结束前攻占对方首都获胜，否则平局。 |

在游戏顶部可以切换版本。两版均涵盖 **1853–1864 年**，具体规则可在游戏内查看。切换前请先保存游戏；两版存档分别使用。

## 离线游玩 / 开发

下载 **index.html**（Classroom 课堂版）和 **classic.html**（旧版），放在同一文件夹，用 Chrome 或 Edge 打开。每个文件都能独立离线运行；两个文件放在一起即可切换。

源码分别位于 `src/classroom/` 和 `src/classic/`；共用地图、音频和图片集中在 `src/assets/`。

```sh
node scripts/build.mjs
node scripts/preview.mjs
node --test tests/*.test.cjs
```

历史地图、音频及图片由小组提供。游戏是对太平天国运动的课堂演绎。
