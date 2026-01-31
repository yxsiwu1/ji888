import type { Fund, FundSearchResult, MarketIndex, FundDetail, FundHolding, FundStyle, FundSubStyle } from '../types';

// 数据源类型
export type DataSourceType = 'tiantian' | 'eastmoney' | 'calculated';

export interface DataSourceInfo {
  id: DataSourceType;
  name: string;
  description: string;
}

// 可用数据源列表
export const DATA_SOURCES: DataSourceInfo[] = [
  { id: 'eastmoney', name: '东方财富', description: '东方财富网估值数据' },
  { id: 'tiantian', name: '天天基金', description: '天天基金网实时估值' },
  { id: 'calculated', name: '持仓穿透', description: '基于持仓股票计算估值' },
];

// localStorage key
const DATA_SOURCE_STORAGE_KEY = 'fund_data_source';

// 从 localStorage 获取保存的数据源，默认为东方财富
const getSavedDataSource = (): DataSourceType => {
  try {
    const saved = localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
    if (saved && ['tiantian', 'eastmoney', 'calculated'].includes(saved)) {
      return saved as DataSourceType;
    }
  } catch (e) {
    console.warn('读取数据源设置失败:', e);
  }
  return 'eastmoney'; // 默认东方财富
};

// 当前数据源 - 默认从 localStorage 读取
let currentDataSource: DataSourceType = getSavedDataSource();

// 获取当前数据源
export const getCurrentDataSource = (): DataSourceType => currentDataSource;

// 设置数据源（同时保存到 localStorage）
export const setDataSource = (source: DataSourceType): void => {
  currentDataSource = source;
  try {
    localStorage.setItem(DATA_SOURCE_STORAGE_KEY, source);
  } catch (e) {
    console.warn('保存数据源设置失败:', e);
  }
  console.log(`[DataSource] 切换到: ${source}`);
};

// 主要市场指数代码 - 新浪财经格式
export const MARKET_INDICES = [
  { code: 's_sh000001', name: '上证指数', market: 'sh', display: '000001' },
  { code: 's_sz399006', name: '创业板指', market: 'sz', display: '399006' },
  { code: 's_sh000688', name: '科创50', market: 'sh', display: '000688' },
  { code: 'rt_hkHSI', name: '恒生指数', market: 'hk', display: 'HSI' },
  { code: 'gb_$ixic', name: '纳斯达克', market: 'us', display: 'IXIC' },
];

// 热门基金代码列表
export const HOT_FUND_CODES = [
  '110011', // 易方达中小盘混合
  '161725', // 招商中证白酒指数
  '003834', // 华夏能源革新股票
  '005827', // 易方达蓝筹精选混合
  '001938', // 中欧时代先锋股票
  '320007', // 诺安成长混合
  '000961', // 天弘沪深300ETF联接A
  '001156', // 申万菱信新能源汽车
  '012414', // 中欧医疗创新股票
  '007119', // 华夏创业板动量成长ETF联接A
];

// 全量基金列表缓存
let allFundsCache: FundSearchResult[] | null = null;

// 声明全局变量
declare global {
  interface Window {
    jsonpgz: ((data: JsonpFundData) => void) | undefined;
    [key: string]: any; // 支持动态回调函数名
    r: [string, string, string, string, string][] | undefined;
  }
}

interface JsonpFundData {
  fundcode: string;
  name: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
  jzrq: string;
}

// 获取基金实时估值（天天基金源）
const getFundEstimateTiantian = async (fundCode: string): Promise<Fund | null> => {
  try {
    const timestamp = Date.now();
    const url = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${timestamp}`;
    
    const data = await new Promise<JsonpFundData>((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('请求超时'));
      }, 10000);
      
      const cleanup = () => {
        clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete (window as any).jsonpgz;
      };
      
      window.jsonpgz = (result: JsonpFundData) => {
        cleanup();
        resolve(result);
      };
      
      script.src = url;
      script.onerror = () => {
        cleanup();
        reject(new Error('网络请求失败'));
      };
      document.head.appendChild(script);
    });
    
    if (!data || !data.fundcode) {
      return null;
    }
    
    const nav = parseFloat(data.dwjz);
    const estimate = parseFloat(data.gsz);
    const growth = parseFloat(data.gszzl);
    
    return {
      id: 0,
      code: data.fundcode,
      name: data.name,
      nav: nav || 0,
      estimate: estimate || 0,
      growth: growth || 0,
      updateTime: data.gztime ? data.gztime.slice(11, 16) : '--:--',
      jzrq: data.jzrq || '',
    };
  } catch (error) {
    console.error(`[天天基金] 获取 ${fundCode} 失败:`, error);
    return null;
  }
};

const getFundEstimateEastmoney = async (fundCode: string): Promise<Fund | null> => {
  return getFundEstimateTiantian(fundCode);
};

const getFundEstimateCalculated = async (fundCode: string): Promise<Fund | null> => {
  try {
    const baseData = await getFundEstimateTiantian(fundCode);
    if (!baseData) return null;
    
    const holdingsCalc = await calculateHoldingsEstimate(fundCode, baseData.nav);
    
    if (holdingsCalc.holdings.length > 0 && holdingsCalc.estimate > 0) {
      return {
        ...baseData,
        estimate: holdingsCalc.estimate,
        growth: holdingsCalc.growth,
      };
    }
    
    return baseData;
  } catch (error) {
    return getFundEstimateTiantian(fundCode);
  }
};

export const getFundEstimate = async (fundCode: string, source?: DataSourceType): Promise<Fund | null> => {
  const dataSource = source || currentDataSource;
  
  switch (dataSource) {
    case 'eastmoney':
      return getFundEstimateEastmoney(fundCode);
    case 'calculated':
      return getFundEstimateCalculated(fundCode);
    case 'tiantian':
    default:
      return getFundEstimateTiantian(fundCode);
  }
};

export const getBatchEstimates = async (fundCodes: string[], source?: DataSourceType): Promise<Fund[]> => {
  const results: Fund[] = [];
  const concurrency = 3; 
  
  for (let i = 0; i < fundCodes.length; i += concurrency) {
    const batch = fundCodes.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (code, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 150));
        try {
          return await getFundEstimate(code, source);
        } catch (error) {
          return null;
        }
      })
    );
    results.push(...batchResults.filter((f): f is Fund => f !== null));
  }
  
  return results;
};

export const loadAllFunds = async (): Promise<FundSearchResult[]> => {
  if (allFundsCache) return allFundsCache;
  
  try {
    const url = 'https://fund.eastmoney.com/js/fundcode_search.js';
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('加载基金列表超时'));
      }, 15000);
      
      const cleanup = () => {
        clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
      };
      
      script.onload = () => {
        cleanup();
        resolve();
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('加载失败'));
      };
      script.src = url;
      document.head.appendChild(script);
    });
    
    if (window.r && Array.isArray(window.r)) {
      allFundsCache = window.r.map((item, index) => ({
        id: index,
        code: item[0],
        pinyin: item[1],
        name: item[2],
        type: item[3],
        fullPinyin: item[4]
      }));
      return allFundsCache;
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const searchFunds = async (keyword: string, limit = 20): Promise<FundSearchResult[]> => {
  const allFunds = await loadAllFunds();
  if (!keyword.trim()) return [];
  
  const lowerKeyword = keyword.toLowerCase().trim();
  const results = allFunds.filter(fund => 
    fund.code.includes(lowerKeyword) ||
    fund.name.includes(lowerKeyword) ||
    fund.pinyin.toLowerCase().includes(lowerKeyword) ||
    fund.fullPinyin.toLowerCase().includes(lowerKeyword)
  ).slice(0, limit);
  
  if (results.length > 0) {
    const estimates = await getBatchEstimates(results.map(f => f.code));
    const estimateMap = new Map(estimates.map(e => [e.code, e]));
    
    return results.map(fund => {
      const estimate = estimateMap.get(fund.code);
      return {
        ...fund,
        nav: estimate?.nav ?? 0,
        estimate: estimate?.estimate ?? 0,
        growth: estimate?.growth ?? 0,
        updateTime: estimate?.updateTime ?? '--:--',
      };
    });
  }
  return results;
};

const isMarketOpen = (market: string): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();
  const time = hour * 100 + minute;
  
  if ((market === 'sh' || market === 'sz' || market === 'hk') && (day === 0 || day === 6)) {
    return false;
  }
  
  switch (market) {
    case 'sh':
    case 'sz':
      return (time >= 930 && time <= 1130) || (time >= 1300 && time <= 1500);
    case 'hk':
      return (time >= 930 && time <= 1200) || (time >= 1300 && time <= 1600);
    case 'us':
      return time >= 2130 || time <= 400;
    default:
      return true;
  }
};

const INDICES_CACHE_KEY = 'fundmatrix_indices_cache';

const loadCachedIndices = (): Record<string, MarketIndex> => {
  try {
    const cached = localStorage.getItem(INDICES_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return {};
};

const saveCachedIndices = (data: Record<string, MarketIndex>) => {
  try {
    localStorage.setItem(INDICES_CACHE_KEY, JSON.stringify(data));
  } catch (e) {}
};

let latestIndicesData: Record<string, MarketIndex> = loadCachedIndices();

export const getMarketIndices = async (): Promise<MarketIndex[]> => {
  const indices: MarketIndex[] = [];
  const indexList = [
    { secid: '1.000001', name: '上证指数', market: 'sh', display: '000001' },
    { secid: '0.399006', name: '创业板指', market: 'sz', display: '399006' },
    { secid: '1.000688', name: '科创50', market: 'sh', display: '000688' },
    { secid: '100.HSI', name: '恒生指数', market: 'hk', display: 'HSI' },
    { secid: '100.NDX', name: '纳斯达克', market: 'us', display: 'NDX' },
  ];

  for (const idx of indexList) {
    try {
      const timestamp = Date.now();
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${idx.secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f169,f170&_=${timestamp}`;
      
      const data = await new Promise<any>((resolve, reject) => {
        const callbackName = `eastmoney_idx_${idx.display}_${timestamp}`;
        const timeout = setTimeout(() => { cleanup(); reject(new Error('超时')); }, 5000);
        const cleanup = () => {
          clearTimeout(timeout);
          delete (window as any)[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        };
        (window as any)[callbackName] = (result: any) => { cleanup(); resolve(result); };
        const script = document.createElement('script');
        script.src = url + `&cb=${callbackName}`;
        script.onerror = () => { cleanup(); reject(new Error('失败')); };
        document.head.appendChild(script);
      });
      
      if (data.rc === 0 && data.data) {
        const d = data.data;
        const price = (d.f43 ?? 0) / 100;
        const change = (d.f169 ?? 0) / 100;
        const changePercent = (d.f170 ?? 0) / 100;
        const prevClose = price - change;
        const isClosed = !isMarketOpen(idx.market);
        
        if (price > 0) {
          const indexData: MarketIndex = {
            code: idx.display,
            name: idx.name,
            price,
            prevClose,
            change,
            changePercent,
            updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isIndex: true,
            isClosed,
          };
          indices.push(indexData);
          latestIndicesData[idx.display] = indexData;
        } else if (latestIndicesData[idx.display]) {
          indices.push({ ...latestIndicesData[idx.display], isClosed, updateTime: latestIndicesData[idx.display].updateTime + ' (缓存)' });
        } else {
          indices.push(getFallbackIndexData(idx.name, idx.display, idx.market));
        }
      } else {
        indices.push(getFallbackIndexData(idx.name, idx.display, idx.market));
      }
    } catch (error) {
      indices.push(getFallbackIndexData(idx.name, idx.display, idx.market));
    }
  }
  saveCachedIndices(latestIndicesData);
  return indices;
};

const getFallbackIndexData = (name: string, code: string, market: string): MarketIndex => {
  const isClosed = !isMarketOpen(market);
  return {
    code, name, price: 0, prevClose: 0, change: 0, changePercent: 0,
    updateTime: '--:--', isIndex: true, isClosed,
  };
};

// 持仓计算相关
export interface StockHolding {
  code: string;
  name: string;
  ratio: number;
  price?: number;
  change?: number;
}

// 修复类型：使用 FundHolding[] 作为缓存存储类型，与 getFundHoldings 返回值保持一致
const holdingsCache = new Map<string, { data: FundHolding[]; timestamp: number }>();
const HOLDINGS_CACHE_TTL = 5 * 60 * 1000;

const PRESET_HOLDINGS: Record<string, StockHolding[]> = {
  '110011': [{ code: '600519', name: '贵州茅台', ratio: 9.12 }, { code: '000858', name: '五粮液', ratio: 6.45 }],
  '161725': [{ code: '600519', name: '贵州茅台', ratio: 19.85 }, { code: '000858', name: '五粮液', ratio: 15.23 }],
};

export const getFundHoldings = async (fundCode: string): Promise<FundHolding[]> => {
  const cached = holdingsCache.get(fundCode);
  if (cached && Date.now() - cached.timestamp < HOLDINGS_CACHE_TTL) {
    return cached.data;
  }
  
  let holdings: FundHolding[] = [];

  try {
    holdings = await fetchHoldingsFromPingzhong(fundCode);
    if (holdings.length === 0) {
      // 备用：从 HTML 解析
      const currentYear = new Date().getFullYear();
      holdings = await fetchHoldingsForYear(fundCode, currentYear);
    }
  } catch (e) {
    console.warn(`[Holdings] 获取失败: ${fundCode}`, e);
  }
  
  // 如果还是没有，尝试预设数据
  if (holdings.length === 0 && PRESET_HOLDINGS[fundCode]) {
    holdings = PRESET_HOLDINGS[fundCode].map(h => ({
      code: h.code,
      name: h.name,
      ratio: h.ratio
    }));
  }

  if (holdings.length > 0) {
    holdingsCache.set(fundCode, { data: holdings, timestamp: Date.now() });
  }

  return holdings;
};

const fetchHoldingsFromPingzhong = async (fundCode: string): Promise<FundHolding[]> => {
  try {
    window.Data_fundStocks = undefined;
    const url = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`;
    await loadFundDetailScriptFast(url);
    
    const stocksData = window.Data_fundStocks;
    if (stocksData && Array.isArray(stocksData)) {
      return stocksData.slice(0, 10).map(item => ({
        code: item.GPDM || '',
        name: item.GPJC || '',
        ratio: parseFloat(item.JZBL) || 0,
        industry: item.INDEXNAME,
        change: item.PCTNVCHG ? parseFloat(item.PCTNVCHG) : undefined,
      })).filter(h => h.code && h.ratio > 0);
    }
  } catch (e) {}
  return [];
};

const fetchHoldingsForYear = async (fundCode: string, year: number): Promise<FundHolding[]> => {
  return new Promise((resolve) => {
    const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=${year}&month=12,9,6,3&rt=${Date.now()}`;
    const script = document.createElement('script');
    script.onload = () => {
      const apidata = (window as any).apidata;
      if (apidata?.content) {
        resolve(parseHoldingsFromHTML(apidata.content));
      } else {
        resolve([]);
      }
      delete (window as any).apidata;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve([]);
    };
    script.src = url;
    document.head.appendChild(script);
  });
};

const parseHoldingsFromHTML = (html: string): FundHolding[] => {
  const holdings: FundHolding[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tbody tr');
    rows.forEach((row, idx) => {
      if (idx >= 10) return;
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const code = cells[1]?.textContent?.trim() || '';
        const name = cells[2]?.textContent?.trim() || '';
        const ratio = parseFloat(cells[3]?.textContent?.replace('%', '') || '0');
        if (code && ratio > 0) holdings.push({ code: code.padStart(6, '0'), name, ratio });
      }
    });
  } catch (e) {}
  return holdings;
};

export const getBatchStockPrices = async (stockCodes: string[]): Promise<Map<string, { price: number; change: number }>> => {
  const result = new Map<string, { price: number; change: number }>();
  if (stockCodes.length === 0) return result;

  const sinaCodesMap = new Map<string, string>();
  stockCodes.forEach(code => {
    const market = code.startsWith('6') || code.startsWith('9') ? 'sh' : 'sz';
    sinaCodesMap.set(`${market}${code}`, code);
  });
  
  const codes = Array.from(sinaCodesMap.keys()).join(',');
  try {
    const url = `https://hq.sinajs.cn/list=${codes}&_=${Date.now()}`;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => { resolve(); if (script.parentNode) script.parentNode.removeChild(script); };
      script.onerror = () => { reject(); if (script.parentNode) script.parentNode.removeChild(script); };
      document.head.appendChild(script);
    });
    
    sinaCodesMap.forEach((originalCode, sinaCode) => {
      const rawData = (window as any)[`hq_str_${sinaCode}`];
      if (rawData) {
        const parts = rawData.split(',');
        const currentPrice = parseFloat(parts[3]) || 0;
        const prevClose = parseFloat(parts[2]) || 0;
        const change = prevClose > 0 ? ((currentPrice - prevClose) / prevClose * 100) : 0;
        if (currentPrice > 0) result.set(originalCode, { price: currentPrice, change });
      }
    });
  } catch (e) {}
  return result;
};

export const calculateHoldingsEstimate = async (fundCode: string, baseNav: number): Promise<{
  estimate: number;
  growth: number;
  holdings: FundHolding[];
}> => {
  const holdings = await getFundHoldings(fundCode);
  if (holdings.length === 0) return { estimate: baseNav, growth: 0, holdings: [] };
  
  const stockPrices = await getBatchStockPrices(holdings.map(h => h.code));
  let totalWeightedChange = 0;
  let totalRatio = 0;
  
  const updatedHoldings = holdings.map(holding => {
    const priceInfo = stockPrices.get(holding.code);
    if (priceInfo) {
      totalWeightedChange += holding.ratio * priceInfo.change;
      totalRatio += holding.ratio;
      return { ...holding, change: priceInfo.change };
    }
    return holding;
  });
  
  const effectiveRatio = totalRatio > 0 ? totalRatio : 50;
  const estimatedChange = totalWeightedChange / effectiveRatio;
  const estimate = baseNav * (1 + estimatedChange / 100);
  
  return {
    estimate: parseFloat(estimate.toFixed(4)),
    growth: parseFloat(estimatedChange.toFixed(2)),
    holdings: updatedHoldings,
  };
};

// 辅助函数
const loadFundDetailScriptFast = async (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { cleanup(); resolve(false); }, 3000);
    const cleanup = () => {
      clearTimeout(timeout);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onload = () => { cleanup(); resolve(true); };
    script.onerror = () => { cleanup(); resolve(false); };
    script.src = url;
    document.head.appendChild(script);
  });
};

// 补全 getFundDetail 内部依赖
const determineRiskLevel = (growth: number): string => {
  const absGrowth = Math.abs(growth);
  if (absGrowth > 5) return '高风险';
  if (absGrowth > 2) return '中高风险';
  if (absGrowth > 1) return '中风险';
  return '中低风险';
};

export const getFundDetail = async (fundCode: string): Promise<FundDetail | null> => {
  try {
    const estimate = await getFundEstimate(fundCode);
    if (!estimate) return null;
    
    return {
      code: fundCode,
      name: estimate.name,
      type: '混合型',
      nav: estimate.nav,
      navDate: estimate.jzrq || '',
      estimate: estimate.estimate,
      estimateGrowth: estimate.growth,
      estimateTime: estimate.updateTime,
      manager: '暂无数据',
      managerTenure: '',
      scale: '',
      scaleDate: '',
      establishDate: '',
      company: '',
      returnDay: estimate.growth,
      returnWeek: 0,
      returnMonth: 0,
      return3Month: 0,
      return6Month: 0,
      returnYear: 0,
      return3Year: 0,
      returnSinceEstablish: 0,
      riskLevel: determineRiskLevel(estimate.growth),
      navHistory: [],
      topHoldings: await getFundHoldings(fundCode),
    };
  } catch (e) {
    return null;
  }
};