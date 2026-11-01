// 快照自动接线表：由 scripts/generate-snapshots.mjs 扫描 public/data 生成，请勿手工编辑。
// venues.ts 会在构建期把它合并进各 venue 的 snapshots 配置。

export const SNAPSHOT_MAP: Record<string, Record<number, string>> = {
  aistats: {
    2025: '/data/aistats-2025.json',
    2026: '/data/aistats-2026.json',
  },
  cicp: {
    2024: '/data/cicp-2024.json',
    2025: '/data/cicp-2025.json',
    2026: '/data/cicp-2026.json',
  },
  cmame: {
    2024: '/data/cmame-2024.json',
    2025: '/data/cmame-2025.json',
    2026: '/data/cmame-2026.json',
  },
  coling: {
    2024: '/data/coling-2024.json',
    2025: '/data/coling-2025.json',
  },
  colt: {
    2025: '/data/colt-2025.json',
    2026: '/data/colt-2026.json',
  },
  corl: {
    2024: '/data/corl-2024.json',
    2025: '/data/corl-2025.json',
  },
  cpc: {
    2024: '/data/cpc-2024.json',
    2025: '/data/cpc-2025.json',
    2026: '/data/cpc-2026.json',
  },
  cvpr: {
    2026: '/data/cvpr-2026.json',
  },
  eccv: {
    2026: '/data/eccv-2026.json',
  },
  iccv: {
    2025: '/data/iccv-2025.json',
  },
  iclr: {
    2024: '/data/iclr-2024.json',
    2025: '/data/iclr-2025.json',
    2026: '/data/iclr-2026.json',
  },
  icml: {
    2024: '/data/icml-2024.json',
    2025: '/data/icml-2025.json',
    2026: '/data/icml-2026.json',
  },
  jcp: {
    2024: '/data/jcp-2024.json',
    2025: '/data/jcp-2025.json',
    2026: '/data/jcp-2026.json',
  },
  jmlr: {
    2024: '/data/jmlr-2024.json',
    2025: '/data/jmlr-2025.json',
    2026: '/data/jmlr-2026.json',
  },
  jsc: {
    2024: '/data/jsc-2024.json',
    2025: '/data/jsc-2025.json',
    2026: '/data/jsc-2026.json',
  },
  pof: {
    2024: '/data/pof-2024.json',
    2025: '/data/pof-2025.json',
    2026: '/data/pof-2026.json',
  },
  sisc: {
    2024: '/data/sisc-2024.json',
    2025: '/data/sisc-2025.json',
    2026: '/data/sisc-2026.json',
  },
  wacv: {
    2026: '/data/wacv-2026.json',
  },
};
