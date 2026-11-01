// 顶会 / 顶刊目录：论文门户的数据源配置。
// provider = openalex（覆盖面完整）或 s2（OpenAlex 缺失的会议走 Semantic Scholar），
// 两者互为备源：主源为空或被限流时自动换另一家（见 lib/papers.ts 的级联）。
// snapshots 指向构建期烤好的官方 proceedings 快照（CVF / PMLR / ICLR / JMLR），
// 对 OpenAlex / S2 尚未收录的新一届会议，快照优先于一切 API。
// 年份只展示已出版范围（<= 当前年与 maxYear），双年会议用 odd / even 过滤。

export type VenueType = 'conference' | 'journal';
export type VenueArea =
  | 'vision'
  | 'multimedia'
  | 'audio'
  | 'learning'
  | 'ai'
  | 'language'
  | 'robotics'
  | 'medical'
  | 'data'
  | 'security'
  | 'network'
  | 'arch'
  | 'se'
  | 'theory'
  | 'hci'
  | 'cross'
  | 'physics';
export type VenueProvider = 'openalex' | 's2';
export type Recurrence = 'annual' | 'odd' | 'even';

/** 期刊 Crossref 快照路径（fetch-journal.mjs 生成；缺文件的年份自动回退 OpenAlex） */
function journalSnapshots(id: string, years: number[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const y of years) map[y] = `/data/${id}-${y}.json`;
  return map;
}

export interface Venue {
  id: string;
  short: string;
  full: string;
  type: VenueType;
  area: VenueArea;
  rank: 'A' | 'B' | 'C' | '—';
  provider: VenueProvider;
  /** OpenAlex source id（带或不带 https://openalex.org/ 前缀均可） */
  oa?: string;
  /** Semantic Scholar bulk search 的 venue 名称 */
  s2?: string;
  recurrence: Recurrence;
  startYear: number;
  dblp: string;
  site?: string;
  /** 数据源尚未收录时使用的离线快照（year → public 路径） */
  snapshots?: Record<number, string>;
  /** 最新已出版年份（用于隐藏尚未召开的届次） */
  maxYear?: number;
}

export const AREA_ORDER: VenueArea[] = [
  'vision',
  'multimedia',
  'audio',
  'learning',
  'ai',
  'language',
  'robotics',
  'medical',
  'data',
  'security',
  'network',
  'arch',
  'se',
  'theory',
  'hci',
  'cross',
  'physics',
];

export const AREA_LABELS: Record<VenueArea, string> = {
  vision: '视觉',
  multimedia: '多媒体与图形',
  audio: '音频与声学',
  learning: '机器学习',
  ai: '人工智能',
  language: '自然语言',
  robotics: '机器人',
  medical: '医学影像',
  data: '数据库与数据挖掘',
  security: '网络与信息安全',
  network: '计算机网络',
  arch: '体系结构与并行计算',
  se: '软件工程与编程语言',
  theory: '计算理论',
  hci: '人机交互与普适计算',
  cross: '交叉与新兴',
  physics: '物理与科学计算',
};

const HAND_VENUES: Venue[] = [
  // ===== 视觉 =====
  {
    id: 'cvpr', short: 'CVPR', full: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition',
    type: 'conference', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S4210176548', recurrence: 'annual', startYear: 2013,
    dblp: 'cvpr', site: 'https://cvpr.thecvf.com/',
    snapshots: { 2026: '/data/cvpr-2026.json' },
  },
  {
    id: 'iccv', short: 'ICCV', full: 'IEEE/CVF International Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S4363607764', recurrence: 'odd', startYear: 2013,
    dblp: 'iccv', site: 'https://iccv.thecvf.com/',
    snapshots: { 2025: '/data/iccv-2025.json' },
  },
  {
    id: 'eccv', short: 'ECCV', full: 'European Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'B', provider: 's2',
    s2: 'ECCV', recurrence: 'even', startYear: 2018,
    dblp: 'eccv', site: 'https://www.ecva.net/',
    snapshots: { 2026: '/data/eccv-2026.json' },
  },
  {
    id: 'wacv', short: 'WACV', full: 'IEEE/CVF Winter Conference on Applications of Computer Vision',
    type: 'conference', area: 'vision', rank: '—', provider: 'openalex',
    oa: 'S4393918690', recurrence: 'annual', startYear: 2018,
    dblp: 'wacv', site: 'https://wacv.thecvf.com/',
    snapshots: { 2026: '/data/wacv-2026.json' },
  },
  {
    id: 'bmvc', short: 'BMVC', full: 'British Machine Vision Conference',
    type: 'conference', area: 'vision', rank: 'C', provider: 's2',
    s2: 'BMVC', recurrence: 'annual', startYear: 2018,
    dblp: 'bmvc', site: 'https://www.bmva.org/',
    maxYear: 2024,
  },
  {
    id: 'accv', short: 'ACCV', full: 'Asian Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'C', provider: 's2',
    s2: 'ACCV', recurrence: 'even', startYear: 2018,
    dblp: 'accv', site: 'https://accv.org/',
    maxYear: 2024,
  },
  {
    id: '3dv', short: '3DV', full: 'International Conference on 3D Vision',
    type: 'conference', area: 'vision', rank: 'C', provider: 'openalex',
    oa: 'S4363608458', recurrence: 'annual', startYear: 2020,
    dblp: '3dim', site: 'https://3dvconf.github.io/',
    s2: '3DV',
  },

  // ===== 多媒体与图形 =====
  {
    id: 'acmmm', short: 'ACM MM', full: 'ACM International Conference on Multimedia',
    type: 'conference', area: 'multimedia', rank: 'A', provider: 'openalex',
    oa: 'S4363608757', recurrence: 'annual', startYear: 2018,
    dblp: 'mm', site: 'https://www.acmmm.org/', maxYear: 2025,
  },
  {
    id: 'siggraph', short: 'SIGGRAPH', full: 'ACM SIGGRAPH',
    type: 'conference', area: 'multimedia', rank: 'A', provider: 's2',
    s2: 'SIGGRAPH', recurrence: 'annual', startYear: 2018,
    dblp: 'siggraph', site: 'https://www.siggraph.org/',
  },
  {
    id: 'icme', short: 'ICME', full: 'IEEE International Conference on Multimedia and Expo',
    type: 'conference', area: 'multimedia', rank: 'B', provider: 'openalex',
    oa: 'S4363607799', recurrence: 'annual', startYear: 2018,
    dblp: 'icme', site: 'https://www.ieee-icme.org/',
    maxYear: 2025,
  },
  {
    id: 'icip', short: 'ICIP', full: 'IEEE International Conference on Image Processing',
    type: 'conference', area: 'multimedia', rank: 'C', provider: 's2',
    s2: 'ICIP', recurrence: 'annual', startYear: 2018,
    dblp: 'icip', site: 'https://2025.ieeeicip.org/',
  },

  // ===== 音频与声学（会议） =====
  {
    id: 'icassp', short: 'ICASSP', full: 'IEEE International Conference on Acoustics, Speech and Signal Processing',
    type: 'conference', area: 'audio', rank: 'B', provider: 'openalex',
    oa: 'S4363607879', recurrence: 'annual', startYear: 2013,
    dblp: 'icassp', site: 'https://www.2026.ieeeicassp.org/',
  },
  {
    id: 'interspeech', short: 'Interspeech', full: 'Annual Conference of the International Speech Communication Association',
    type: 'conference', area: 'audio', rank: 'B', provider: 'openalex',
    oa: 'S4393918409', recurrence: 'annual', startYear: 2018,
    dblp: 'interspeech', site: 'https://www.interspeech.org/',
    maxYear: 2025,
  },
  {
    id: 'eusipco', short: 'EUSIPCO', full: 'European Signal Processing Conference',
    type: 'conference', area: 'audio', rank: '—', provider: 'openalex',
    oa: 'S4363607788', recurrence: 'annual', startYear: 2018,
    dblp: 'eusipco', site: 'https://eusipco2026.org/',
    maxYear: 2025,
  },

  // ===== 机器学习 =====
  {
    id: 'neurips', short: 'NeurIPS', full: 'Conference on Neural Information Processing Systems',
    type: 'conference', area: 'learning', rank: 'A', provider: 'openalex',
    oa: 'S4363606243', recurrence: 'annual', startYear: 2013,
    dblp: 'nips', site: 'https://papers.nips.cc/', maxYear: 2025,
  },
  {
    id: 'icml', short: 'ICML', full: 'International Conference on Machine Learning',
    type: 'conference', area: 'learning', rank: 'A', provider: 's2',
    s2: 'ICML', recurrence: 'annual', startYear: 2013,
    dblp: 'icml', site: 'https://icml.cc/',
    snapshots: {
      2024: '/data/icml-2024.json',
      2025: '/data/icml-2025.json',
      2026: '/data/icml-2026.json',
    },
  },
  {
    id: 'iclr', short: 'ICLR', full: 'International Conference on Learning Representations',
    type: 'conference', area: 'learning', rank: 'A', provider: 's2',
    s2: 'ICLR', recurrence: 'annual', startYear: 2014,
    dblp: 'iclr', site: 'https://iclr.cc/',
    snapshots: {
      2024: '/data/iclr-2024.json',
      2025: '/data/iclr-2025.json',
      2026: '/data/iclr-2026.json',
    },
  },
  {
    id: 'aistats', short: 'AISTATS', full: 'International Conference on Artificial Intelligence and Statistics',
    type: 'conference', area: 'learning', rank: 'C', provider: 's2',
    s2: 'AISTATS', recurrence: 'annual', startYear: 2018,
    dblp: 'aistats', site: 'https://aistats.org/',
    snapshots: {
      2025: '/data/aistats-2025.json',
      2026: '/data/aistats-2026.json',
    },
  },
  {
    id: 'uai', short: 'UAI', full: 'Conference on Uncertainty in Artificial Intelligence',
    type: 'conference', area: 'learning', rank: 'B', provider: 's2',
    s2: 'UAI', recurrence: 'annual', startYear: 2018,
    dblp: 'uai', site: 'https://www.auai.org/',
    maxYear: 2025,
  },
  {
    id: 'colt', short: 'COLT', full: 'Conference on Learning Theory',
    type: 'conference', area: 'learning', rank: 'B', provider: 's2',
    s2: 'COLT', recurrence: 'annual', startYear: 2018,
    dblp: 'colt', site: 'https://www.learningtheory.org/',
    snapshots: {
      2025: '/data/colt-2025.json',
      2026: '/data/colt-2026.json',
    },
  },

  // ===== 人工智能 =====
  {
    id: 'aaai', short: 'AAAI', full: 'AAAI Conference on Artificial Intelligence',
    type: 'conference', area: 'ai', rank: 'A', provider: 'openalex',
    oa: 'S4210191458', recurrence: 'annual', startYear: 2013,
    dblp: 'aaai', site: 'https://aaai.org/conference/aaai/',
  },
  {
    id: 'ijcai', short: 'IJCAI', full: 'International Joint Conference on Artificial Intelligence',
    type: 'conference', area: 'ai', rank: 'B', provider: 'openalex',
    oa: 'S4306419999', recurrence: 'annual', startYear: 2013,
    dblp: 'ijcai', site: 'https://www.ijcai.org/',
  },
  {
    id: 'kr', short: 'KR', full: 'International Conference on Principles of Knowledge Representation and Reasoning',
    type: 'conference', area: 'ai', rank: 'B', provider: 'openalex',
    oa: 'S4306420732', recurrence: 'annual', startYear: 2020,
    dblp: 'kr', site: 'https://kr.org/',
  },

  // ===== 自然语言 =====
  {
    id: 'acl', short: 'ACL', full: 'Annual Meeting of the Association for Computational Linguistics',
    type: 'conference', area: 'language', rank: 'A', provider: 'openalex',
    oa: 'S4393915740', recurrence: 'annual', startYear: 2013,
    dblp: 'acl', site: 'https://aclanthology.org/venues/acl/',
  },
  {
    id: 'emnlp', short: 'EMNLP', full: 'Conference on Empirical Methods in Natural Language Processing',
    type: 'conference', area: 'language', rank: 'B', provider: 'openalex',
    oa: 'S4363608991', recurrence: 'annual', startYear: 2018,
    dblp: 'emnlp', site: 'https://aclanthology.org/venues/emnlp/',
  },
  {
    id: 'naacl', short: 'NAACL', full: 'Conference of the North American Chapter of the Association for Computational Linguistics',
    type: 'conference', area: 'language', rank: 'B', provider: 'openalex',
    oa: 'S4363608774', recurrence: 'annual', startYear: 2018,
    dblp: 'naacl', site: 'https://aclanthology.org/venues/naacl/',
    maxYear: 2025,
  },
  {
    id: 'coling', short: 'COLING', full: 'International Conference on Computational Linguistics',
    type: 'conference', area: 'language', rank: 'B', provider: 's2',
    s2: 'COLING', recurrence: 'annual', startYear: 2018,
    dblp: 'coling', site: 'https://aclanthology.org/venues/coling/',
    maxYear: 2025,
    snapshots: {
      2024: '/data/coling-2024.json',
      2025: '/data/coling-2025.json',
    },
  },

  // ===== 机器人 =====
  {
    id: 'icra', short: 'ICRA', full: 'IEEE International Conference on Robotics and Automation',
    type: 'conference', area: 'robotics', rank: 'B', provider: 'openalex',
    oa: 'S4210217939', recurrence: 'annual', startYear: 2018,
    dblp: 'icra', site: 'https://www.ieee-ras.org/conferences-workshops/fully-sponsored/icra',
  },
  {
    id: 'iros', short: 'IROS', full: 'IEEE/RSJ International Conference on Intelligent Robots and Systems',
    type: 'conference', area: 'robotics', rank: 'C', provider: 'openalex',
    oa: 'S4393918188', recurrence: 'annual', startYear: 2018,
    dblp: 'iros', site: 'https://www.iros.org/',
    maxYear: 2025,
  },
  {
    id: 'corl', short: 'CoRL', full: 'Conference on Robot Learning',
    type: 'conference', area: 'robotics', rank: '—', provider: 's2',
    s2: 'CoRL', recurrence: 'annual', startYear: 2018,
    dblp: 'corl', site: 'https://www.corl.org/',
    snapshots: {
      2024: '/data/corl-2024.json',
      2025: '/data/corl-2025.json',
    },
  },
  {
    id: 'rss', short: 'RSS', full: 'Robotics: Science and Systems',
    type: 'conference', area: 'robotics', rank: '—', provider: 'openalex',
    oa: 'S4306420803', recurrence: 'annual', startYear: 2018,
    dblp: 'rss', site: 'https://www.roboticsproceedings.org/',
  },

  // ===== 医学影像 =====
  {
    id: 'miccai', short: 'MICCAI', full: 'Medical Image Computing and Computer Assisted Intervention',
    type: 'conference', area: 'medical', rank: 'B', provider: 's2',
    s2: 'MICCAI', recurrence: 'annual', startYear: 2018,
    dblp: 'miccai', site: 'https://www.miccai.org/',
    maxYear: 2025,
  },

  // ===== 期刊：医学影像 =====
  {
    id: 'tmi', short: 'TMI', full: 'IEEE Transactions on Medical Imaging',
    type: 'journal', area: 'medical', rank: 'B', provider: 'openalex',
    oa: 'S58069681', recurrence: 'annual', startYear: 2018,
    dblp: 'tmi', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=42',
  },
  {
    id: 'media', short: 'MedIA', full: 'Medical Image Analysis',
    type: 'journal', area: 'medical', rank: 'C', provider: 'openalex',
    oa: 'S116571295', recurrence: 'annual', startYear: 2018,
    dblp: 'media', site: 'https://www.sciencedirect.com/journal/medical-image-analysis',
  },

  // ===== 期刊：视觉 =====
  {
    id: 'tpami', short: 'TPAMI', full: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
    type: 'journal', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S199944782', recurrence: 'annual', startYear: 2018,
    dblp: 'pami', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=34',
  },
  {
    id: 'ijcv', short: 'IJCV', full: 'International Journal of Computer Vision',
    type: 'journal', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S25538012', recurrence: 'annual', startYear: 2018,
    dblp: 'ijcv', site: 'https://link.springer.com/journal/11263',
  },
  {
    id: 'tip', short: 'TIP', full: 'IEEE Transactions on Image Processing',
    type: 'journal', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S4210173141', recurrence: 'annual', startYear: 2018,
    dblp: 'tip', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=83',
  },

  // ===== 期刊：多媒体与图形 =====
  {
    id: 'tmm', short: 'TMM', full: 'IEEE Transactions on Multimedia',
    type: 'journal', area: 'multimedia', rank: 'A', provider: 'openalex',
    oa: 'S137030581', recurrence: 'annual', startYear: 2018,
    dblp: 'tmm', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6046',
  },
  {
    id: 'tcsvt', short: 'TCSVT', full: 'IEEE Transactions on Circuits and Systems for Video Technology',
    type: 'journal', area: 'multimedia', rank: 'B', provider: 'openalex',
    oa: 'S115173108', recurrence: 'annual', startYear: 2018,
    dblp: 'tcsvt', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=76',
  },
  {
    id: 'tvcg', short: 'TVCG', full: 'IEEE Transactions on Visualization and Computer Graphics',
    type: 'journal', area: 'multimedia', rank: 'A', provider: 'openalex',
    oa: 'S84775595', recurrence: 'annual', startYear: 2018,
    dblp: 'tvcg', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=2945',
  },

  // ===== 期刊：音频与声学 =====
  {
    id: 'taslp', short: 'TASLP', full: 'IEEE/ACM Transactions on Audio, Speech, and Language Processing',
    type: 'journal', area: 'audio', rank: 'B', provider: 'openalex',
    oa: 'S4210169297', recurrence: 'annual', startYear: 2018,
    dblp: 'taslp', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6570655',
    s2: 'IEEE/ACM Transactions on Audio, Speech, and Language Processing',
  },
  {
    id: 'jasa', short: 'JASA', full: 'The Journal of the Acoustical Society of America',
    type: 'journal', area: 'audio', rank: '—', provider: 'openalex',
    oa: 'S11296630', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://pubs.aip.org/asa/jasa',
  },
  {
    id: 'applacoust', short: 'Applied Acoustics', full: 'Applied Acoustics',
    type: 'journal', area: 'audio', rank: '—', provider: 'openalex',
    oa: 'S971171794', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://www.sciencedirect.com/journal/applied-acoustics',
  },

  // ===== 期刊：机器学习 =====
  {
    id: 'tnnls', short: 'TNNLS', full: 'IEEE Transactions on Neural Networks and Learning Systems',
    type: 'journal', area: 'learning', rank: 'B', provider: 'openalex',
    oa: 'S4210175523', recurrence: 'annual', startYear: 2018,
    dblp: 'tnnls', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=5962385',
  },
  {
    id: 'jmlr', short: 'JMLR', full: 'Journal of Machine Learning Research',
    type: 'journal', area: 'learning', rank: 'A', provider: 'openalex',
    oa: 'S118988714', recurrence: 'annual', startYear: 2018,
    dblp: 'jmlr', site: 'https://www.jmlr.org/',
    snapshots: {
      2024: '/data/jmlr-2024.json',
      2025: '/data/jmlr-2025.json',
      2026: '/data/jmlr-2026.json',
    },
  },

  // ===== 期刊：人工智能 =====
  {
    id: 'tcyb', short: 'TCYB', full: 'IEEE Transactions on Cybernetics',
    type: 'journal', area: 'ai', rank: 'B', provider: 'openalex',
    oa: 'S4210191041', recurrence: 'annual', startYear: 2018,
    dblp: 'tcyb', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6221036',
  },
  {
    id: 'tec', short: 'TEC', full: 'IEEE Transactions on Evolutionary Computation',
    type: 'journal', area: 'ai', rank: 'B', provider: 'openalex',
    oa: 'S93787993', recurrence: 'annual', startYear: 2018,
    dblp: 'tec', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=4235',
  },
  {
    id: 'tai', short: 'TAI', full: 'IEEE Transactions on Artificial Intelligence',
    type: 'journal', area: 'ai', rank: '—', provider: 'openalex',
    oa: 'S4210169448', recurrence: 'annual', startYear: 2020,
    dblp: 'tai', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=9078688',
  },

  // ===== 数据与安全（会议） =====
  {
    id: 'kdd', short: 'KDD', full: 'ACM SIGKDD Conference on Knowledge Discovery and Data Mining',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4363608767', recurrence: 'annual', startYear: 2018,
    dblp: 'kdd', site: 'https://kdd.org/',
  },
  {
    id: 'sigmod', short: 'SIGMOD', full: 'ACM SIGMOD International Conference on Management of Data',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4393915683', recurrence: 'annual', startYear: 2018,
    dblp: 'sigmod', site: 'https://sigmod.org/',
  },
  {
    id: 'vldb', short: 'VLDB', full: 'International Conference on Very Large Data Bases (PVLDB)',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4210226185', recurrence: 'annual', startYear: 2018,
    dblp: 'vldb', site: 'https://vldb.org/',
  },
  {
    id: 'icde', short: 'ICDE', full: 'IEEE International Conference on Data Engineering',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4210210321', recurrence: 'annual', startYear: 2018,
    dblp: 'icde', site: 'https://ieee-icde.org/',
  },
  {
    id: 'www', short: 'WWW', full: 'The Web Conference (International World Wide Web Conference)',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S7407088480', recurrence: 'annual', startYear: 2018,
    dblp: 'www', site: 'https://www2026.org/',
  },
  {
    id: 'sigir', short: 'SIGIR', full: 'International ACM SIGIR Conference on Research and Development in Information Retrieval',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4363608773', recurrence: 'annual', startYear: 2018,
    dblp: 'sigir', site: 'https://sigir.org/',
  },
  {
    id: 'cikm', short: 'CIKM', full: 'ACM International Conference on Information and Knowledge Management',
    type: 'conference', area: 'data', rank: 'B', provider: 'openalex',
    oa: 'S4393918199', recurrence: 'annual', startYear: 2018,
    dblp: 'cikm', site: 'https://cikm2026.org/',
  },
  {
    id: 'wsdm', short: 'WSDM', full: 'ACM International Conference on Web Search and Data Mining',
    type: 'conference', area: 'data', rank: 'B', provider: 'openalex',
    oa: 'S4363608885', recurrence: 'annual', startYear: 2018,
    dblp: 'wsdm', site: 'https://www.wsdm-conference.org/',
  },
  {
    id: 'ccs', short: 'CCS', full: 'ACM SIGSAC Conference on Computer and Communications Security',
    type: 'conference', area: 'security', rank: 'A', provider: 'openalex',
    oa: 'S4393917527', recurrence: 'annual', startYear: 2018,
    dblp: 'ccs', site: 'https://www.sigsac.org/ccs/',
  },
  {
    id: 'sp', short: 'S&P', full: 'IEEE Symposium on Security and Privacy',
    type: 'conference', area: 'security', rank: 'A', provider: 'openalex',
    oa: 'S4210233669', recurrence: 'annual', startYear: 2018,
    dblp: 'sp', site: 'https://sp2026.ieee-security.org/',
  },
  {
    id: 'ndss', short: 'NDSS', full: 'Network and Distributed System Security Symposium',
    type: 'conference', area: 'security', rank: 'B', provider: 'openalex',
    oa: 'S4306420590', recurrence: 'annual', startYear: 2018,
    dblp: 'ndss', site: 'https://www.ndss-symposium.org/',
  },
  {
    id: 'mobicom', short: 'MobiCom', full: 'ACM International Conference on Mobile Computing and Networking',
    type: 'conference', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S4363608994', recurrence: 'annual', startYear: 2018,
    dblp: 'mobicom', site: 'https://sigmobile.org/mobicom/',
  },

  // ===== 期刊：数据与安全 =====
  {
    id: 'tkde', short: 'TKDE', full: 'IEEE Transactions on Knowledge and Data Engineering',
    type: 'journal', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S30698027', recurrence: 'annual', startYear: 2018,
    dblp: 'tkde', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=69',
  },
  {
    id: 'tifs', short: 'TIFS', full: 'IEEE Transactions on Information Forensics and Security',
    type: 'journal', area: 'security', rank: 'A', provider: 'openalex',
    oa: 'S61310614', recurrence: 'annual', startYear: 2018,
    dblp: 'tifs', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=10206',
  },

  // ===== 期刊：机器人 =====
  {
    id: 'tro', short: 'TRO', full: 'IEEE Transactions on Robotics',
    type: 'journal', area: 'robotics', rank: 'B', provider: 'openalex',
    oa: 'S144620930', recurrence: 'annual', startYear: 2018,
    dblp: 'tro', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=8860',
  },

  // ===== 物理与科学计算（会议） =====
  {
    id: 'sc', short: 'SC', full: 'International Conference for High Performance Computing, Networking, Storage and Analysis',
    type: 'conference', area: 'arch', rank: 'A', provider: 'openalex',
    oa: 'S4363608557', recurrence: 'annual', startYear: 2018,
    dblp: 'sc', site: 'https://supercomputing.org/',
    maxYear: 2025,
  },
  {
    id: 'ipdps', short: 'IPDPS', full: 'IEEE International Parallel and Distributed Processing Symposium',
    type: 'conference', area: 'arch', rank: 'B', provider: 'openalex',
    oa: 'S4393918253', recurrence: 'annual', startYear: 2018,
    dblp: 'ipdps', site: 'https://www.ipdps.org/',
  },

  // ===== 期刊：物理与科学计算 =====
  {
    id: 'jcp', short: 'JCP', full: 'Journal of Computational Physics',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S148709879', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://www.sciencedirect.com/journal/journal-of-computational-physics',
    snapshots: journalSnapshots('jcp', [2024, 2025, 2026]),
  },
  {
    id: 'cpc', short: 'CPC', full: 'Computer Physics Communications',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S142305363', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://www.sciencedirect.com/journal/computer-physics-communications',
    snapshots: journalSnapshots('cpc', [2024, 2025, 2026]),
  },
  {
    id: 'pof', short: 'PoF', full: 'Physics of Fluids',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S22862804', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://pubs.aip.org/aip/pfa',
    snapshots: journalSnapshots('pof', [2024, 2025, 2026]),
  },
  {
    id: 'sisc', short: 'SISC', full: 'SIAM Journal on Scientific Computing',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S165512578', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://epubs.siam.org/journal/sjoce3',
    snapshots: journalSnapshots('sisc', [2024, 2025, 2026]),
  },
  {
    id: 'cmame', short: 'CMAME', full: 'Computer Methods in Applied Mechanics and Engineering',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S40006715', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://www.sciencedirect.com/journal/computer-methods-in-applied-mechanics-and-engineering',
    snapshots: journalSnapshots('cmame', [2024, 2025, 2026]),
  },
  {
    id: 'jsc', short: 'JSC', full: 'Journal of Scientific Computing',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S151550017', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://link.springer.com/journal/10915',
    snapshots: journalSnapshots('jsc', [2024, 2025, 2026]),
  },
  {
    id: 'cicp', short: 'CiCP', full: 'Communications in Computational Physics',
    type: 'journal', area: 'physics', rank: '—', provider: 'openalex',
    oa: 'S34010870', recurrence: 'annual', startYear: 2018,
    dblp: '', site: 'https://global-sci.org/',
    snapshots: journalSnapshots('cicp', [2024, 2025, 2026]),
  },
];

// CCF 第七版目录扩展条目（scripts/generate-ccf-venues.mjs 生成）
import { CCF7_VENUES } from './venues-ccf7.ts';

export const VENUES: Venue[] = [...HAND_VENUES, ...CCF7_VENUES];

// 快照自动接线：public/data 里的 {venueId}-{year}.json 在构建期自动挂到对应 venue
import { SNAPSHOT_MAP } from './snapshots.generated.ts';
for (const v of VENUES) {
  const generated = SNAPSHOT_MAP[v.id];
  if (generated) v.snapshots = { ...generated, ...(v.snapshots || {}) };
}

export function findVenue(id: string): Venue | undefined {
  return VENUES.find((venue) => venue.id === id);
}

export function buildVenueYears(venue: Venue, currentYear: number, span?: number): number[] {
  // 会议回溯 14 年（CVPR/ICCV/NeurIPS 等可到 2013），期刊回溯 8 年
  const window = span ?? (venue.type === 'journal' ? 8 : 14);
  const max = Math.min(currentYear, venue.maxYear ?? currentYear);
  const min = Math.max(venue.startYear, max - window + 1);
  const years: number[] = [];
  for (let year = max; year >= min; year--) {
    if (venue.recurrence === 'odd' && year % 2 === 0) continue;
    if (venue.recurrence === 'even' && year % 2 === 1) continue;
    years.push(year);
  }
  return years;
}

export function dblpUrl(venue: Venue, year?: number): string {
  if (venue.type === 'journal') {
    return `https://dblp.org/db/journals/${venue.dblp}/index.html`;
  }
  const base = `https://dblp.org/db/conf/${venue.dblp}/`;
  return year ? `${base}${venue.dblp}${year}.html` : `${base}index.html`;
}
