export interface Fund {
  id: number;
  code: string;
  name: string;
  nav: number;
  estimate: number;
  growth: number;
  updateTime: string;
  jzrq?: string;
  type?: string;
  pinyin?: string;
  fullPinyin?: string;
}

export interface Holding extends Fund {
  shares: number;
  cost: number;
  // 支付宝导入数据
  alipayNav?: number;
  alipayUpdateTime?: string;
  source?: 'manual' | 'alipay';
  // 穿透估值数据 (基于持仓股票实时价格计算)
  holdingsEstimate?: number;
  holdingsGrowth?: number;
  // 累计净值数据 (从pingzhongdata获取)
  accNav?: number;
  accNavDate?: string;
  // 近期业绩
  syl_1m?: number;  // 近1月收益
  syl_3m?: number;  // 近3月收益
  syl_6m?: number;  // 近6月收益
  syl_1y?: number;  // 近1年收益
  // 净值更新状态
  navUpdated?: boolean;      // 是否已更新
  navUpdateGrowth?: number;  // 更新的涨幅
  navUpdateDate?: string;    // 更新日期
}

export interface FundSearchResult {
  id: number;
  code: string;
  pinyin: string;
  name: string;
  type: string;
  fullPinyin: string;
  nav?: number;
  estimate?: number;
  growth?: number;
  updateTime?: string;
}

// 市场指数类型
export interface MarketIndex {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  updateTime: string;
  isIndex: true;
  isClosed?: boolean; // 是否停盘
  prevClose?: number; // 昨收
}

// 滚动横幅项目类型
export type MarqueeItem = (Fund & { isIndex?: false }) | MarketIndex;

// 支付宝导入数据格式
export interface AlipayHoldingData {
  code: string;
  name: string;
  nav: number;
  shares: number;
  cost: number;
  updateTime: string;
}

// 基金详情类型
export interface FundDetail {
  code: string;
  name: string;
  type: string;
  nav: number;
  navDate: string;
  estimate: number;
  estimateGrowth: number;
  estimateTime: string;
  // 基金经理
  manager: string;
  managerTenure: string;
  // 基金规模
  scale: string;
  scaleDate: string;
  // 成立信息
  establishDate: string;
  company: string;
  // 历史业绩
  returnDay: number;
  returnWeek: number;
  returnMonth: number;
  return3Month: number;
  return6Month: number;
  returnYear: number;
  return3Year: number;
  returnSinceEstablish: number;
  // 风险指标
  riskLevel: string;
  sharpeRatio?: number;
  maxDrawdown?: number;
  // 历史净值数据
  navHistory: { date: string; nav: number; accNav: number; growth: number }[];
  // 持仓信息
  topHoldings?: FundHolding[];
  holdingsDate?: string; // 持仓更新时间
  // 持仓风格
  style?: FundStyle;
  // 重仓主题
  subStyles?: FundSubStyle[];
}

// 基金持仓股票
export interface FundHolding {
  code: string;      // GPDM 股票代码
  name: string;      // GPJC 股票名称
  ratio: number;     // JZBL 持仓占比
  industry?: string; // INDEXNAME 所属行业
  change?: number;   // PCTNVCHG 较上期变化
}

// 持仓风格
export interface FundStyle {
  scale: '大盘' | '中盘' | '小盘';     // FSCALE
  type: '价值' | '平衡' | '成长';      // FSTYLE
  valuation: '低估' | '中估' | '高估'; // GZQK
  profit: '低' | '中' | '高';          // YLQK
}

// 重仓主题
export interface FundSubStyle {
  name: string;      // DLMC 主题名称
  ratio: number;     // CCBL 经理占比
  avgRatio: number;  // AVRBL 同类平均
}
