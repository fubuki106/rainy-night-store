# 离线 Mac 版

在装有 Xcode 的 Mac，从仓库根目录运行 `./macOS/build.sh`。程序会将项目所有运行资源嵌入上一级的 `雨夜便利店·末班底片.app`。传入目录参数可更改输出位置。编译目标为 macOS 13 以上，同时包含 Intel 与 Apple 芯片指令，使用本机 ad-hoc 签名。

双击应用后，界面由 AppKit 窗口里的系统 WKWebView 绘制。Three.js、原角色、贴图与剧情文件均从应用包读取，游戏存档归属于固定的本地来源 `rainy-store://game/`。正常游玩中的印相下载会出现系统保存对话框。

## 验收

以下命令在仓库根目录执行。

```sh
runner='../雨夜便利店·末班底片.app/Contents/MacOS/RainyNight'
"$runner" --verify /tmp/rainy-night-smoke
```

验收会等待原角色、NPC、贴图加载，实际模拟移动与挥手，切换后门视角，读取 WebGL 画布，生成两张游戏窗截图和 `report.json`。常规验收使用临时数据区。

可提供 JavaScript 文件驱动扩展章节，脚本内容作为异步函数体。程序会在原主角和两名 NPC 加载后执行，`await delay(ms)` 可等待运行时，返回值将写入报告。以下语句可保存此刻完整游戏窗的画面。

```js
await window.webkit.messageHandlers.rainySnapshot.postMessage("街角");
return { mode: window.__diorama.info().camMode };
```

```sh
"$runner" --probe /tmp/rainy-action.js /tmp/rainy-night-proof
```

要检验退出后重开时的续存，macOS 14 以上可为两次验收指定同一临时档案 `--profile UUID`。先用 `uuidgen` 生成一个独立 UUID，两次命令使用同一个值。玩家日常游戏使用系统默认档案。

完整的电影章节验收从新的数据区开始，程序会实际走到公交亭、拍摄三张不同画面、选片换序、计时曝光、把印相装进候车亭灯箱，保存各步骤实屏。以下命令生成独立报告。

```sh
"$runner" --probe macOS/verify-chapter.js /tmp/rainy-night-film
```

要跨两次完整程序启动复查上卷相纸、灯箱与领取下一卷，可用同一档案串行执行。

```sh
profile=$(uuidgen)
"$runner" --probe macOS/verify-chapter.js /tmp/rainy-night-film --profile "$profile"
"$runner" --probe macOS/verify-reopen.js /tmp/rainy-night-reopen --profile "$profile"
```

要从橱窗一路实走到三花、公园风铃和 07 路站台，运行下面这项验收。它会检查猫回应后留下的印记、两次拨铃造成的水滴、车辆到站与离开特写时的移动控制，并保存六张游戏截图。

```sh
"$runner" --probe macOS/verify-street-life.js /tmp/rainy-night-street
python3 macOS/verify-character-pack.py
```

角色校验会将打包后的 GLB 与原版的 SHA-256 对照，并逐字节核对 21 张贴图。Mac 应用不需要联网下载角色。
