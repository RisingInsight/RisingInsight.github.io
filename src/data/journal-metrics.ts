// 期刊指标速查表：影响因子（JCR）、中科院分区（升级版）、JCR 分区、EI 检索。
// 手工维护的静态数据：IF 以 2024 JCR 为主（部分为 2023 JCR），分区为中科院升级版，
// 仅供参考，以期刊官方与最新分区表为准。字段缺失时页面自动隐藏对应徽章。

export interface JournalMetrics {
  /** 影响因子 */
  if?: number;
  /** 中科院分区，如 '1区Top' / '2区' */
  cas?: string;
  /** JCR 分区，如 'Q1' */
  jcr?: string;
  /** EI 检索 */
  ei?: boolean;
}

export const JOURNAL_METRICS: Record<string, JournalMetrics> = {
  // 期刊：视觉
  tpami: { if: 17.6, cas: '1区Top', jcr: 'Q1', ei: true },
  ijcv: { if: 11.4, cas: '1区Top', jcr: 'Q1', ei: true },
  tip: { if: 10.6, cas: '1区Top', jcr: 'Q1', ei: true },
  // 期刊：多媒体与图形
  tmm: { if: 9.9, cas: '1区Top', jcr: 'Q1', ei: true },
  tcsvt: { if: 10.8, cas: '1区Top', jcr: 'Q1', ei: true },
  tvcg: { if: 5.2, cas: '2区', jcr: 'Q1', ei: true },
  // 期刊：机器学习
  tnnls: { if: 10.2, cas: '1区Top', jcr: 'Q1', ei: true },
  jmlr: { if: 4.9, cas: '2区', jcr: 'Q1' },
  // 期刊：人工智能
  tcyb: { if: 9.4, cas: '1区Top', jcr: 'Q1', ei: true },
  tec: { if: 7.7, cas: '1区Top', jcr: 'Q1', ei: true },
  // 期刊：医学影像
  tmi: { if: 8.9, cas: '1区Top', jcr: 'Q1', ei: true },
  media: { if: 10.9, cas: '1区Top', jcr: 'Q1', ei: true },
  // 期刊：数据与安全
  tkde: { if: 6.5, cas: '2区Top', jcr: 'Q1', ei: true },
  tifs: { if: 8.2, cas: '1区Top', jcr: 'Q1', ei: true },
  // 期刊：机器人
  tro: { if: 7.8, cas: '1区Top', jcr: 'Q1', ei: true },
  // 期刊：物理与科学计算
  jcp: { if: 4.1, cas: '2区', jcr: 'Q1', ei: true },
  cpc: { if: 3.5, cas: '3区', jcr: 'Q1', ei: true },
  pof: { if: 4.6, cas: '2区', jcr: 'Q1', ei: true },
  sisc: { if: 2.8, cas: '3区', jcr: 'Q1', ei: true },
  cmame: { if: 6.9, cas: '1区Top', jcr: 'Q1', ei: true },
  jsc: { if: 2.5, cas: '3区', jcr: 'Q1', ei: true },
  cicp: { if: 3.2, cas: '3区' },
};
