#!/usr/bin/env node
/**
 * CodiumLite — 跨平台补丁脚本（Node.js）
 * 对克隆好的 microsoft/vscode 应用所有自定义修改：
 *   1. product.json 改名 + 移除 AI 配置 + Open VSX
 *   2. 删除 Copilot 扩展
 *   3. 遥测默认值 OFF
 *   4. 内置扩展下载走 GitHub（checksum 匹配）
 *   5. Copilot shim 条件跳过
 *   6. 遥测 URL 替换为 0.0.0.0
 *
 * 用法: node apply-patches.mjs <vscode-repo-dir>
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoDir = process.argv[2] || join(__dirname, 'vscode');
if (!existsSync(join(repoDir, 'product.json'))) {
  console.error(`ERROR: ${repoDir} 不是 vscode 仓库目录`);
  process.exit(1);
}

// ================================================================
// 工具函数
// ================================================================
function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function writeJson(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, '\t') + '\n', 'utf8');
}
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === '.git' || entry === 'node_modules') continue;
    try {
      if (statSync(full).isDirectory()) walk(full, out);
      else out.push(full);
    } catch { /* ignore */ }
  }
  return out;
}
function removePaths(paths) {
  for (const p of paths) {
    const full = join(repoDir, p);
    if (existsSync(full)) {
      rmSync(full, { recursive: true, force: true });
      console.log(`  [删除] ${p}`);
    }
  }
}

// ================================================================
// 1. product.json
// ================================================================
console.log('\n>>> [1/6] product.json (改名 + 移除 AI + Open VSX)');
{
  const p = readJson(join(repoDir, 'product.json'));

  // 改名（避开 VS Code 商标）
  p['nameShort'] = 'CodiumLite';
  p['nameLong'] = 'CodiumLite';
  p['applicationName'] = 'codium-lite';
  p['dataFolderName'] = '.codium-lite';
  p['sharedDataFolderName'] = '.codium-lite-shared';
  p['win32MutexName'] = 'codiumlite';
  p['win32DirName'] = 'CodiumLite';
  p['win32NameVersion'] = 'CodiumLite';
  p['win32RegValueName'] = 'CodiumLite';
  p['win32AppUserModelId'] = 'CodiumLite.CodiumLite';
  p['win32ShellNameShort'] = 'CodiumLite';
  p['linuxIconName'] = 'codium-lite';
  p['urlProtocol'] = 'codium-lite';
  p['serverApplicationName'] = 'codium-lite-server';
  p['serverDataFolderName'] = '.codium-lite-server';
  p['tunnelApplicationName'] = 'codium-lite-tunnel';
  p['darwinBundleIdentifier'] = 'io.codiumlite.app';
  p['quality'] = 'stable';
  p['updateUrl'] = 'https://github.com/1dwz/codium-lite/releases';
  p['downloadUrl'] = 'https://github.com/1dwz/codium-lite/releases';

  // win32 打包必需字段（上游微软版 product.json 才有，OSS 版缺失会导致打包崩溃）
  p['win32AppId'] = '{{2E1F05D1-C245-4562-81EE-28188DB6FD17}';
  p['win32x64AppId'] = '{{88DA3577-054F-4CA1-8122-7D820494CFFB}';
  p['win32arm64AppId'] = '{{67DEE444-3D04-4258-B92A-BC1F0FF2CAE4}';
  p['win32UserAppId'] = '{{0FD05EB4-651E-4E78-A062-515204B47A3A}';
  p['win32x64UserAppId'] = '{{B2E0DDB2-120E-4D34-9F7E-8C688FF839A2}';
  p['win32arm64UserAppId'] = '{{44721278-64C6-4513-BC45-D48E07830599}';
  p['win32ContextMenu'] = {
    x64: { clsid: 'D910D5E6-B277-4F4A-BDC5-759A34EEE25D' },
    arm64: { clsid: '4852FC55-4A84-4EA1-9C86-D53BE3DF83C0' }
  };
  p['win32ShellNameShort'] = 'CodiumLite';
  p['win32TunnelServiceMutex'] = 'codiumlite-tunnelservice';
  p['win32TunnelMutex'] = 'codiumlite-tunnel';

  // 移除 AI / Copilot 配置
  for (const key of ['defaultChatAgent', 'trustedExtensionAuthAccess',
    'builtInExtensionsEnabledWithAutoUpdates', 'voiceWsUrl',
    'agentsTelemetryAppName', 'sessionsWindowAllowedExtensions']) {
    delete p[key];
  }

  // 扩展市场 → Open VSX
  p['extensionsGallery'] = {
    serviceUrl: 'https://open-vsx.org/vscode/gallery',
    itemUrl: 'https://open-vsx.org/vscode/item',
    latestUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest',
    controlUrl: 'https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json'
  };

  p['reportIssueUrl'] = 'https://github.com/1dwz/codium-lite/issues/new';

  writeJson(join(repoDir, 'product.json'), p);
  console.log('  product.json 已修改');
}

// ================================================================
// 2. 删除 Copilot 扩展
// ================================================================
console.log('\n>>> [2/6] 删除 Copilot 扩展');
removePaths([
  'extensions/copilot',
]);

// ================================================================
// 3. 遥测默认值 OFF
// ================================================================
console.log('\n>>> [3/6] 遥测默认值 OFF');
{
  function setDefaultAfter(path, anchor, newDefault) {
    const full = join(repoDir, path);
    if (!existsSync(full)) { console.log(`  SKIP (不存在): ${path}`); return; }
    let lines = readFileSync(full, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(anchor)) {
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const m = lines[j].match(/(\s*)(?:'default'|default)\s*:\s*(true|false|TelemetryConfiguration\.\w+)(,?)/);
          if (m) {
            lines[j] = `${m[1]}'default': ${newDefault}${m[3]}`;
            break;
          }
        }
        break;
      }
    }
    writeFileSync(full, lines.join('\n'), 'utf8');
    console.log(`  [修改] ${path}`);
  }

  setDefaultAfter('src/vs/platform/telemetry/common/telemetryService.ts', 'getTelemetryLevelSettingDescription()', 'TelemetryConfiguration.OFF');
  setDefaultAfter('src/vs/workbench/electron-browser/desktop.contribution.ts', 'telemetry.enableCrashReporter', 'false');
  setDefaultAfter('src/vs/workbench/services/assignment/common/assignmentService.ts', 'workbench.enableExperiments', 'false');
  setDefaultAfter('src/vs/workbench/contrib/editTelemetry/browser/editTelemetry.contribution.ts', 'editTelemetry', 'false');
  setDefaultAfter('src/vs/workbench/contrib/preferences/common/preferencesContribution.ts', 'enableNaturalLanguageSettingsSearch', 'false');
  setDefaultAfter('src/vs/workbench/browser/workbench.contribution.ts', 'enableNaturalLanguageSearch', 'false');
}

// ================================================================
// 4. 内置扩展下载走 GitHub
// ================================================================
console.log('\n>>> [4/6] 内置扩展下载走 GitHub（checksum 匹配）');
{
  const full = join(repoDir, 'build/lib/builtInExtensions.ts');
  let content = readFileSync(full, 'utf8');
  if (content.includes('CodiumLite patch: built-in extensions')) {
    console.log('  已打过补丁，跳过');
  } else {
    const needle = "input = ext.fromMarketplace(productjson.extensionsGallery.serviceUrl, extension);";
    const idx = content.indexOf(needle);
    if (idx >= 0) {
      // 找到该行开头，替换为 fromGithub
      const lineStart = content.lastIndexOf('\n', idx) + 1;
      const lineEnd = content.indexOf('\n', idx);
      const line = content.slice(lineStart, lineEnd);
      const indent = line.match(/^(\s*)/)[1];
      const replacement = line.replace(needle, '// CodiumLite patch: built-in extensions always from GitHub (sha256 match)')
        + '\n' + indent + 'input = ext.fromGithub(extension, { latest: isInsiders() });';
      content = content.slice(0, lineStart) + replacement + content.slice(lineEnd);
      writeFileSync(full, content, 'utf8');
      console.log('  builtInExtensions.ts 已修改');
    } else {
      console.log('  WARN: builtInExtensions.ts 未找到 fromMarketplace 行，跳过');
    }
  }
}

// ================================================================
// 5. Copilot shim 条件跳过
// ================================================================
console.log('\n>>> [5/6] Copilot shim 条件跳过');
{
  const full = join(repoDir, 'build/gulpfile.vscode.ts');
  let content = readFileSync(full, 'utf8');
  if (content.includes('CodiumLite patch: skip Copilot shim')) {
    console.log('  已打过补丁，跳过');
  } else {
    const re = /(\t\tconst builtInCopilotExtensionDir = path\.join\(appBase, 'extensions', 'copilot'\);\n)(\t\tprepareBuiltInCopilotRipgrepShim\(platform, arch, builtInCopilotExtensionDir, appNodeModulesDir\);)/;
    if (re.test(content)) {
      content = content.replace(re, `$1\t\t// CodiumLite patch: skip Copilot shim when extension not bundled\n\t\tif (fs.existsSync(builtInCopilotExtensionDir)) {\n$2\t\t} else {\n\t\t\tconsole.log('[CodiumLite] Skipping Copilot ripgrep shim (no copilot extension)');\n\t\t}`);
      writeFileSync(full, content, 'utf8');
      console.log('  gulpfile.vscode.ts 已修改');
    } else {
      console.log('  WARN: gulpfile.vscode.ts 模式未匹配，跳过');
    }
  }
}

// ================================================================
// 6. 遥测 URL 替换
// ================================================================
console.log('\n>>> [6/6] 遥测 URL 替换 → 0.0.0.0');
{
  const patterns = [
    /\/\/[^"'\s]*\.data\.microsoft\.com/g,
    /\/\/[^"'\s]*\.msedge\.net/g,
  ];
  let replaced = 0;
  const files = walk(repoDir).filter(f =>
    /\.(ts|js|html|json)$/.test(f) && !f.includes('node_modules'));
  for (const f of files) {
    try {
      let content = readFileSync(f, 'utf8');
      let orig = content;
      for (const re of patterns) {
        content = content.replace(re, '//0.0.0.0');
      }
      if (content !== orig) {
        writeFileSync(f, content, 'utf8');
        replaced++;
      }
    } catch { /* binary */ }
  }
  console.log(`  已替换 ${replaced} 个文件中的遥测端点`);
}

console.log('\n=============================================');
console.log('  ✅ CodiumLite 补丁应用完成！');
console.log('=============================================');
