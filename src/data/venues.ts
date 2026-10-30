// 顶会 / 顶刊目录：论文门户的数据源配置。
// provider = openalex（覆盖面完整）或 s2（OpenAlex 缺失的会议走 Semantic Scholar）。
// 年份只展示已出版范围（<= 当前年），双年会议用 odd / even 过滤，避免点未来年份出现空面板。

export type VenueType = 'conference' | 'journal';
export type VenueArea =
  | 'vision'
  | 'multimedia'
  | 'learning'
  | 'ai'
  | 'language'
  | 'robotics'
  | 'medical'
  | 'data';
export type VenueProvider = 'openalex' | 's2';
export type Recurrence = 'annual' | 'odd' | 'even';

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
}

export const AREA_ORDER: VenueArea[] = [
  'vision',
  'multimedia',
  'learning',
  'ai',
  'language',
  'robotics',
  'medical',
  'data',
];

export const AREA_LABELS: Record<VenueArea, string> = {
  vision: '视觉',
  multimedia: '多媒体与图形',
  learning: '机器学习',
  ai: '人工智能',
  language: '自然语言',
  robotics: '机器人',
  medical: '医学影像',
  data: '数据与安全',
};

export const VENUES: Venue[] = [
  // ===== 视觉 =====
  {
    id: 'cvpr', short: 'CVPR', full: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition',
    type: 'conference', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S4210176548', recurrence: 'annual', startYear: 2013,
    dblp: 'cvpr', site: 'https://cvpr.thecvf.com/',
  },
  {
    id: 'iccv', short: 'ICCV', full: 'IEEE/CVF International Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'A', provider: 'openalex',
    oa: 'S4363607764', recurrence: 'odd', startYear: 2013,
    dblp: 'iccv', site: 'https://iccv.thecvf.com/',
  },
  {
    id: 'eccv', short: 'ECCV', full: 'European Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'B', provider: 's2',
    s2: 'ECCV', recurrence: 'even', startYear: 2018,
    dblp: 'eccv', site: 'https://www.ecva.net/',
  },
  {
    id: 'wacv', short: 'WACV', full: 'IEEE/CVF Winter Conference on Applications of Computer Vision',
    type: 'conference', area: 'vision', rank: 'B', provider: 'openalex',
    oa: 'S4393918690', recurrence: 'annual', startYear: 2018,
    dblp: 'wacv', site: 'https://wacv.thecvf.com/',
  },
  {
    id: 'bmvc', short: 'BMVC', full: 'British Machine Vision Conference',
    type: 'conference', area: 'vision', rank: 'C', provider: 's2',
    s2: 'BMVC', recurrence: 'annual', startYear: 2018,
    dblp: 'bmvc', site: 'https://www.bmva.org/',
  },
  {
    id: 'accv', short: 'ACCV', full: 'Asian Conference on Computer Vision',
    type: 'conference', area: 'vision', rank: 'C', provider: 's2',
    s2: 'ACCV', recurrence: 'even', startYear: 2018,
    dblp: 'accv', site: 'https://accv.org/',
  },
  {
    id: '3dv', short: '3DV', full: 'International Conference on 3D Vision',
    type: 'conference', area: 'vision', rank: 'C', provider: 's2',
    s2: '3DV', recurrence: 'annual', startYear: 2020,
    dblp: '3dim', site: 'https://3dvconf.github.io/',
  },

  // ===== 多媒体与图形 =====
  {
    id: 'acmmm', short: 'ACM MM', full: 'ACM International Conference on Multimedia',
    type: 'conference', area: 'multimedia', rank: 'A', provider: 'openalex',
    oa: 'S4363608757', recurrence: 'annual', startYear: 2018,
    dblp: 'mm', site: 'https://www.acmmm.org/',
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
  },
  {
    id: 'icip', short: 'ICIP', full: 'IEEE International Conference on Image Processing',
    type: 'conference', area: 'multimedia', rank: 'C', provider: 's2',
    s2: 'ICIP', recurrence: 'annual', startYear: 2018,
    dblp: 'icip', site: 'https://2025.ieeeicip.org/',
  },

  // ===== 机器学习 =====
  {
    id: 'neurips', short: 'NeurIPS', full: 'Conference on Neural Information Processing Systems',
    type: 'conference', area: 'learning', rank: 'A', provider: 'openalex',
    oa: 'S4363606243', recurrence: 'annual', startYear: 2013,
    dblp: 'nips', site: 'https://papers.nips.cc/',
  },
  {
    id: 'icml', short: 'ICML', full: 'International Conference on Machine Learning',
    type: 'conference', area: 'learning', rank: 'A', provider: 's2',
    s2: 'ICML', recurrence: 'annual', startYear: 2013,
    dblp: 'icml', site: 'https://icml.cc/',
  },
  {
    id: 'iclr', short: 'ICLR', full: 'International Conference on Learning Representations',
    type: 'conference', area: 'learning', rank: 'A', provider: 's2',
    s2: 'ICLR', recurrence: 'annual', startYear: 2014,
    dblp: 'iclr', site: 'https://iclr.cc/',
  },
  {
    id: 'aistats', short: 'AISTATS', full: 'International Conference on Artificial Intelligence and Statistics',
    type: 'conference', area: 'learning', rank: 'B', provider: 's2',
    s2: 'AISTATS', recurrence: 'annual', startYear: 2018,
    dblp: 'aistats', site: 'https://aistats.org/',
  },
  {
    id: 'uai', short: 'UAI', full: 'Conference on Uncertainty in Artificial Intelligence',
    type: 'conference', area: 'learning', rank: 'B', provider: 's2',
    s2: 'UAI', recurrence: 'annual', startYear: 2018,
    dblp: 'uai', site: 'https://www.auai.org/',
  },
  {
    id: 'colt', short: 'COLT', full: 'Conference on Learning Theory',
    type: 'conference', area: 'learning', rank: 'B', provider: 's2',
    s2: 'COLT', recurrence: 'annual', startYear: 2018,
    dblp: 'colt', site: 'https://www.learningtheory.org/',
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
    type: 'conference', area: 'ai', rank: 'A', provider: 'openalex',
    oa: 'S4306419999', recurrence: 'annual', startYear: 2013,
    dblp: 'ijcai', site: 'https://www.ijcai.org/',
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
  },
  {
    id: 'coling', short: 'COLING', full: 'International Conference on Computational Linguistics',
    type: 'conference', area: 'language', rank: 'B', provider: 'openalex',
    oa: 'S4306419219', recurrence: 'annual', startYear: 2018,
    dblp: 'coling', site: 'https://aclanthology.org/venues/coling/',
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
    type: 'conference', area: 'robotics', rank: 'B', provider: 'openalex',
    oa: 'S4393918188', recurrence: 'annual', startYear: 2018,
    dblp: 'iros', site: 'https://www.iros.org/',
  },
  {
    id: 'corl', short: 'CoRL', full: 'Conference on Robot Learning',
    type: 'conference', area: 'robotics', rank: '—', provider: 's2',
    s2: 'CoRL', recurrence: 'annual', startYear: 2018,
    dblp: 'corl', site: 'https://www.corl.org/',
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
    type: 'journal', area: 'multimedia', rank: 'B', provider: 'openalex',
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

  // ===== 期刊：机器学习 =====
  {
    id: 'tnnls', short: 'TNNLS', full: 'IEEE Transactions on Neural Networks and Learning Systems',
    type: 'journal', area: 'learning', rank: 'B', provider: 'openalex',
    oa: 'S4210175523', recurrence: 'annual', startYear: 2018,
    dblp: 'tnnls', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=5962385',
  },
  {
    id: 'jmlr', short: 'JMLR', full: 'Journal of Machine Learning Research',
    type: 'journal', area: 'learning', rank: '—', provider: 'openalex',
    oa: 'S118988714', recurrence: 'annual', startYear: 2018,
    dblp: 'jmlr', site: 'https://www.jmlr.org/',
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

  // ===== 期刊：数据与安全 =====
  {
    id: 'tkde', short: 'TKDE', full: 'IEEE Transactions on Knowledge and Data Engineering',
    type: 'journal', area: 'data', rank: 'A', provider: 'openalex',
    oa: 'S30698027', recurrence: 'annual', startYear: 2018,
    dblp: 'tkde', site: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=69',
  },
  {
    id: 'tifs', short: 'TIFS', full: 'IEEE Transactions on Information Forensics and Security',
    type: 'journal', area: 'data', rank: 'B', provider: 'openalex',
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
];

export function findVenue(id: string): Venue | undefined {
  return VENUES.find((venue) => venue.id === id);
}

export function buildVenueYears(venue: Venue, currentYear: number, span?: number): number[] {
  const window = span ?? (venue.type === 'journal' ? 6 : 10);
  const min = Math.max(venue.startYear, currentYear - window + 1);
  const years: number[] = [];
  for (let year = currentYear; year >= min; year--) {
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
