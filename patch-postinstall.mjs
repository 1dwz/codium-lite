#!/usr/bin/env node
/**
 * CodiumLite — postinstall.ts 容错补丁
 * 在 Windows GitHub Actions 上，Node 24 spawn cmd.exe 有 ENOENT bug，
 * 导致 postinstall 的 git config execSync 和部分 spawnAsync 失败。
 * 此补丁让这些调用在 CI 环境下容错。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const repoDir = process.argv[2];
if (!repoDir || !existsSync(join(repoDir, 'package.json'))) {
  console.error('用法: node patch-postinstall.mjs <vscode-repo-dir>');
  process.exit(1);
}

const path = join(repoDir, 'build', 'npm', 'postinstall.ts');
let content = readFileSync(path, 'utf8');
let changed = 0;

// 1. git config execSync → 在 CI 上跳过（GitHub Actions 不需要设置仓库级 git config）
for (const cmd of [
  "child_process.execSync('git config pull.rebase merges');",
  "child_process.execSync('git config blame.ignoreRevsFile .git-blame-ignore-revs');",
]) {
  if (content.includes(cmd)) {
    const guarded = `// CodiumLite patch: skip in CI (cmd.exe spawn bug)\n\t\tif (!process.env['GITHUB_ACTIONS']) { ${cmd} }`;
    content = content.split(cmd).join(guarded);
    changed++;
  }
}

// 2. spawnAsync 容错 — npmInstallAsync 里的调用
const spawnLine = "const output = await spawnAsync(npm, command.split(' '), finalOpts);";
if (content.includes(spawnLine)) {
  const guarded = `// CodiumLite patch: tolerate spawn failures (cmd.exe ENOENT on new Windows runners)\n\t\tlet output = '';\n\t\ttry { output = await spawnAsync(npm, command.split(' '), finalOpts); } catch (e) { console.log(\`[CodiumLite] npm install in \${dir} failed, continuing: \${e}\`); }`;
  content = content.replace(spawnLine, guarded);
  changed++;
}

if (changed > 0) {
  writeFileSync(path, content, 'utf8');
  console.log(`postinstall.ts 已打补丁（${changed} 处容错）`);
} else {
  console.log('WARN: 未找到需要修改的模式，检查 postinstall.ts 是否已变化');
}
