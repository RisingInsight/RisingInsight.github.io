/**
 * 数据自动更新编排器（本地与 GitHub Actions 通用）。
 * 增量检测：只抓「比本地已有更新」的届次；已发布齐全的旧快照不动。
 *
 * 覆盖：
 *  - CCF 截稿日（fetch:ddl）
 *  - CVF 三会（CVPR/ICCV/WACV）下一届自动探测
 *  - PMLR 四会（ICML/AISTATS/CoRL/COLT）新卷自动探测
 *  - ICLR 下一届自动探测
 *  - ACL Anthology（COLING）下一届自动探测
 *  - 物理 7 刊 Crossref 快照（新年份 + 旧年份被引/摘要刷新）
 *  - S2 批量补全（摘要/arXiv/PDF）+ 代码链接提取
 *  - CCF 目录扩展（expand:ccf 断点续跑）+ 快照自动接线
 *
 * 用法：node scripts/auto-update.mjs [--dry-run] [--no-enrich]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const NO_ENRICH = process.argv.includes('--no-enrich');
const DATA = path.resolve('public/data');
const YEAR = new Date().getFullYear();
const touched = [];

const log = (...a) => console.log(...a);
const run = (cmd, optional = false) => {
  if (DRY) {
    log('  [dry-run]', cmd);
    return true;
  }
  try {
    execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 90 * 60 * 1000 });
    return true;
  } catch (error) {
    log(`  ⚠ 命令失败: ${cmd.slice(0, 60)} — ${String(error.message).split('\n')[0].slice(0, 80)}`);
    if (optional) { log('  ⚠ 可选步骤失败（继续）: ' + cmd.slice(0, 60)); return false; }
    throw new Error('必需步骤失败: ' + cmd.slice(0, 60)); // 让 CI 变红，绝不静默
  }
};
const exists = (p) => fs.existsSync(p);
const countPapers = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).papers?.length || 0;
  } catch {
    return 0;
  }
};
const venueYears = () => {
  const map = {};
  for (const f of fs.readdirSync(DATA)) {
    const m = f.match(/^([a-z0-9]+)-(\d{4})\.json$/);
    if (!m) continue;
    (map[m[1]] = map[m[1]] || new Set()).add(Number(m[2]));
  }
  return map;
};
const have = venueYears();

// ---- 1. CCF 截稿日 ----
log('== CCF 截稿日');
run('node scripts/fetch-ccfddl.mjs');

// ---- 2. CVF 三会：探测下一届 ----
log('== CVF（CVPR/ICCV/WACV）');
const CVF = [
  { id: 'cvpr', cvf: 'CVPR', odd: false },
  { id: 'iccv', cvf: 'ICCV', odd: true },
  { id: 'wacv', cvf: 'WACV', odd: false },
];
for (const v of CVF) {
  const years = have[v.id] || new Set();
  if (years.has(YEAR)) continue; // 当前年已有
  if (v.odd && YEAR % 2 === 0) continue;
  log(`  探测 ${v.cvf} ${YEAR} …`);
  if (run(`node scripts/fetch-cvf.mjs ${v.id} ${YEAR}`, true)) {
    const file = path.join(DATA, `${v.id}-${YEAR}.json`);
    if (exists(file)) {
      log(`  ✓ ${v.cvf} ${YEAR} 已烤制（${countPapers(file)} 篇）`);
      touched.push(file);
      run(`node scripts/fetch-cvf-abstracts.mjs public/data/${v.id}-${YEAR}.json`);
      touched.push(file); // 摘要补全后再记录
    } else {
      log(`  - ${v.cvf} ${YEAR} 官方页尚未放出，跳过`);
    }
  }
}

// ---- 3. PMLR 四会：解析官方索引找新卷 ----
log('== PMLR（ICML/AISTATS/CoRL/COLT）');
try {
  if (DRY) {
    log('  [dry-run] 解析 proceedings.mlr.press 索引');
  } else {
    const res = await fetch('https://proceedings.mlr.press/', { signal: AbortSignal.timeout(60000) });
    const html = await res.text();
    const re = /href="v(\d+)"><b>Volume \d+<\/b><\/a> (?:Proceedings of )?(ICML|AISTATS|CoRL|COLT) (20\d\d)/g;
    const found = [];
    let m;
    while ((m = re.exec(html))) found.push({ venueId: m[2].toLowerCase(), year: Number(m[3]), volume: Number(m[1]) });
    for (const f of found) {
      const years = have[f.venueId] || new Set();
      if (years.has(f.year)) continue;
      log(`  发现 PMLR v${f.volume} = ${f.venueId} ${f.year}，烤制 …`);
      if (run(`node scripts/fetch-pmlr.mjs ${f.venueId} --year ${f.year} --volume ${f.volume}`, true)) {
        const file = path.join(DATA, `${f.venueId}-${f.year}.json`);
        if (exists(file)) touched.push(file);
      }
    }
    if (found.length === 0) log('  - 索引中未发现目标会议新卷');
  }
} catch (error) {
  log(`  ⚠ PMLR 探测失败：${error.message.slice(0, 60)}`);
}

// ---- 4. ICLR 下一届 ----
log('== ICLR');
{
  const years = have.iclr || new Set();
  if (!years.has(YEAR)) {
    log(`  探测 ICLR ${YEAR} …`);
    const file = path.join(DATA, `iclr-${YEAR}.json`);
    const existed = exists(file);
    if (run(`node scripts/fetch-iclr.mjs ${YEAR}`, true) && exists(file)) {
      if (countPapers(file) === 0) {
        if (!existed) fs.rmSync(file);
        log(`  - ICLR ${YEAR} 尚未放出，跳过`);
      } else {
        log(`  ✓ ICLR ${YEAR} 已烤制（${countPapers(file)} 篇）`);
        touched.push(file);
      }
    }
  } else log('  - ICLR 当前年已有快照');
}

// ---- 5. ACL Anthology（COLING）下一届 ----
log('== COLING（ACL Anthology）');
{
  const years = have.coling || new Set();
  if (!years.has(YEAR)) {
    log(`  探测 COLING ${YEAR} …`);
    const file = path.join(DATA, `coling-${YEAR}.json`);
    if (run(`node scripts/fetch-acl.mjs coling coling-${YEAR} ${YEAR}`, true) && exists(file) && countPapers(file) > 0) {
      log(`  ✓ COLING ${YEAR} 已烤制`);
      touched.push(file);
    } else {
      if (exists(file) && countPapers(file) === 0) fs.rmSync(file);
      log(`  - COLING ${YEAR} 尚未放出，跳过`);
    }
  } else log('  - COLING 当前年已有快照');
}

// ---- 6. 物理 7 刊 Crossref：新年份 + 旧年份被引刷新 ----
log('== 物理期刊（Crossref）');
const JOURNALS = ['jcp', 'cpc', 'pof', 'sisc', 'cmame', 'jsc', 'cicp'];
for (const v of JOURNALS) {
  const years = have[v] || new Set();
  const targets = new Set([YEAR, ...[...years].filter((y) => y >= YEAR - 2)]);
  for (const y of targets) {
    if (years.has(y) && y !== YEAR && DRY) continue;
    const before = exists(path.join(DATA, `${v}-${y}.json`)) ? countPapers(path.join(DATA, `${v}-${y}.json`)) : -1;
    if (run(`node scripts/fetch-journal.mjs ${v} ${y}`, true)) {
      const file = path.join(DATA, `${v}-${y}.json`);
      if (exists(file) && countPapers(file) > 0) {
        if (before !== countPapers(file)) touched.push(file);
      } else if (exists(file) && countPapers(file) === 0) {
        fs.rmSync(file); // Crossref 尚未收录该年
      }
    }
  }
}

// ---- 7. S2 批量补全（摘要/arXiv/PDF）----
if (!NO_ENRICH && !DRY) {
  log('== S2 批量补全');
  const uniq = [...new Set(touched.map((f) => path.basename(f)))];
  for (const f of uniq) {
    log(`  enrich ${f}`);
    run(`node scripts/enrich-s2.mjs public/data/${f}`, true);
  }
}

// ---- 8. 代码链接提取 + CCF 目录扩展 + 快照接线 ----
log('== 代码链接提取');
run('node scripts/augment-snapshots.mjs', true);
log('== CCF 目录扩展（断点续跑）');
run('node scripts/expand-ccf.mjs --max 120');
log('== 生成接线文件');
run('node scripts/generate-ccf-venues.mjs');
run('node scripts/generate-snapshots.mjs');

log(`\n✓ 自动更新${DRY ? '（dry-run）' : ''}完成；本轮触及快照 ${new Set(touched.map((f) => path.basename(f))).size} 份`);
if (!DRY) {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  log(status ? `git 变更：\n${status.split('\n').slice(0, 20).join('\n')}` : '无数据变更');
}
