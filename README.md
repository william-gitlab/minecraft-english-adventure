# Minecraft English Adventure

A playable, original voxel-world English adventure for children ages 5–8. Built with Three.js, TypeScript, and Vite. Designed for iPad Safari in landscape; also supports mouse and keyboard.

## 给家长：怎么玩

点 **Let's explore** 开始。拖动左下角摇杆移动，走到发光资源旁点击 **Collect**，或直接点世界里的发光物品。

1. 找到木头，听 **wood** 的英语发音。
2. 点字母 **W → O → O → D**，再点 **Check my word**。
3. 获得 1 个 wood 和 1 颗星；再找到木头或在 **Word book** 中复习，收集第二个 wood。
4. 点 **Let's build → Build this part!**，用 2 个 wood 铺好第一块木地板。
5. 再用 3 个 wood 搭墙、2 个 stone 盖屋顶，完成小屋，打开 **Sunshine Meadow**。

资源约 8 秒后再次出现。答错不扣分、不损失资源，桃色字母提示需要重试的位置。点击新字母会清空错字并保留正确字母；也可以点字母格修改。**A little hint** 会显示单词并补上一个字母。

右上角齿轮打开中文家长说明，选择：

- **Level 1 · Look & match**：看完整单词，依次点选字母。
- **Level 2 · Fill the gaps**：补齐缺少的字母。
- **Level 3 · Listen & spell**：看 3D 物品、听发音，独立拼字。

背包里有 wood、stone、dirt、sand、grass、iron、gold、diamond、apple、sword 十种资源。**Word book** 显示学习进度、徽章和复习入口。完成小屋后还可用资源建石墙、种胡萝卜花园。

## 在 iPad 上打开

部署后，用 iPad 的 **Safari** 打开游戏的 HTTPS 网址，横过来，点 **Let's explore**。打开游戏的扬声器按钮，并确认 iPad 音量足够。也可以通过 Safari 的“分享 → 添加到主屏幕”创建入口。

本仓库已包含完整游戏和静态构建。请以 GitHub Actions 的成功部署结果提供的 HTTPS 网址为准；当前云机器的 localhost 地址不能从 iPad 访问。公开发布已获项目所有者授权。

优先使用 Safari 的英语语音；十个单词都有随游戏提供的 WAV 备援发音。没有账号、广告或内购。学习数据保存在本设备、同一 Safari 网站的 localStorage 中；私密浏览、清理网站数据或改变网站域名可能清除进度。此原型需要首次从网站加载，尚未实现完整离线安装。

## Development

Node.js 24 is used by the prepared cloud environment. No server-side API, credentials, database, or external runtime assets are required.

```sh
cd /workspace/minecraft-english-adventure
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

Use the existing checkout in a cloud task. Do not create a worktree unless explicitly requested. Dependencies and builds can survive an environment snapshot; the running development server must be restarted in each new task.

```sh
npm run build                  # TypeScript check + deployable dist/
npm run preview -- --port 4173 # Serve the production build
npm test                       # Functional browser suite, system Chromium
```

The tests build the production bundle and serve it on port 4173; they use `/usr/bin/chromium` in this environment. For a different installation, set `CHROMIUM_PATH` to its executable. Tests exercise 3D resource picking, incorrect spelling and recovery, all ten words, three difficulty levels, pronunciation fallback, building costs and unlocks, persistence, spaced repetition, movement, focus and tablet layouts. Testing the production server prevents development hot reload from interrupting play.

To include Playwright's WebKit engine:

```sh
PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright-browsers npx playwright install webkit
PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright-browsers TEST_WEBKIT=1 npm test
```

Browser-download domains `cdn.playwright.dev`, `cdn.download.playwright.dev`, and `playwright.download.prss.microsoft.com` must be allowed. Linux may also need WebKit runtime dependencies. Browser-engine tests supplement a real-iPad acceptance check; they do not measure device performance or guarantee audible system speech on that device.

For a real iPad acceptance check: collect wood, hear its pronunciation, make and recover from a spelling mistake, earn two wood, build the floor, try Level 2 and 3, complete the house, walk into the new meadow, and reopen Safari to confirm the save.

## Publishing with GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds and publishes the `dist/` directory to GitHub Pages whenever code is pushed to `main`. It can also be triggered manually.

With the owner's publication authorization:

1. Push the project to its GitHub repository.
2. Set **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main` to start deployment, or use **Actions → Publish playable game to GitHub Pages → Run workflow**.
4. Open the successful deployment's actual URL in iPad Safari.

Alternatively, `dist/` can be hosted by any HTTPS static host. Relative asset URLs support both the site root and repository subpaths. Never open `index.html` directly as a local file; ES modules and vocabulary fetching require an HTTP(S) server.

## Vocabulary and future cards

Vocabulary is data, separate from game logic: [`public/vocabulary.json`](public/vocabulary.json). Add an item without rewriting the spelling engine:

```json
{
  "id": "brick",
  "word": "BRICK",
  "translation": "砖块",
  "color": "#bd7657",
  "model": "brick",
  "position": [2, -5],
  "audio": "audio/brick.wav"
}
```

- Unique lowercase `id`; an English word of 2–12 letters.
- `translation` is optional assistance in the game but required in the data schema; use an empty string when unavailable.
- `position` is `[x,z]` with coordinates from −8 to 8 in the starter forest.
- Known models: `wood`, `stone`, `dirt`, `sand`, `grass`, `iron`, `gold`, `diamond`, `apple`, `sword`. Other names render as an original colored cube.
- Optional local `audio` path supports WAV, MP3 or M4A; the browser's English voice remains available without an audio file.
- Keep the existing `wood`, `stone`, `grass` and `dirt` entries because recipes use those resource IDs.

Future vocabulary-card uploads can convert card text, Chinese meanings and licensed pronunciation files into this schema. An upload interface and arbitrary image-card renderer are not included in this first prototype.

## Learning model

`src/learning.ts` tracks encounters, successful spellings, incorrect attempts, confident streaks, independent Level 3 answers, next review time and mastery. Incorrect answers become due after about one minute. Successful independent or unassisted answers extend review intervals to 2, 10, 60 and 240 minutes; hinted or corrected attempts return after one minute. Due words appear in an optional, gentle revisit prompt, ordered by mistakes then due time.

Mastery is an earned milestone: three unassisted, first-try spellings in a row, including at least one independent Level 3 success. Hinted successes earn resources and stars but do not count toward confident streaks. These metrics guide practice; they are not a formal literacy assessment.

## Rendering and files

- `src/world.ts`: original procedural 3D assets, instanced static scenery, camera, movement, collision, resources and construction.
- `src/main.ts`: touch interface, spelling challenges, inventory, building and parent settings.
- `src/audio.ts`: browser speech, local pronunciation fallback and positive Web Audio sounds.
- `src/learning.ts`: vocabulary validation, progression, recipes and local persistence.
- `src/style.css`: responsive landscape-first interface.

The world uses one WebGL renderer, instanced static blocks, a capped device-pixel ratio of 1.5 and no real-time shadows. Object previews share the renderer. All art is original procedural geometry; no Minecraft textures, models or sounds are used.
