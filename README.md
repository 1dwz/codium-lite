# CodiumLite

纯净版 VS Code — 无 AI 功能、无遥测。基于 [microsoft/vscode](https://github.com/microsoft/vscode)（MIT License）构建。

> ⚠️ **非官方构建**。与微软公司无任何关联，不使用 "Visual Studio Code" / "VS Code" 商标。
> 扩展市场使用 [Open VSX](https://open-vsx.org)（官方 VS Code Marketplace 条款禁止非微软构建使用）。

## ✨ 特性

- 🚫 **无 AI 功能** — 移除 Copilot 扩展、AI Chat、agent 代码、语音 AI
- 🚫 **无遥测** — 所有微软遥测端点替换为 `0.0.0.0`，遥测默认关闭
- 🏷️ **改名 CodiumLite** — 避免商标冲突
- 🛒 **Open VSX 市场** — 可安装开源扩展
- 🔄 **跟随上游** — 构建脚本从最新 microsoft/vscode 源码构建

## 📦 下载

Windows 构建产物通过 [GitHub Actions](https://github.com/1dwz/codium-lite/actions/workflows/build-windows.yml) 自动生成，
可在 Actions 运行记录中下载（zip 免安装版，解压后运行 `Code.exe`）。

## 🏗️ 本地构建

```bash
# 1. 克隆本仓库
git clone https://github.com/1dwz/codium-lite.git
cd codium-lite

# 2. 克隆上游 + 打补丁
git clone --depth 1 https://github.com/microsoft/vscode.git vscode
node apply-patches.mjs vscode

# 3. 构建（需要 Node 24+、Python 3、C++ 工具链）
cd vscode
node build/npm/preinstall.ts
npm ci
npm run gulp compile

# 4. 打包 Windows 版
node --experimental-strip-types ../bundle-desktop.mjs   # 生成 out-vscode-min
npm run gulp "vscode-win32-x64-min-ci"                  # 打包到 ../VSCode-win32-x64
```

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 24.18 |
| Python 3 | ≥ 3.10 |
| C++ 工具链 | VS Build Tools (Windows) / build-essential (Linux) |
| 磁盘 | ≥ 20 GB |
| 内存 | ≥ 12 GB（esbuild 打包需要） |

## 🛠️ 补丁内容

见 [apply-patches.mjs](apply-patches.mjs)：

1. `product.json` — 改名 CodiumLite、移除 AI 配置、Open VSX 市场
2. 删除 `extensions/copilot`
3. 遥测默认值 OFF（telemetryLevel / crashReporter / experiments 等）
4. 内置扩展下载走 GitHub（sha256 匹配）
5. Copilot shim 条件跳过
6. 全局替换 `*.data.microsoft.com` / `*.msedge.net` → `0.0.0.0`

## 📄 许可证

- 本仓库脚本：MIT License
- 构建产物：上游 MIT License + 各内置扩展自身许可证

## 🙏 致谢

- [VSCodium](https://github.com/VSCodium/vscodium) — 同类项目，架构参考
- [microsoft/vscode](https://github.com/microsoft/vscode) — 上游源码
- [Open VSX](https://open-vsx.org) — 开源扩展市场
