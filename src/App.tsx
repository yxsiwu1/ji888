import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Navbar, 
  HeroSection, 
  MarqueeSection, 
  SearchPanel, 
  HoldingsPanel, 
  DailyChangePanel,
  AIModal,
  FundDetailModal,
  AboutModal,
  LightRays
} from './components';
import { useScrollAnimation } from './hooks';
import { 
  HOT_FUND_CODES, 
  getBatchEstimates, 
  getFundEstimate, 
  searchFunds, 
  loadAllFunds,
  loadHoldings,
  saveHoldings,
  getMarketIndices,
  parseAlipayData,
  calculateHoldingsEstimate,
  getFundAccumulatedNav,
  getBatchNavUpdateStatus
} from './services';
import type { Fund, Holding, FundSearchResult, MarketIndex } from './types';

function App() {
  useScrollAnimation();
  
  const [funds, setFunds] = useState<Fund[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFunds, setIsLoadingFunds] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // AI State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiTitle, setAiTitle] = useState('');

  // Fund Detail State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);
  const [selectedFundName, setSelectedFundName] = useState<string>('');

  // Daily Change Panel State
  const [dailyChangeFund, setDailyChangeFund] = useState<Fund | FundSearchResult | null>(null);
  
  // About Modal State
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  
  // 搜索防抖
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存持仓到 localStorage
  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  // 加载市场指数
  const loadIndices = useCallback(async () => {
    try {
      const data = await getMarketIndices();
      setIndices(data);
    } catch (error) {
      console.error('加载指数失败:', error);
    }
  }, []);

  // 加载热门基金数据
  const loadHotFunds = useCallback(async () => {
    try {
      setApiError(null);
      const estimates = await getBatchEstimates(HOT_FUND_CODES);
      
      if (estimates.length > 0) {
        const fundList = estimates.map((est, idx) => ({
          ...est,
          id: idx + 1,
        }));
        setFunds(fundList);
        setLastUpdateTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error('加载热门基金失败:', error);
      setApiError('数据加载失败，请刷新页面重试');
    } finally {
      setIsLoadingFunds(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadHotFunds();
    loadIndices();
    loadAllFunds();
  }, [loadHotFunds, loadIndices]);

  // 初始化时加载净值更新状态
  useEffect(() => {
    const loadNavStatus = async () => {
      if (holdings.length === 0) return;
      const needsUpdate = holdings.some(h => h.navUpdateDate === undefined);
      if (!needsUpdate) return;
      
      const codes = holdings.map(h => h.code);
      const navUpdateMap = await getBatchNavUpdateStatus(codes);
      
      setHoldings(prev => prev.map(h => {
        const status = navUpdateMap.get(h.code);
        if (status && h.navUpdateDate === undefined) {
          return {
            ...h,
            navUpdated: status.navUpdated,
            navUpdateGrowth: status.navUpdateGrowth,
            navUpdateDate: status.navUpdateDate,
          };
        }
        return h;
      }));
    };
    
    loadNavStatus();
  }, []);

  // 指数每5秒刷新
  useEffect(() => {
    const indexInterval = setInterval(() => {
      loadIndices();
    }, 5000);
    return () => clearInterval(indexInterval);
  }, [loadIndices]);

  // 基金数据每30秒刷新
  useEffect(() => {
    const fundInterval = setInterval(() => {
      loadHotFunds();
      if (holdings.length > 0) {
        updateHoldingsEstimate();
      }
    }, 30000);
    return () => clearInterval(fundInterval);
  }, [loadHotFunds, holdings.length]);

  // 手动刷新
  const handleRefreshData = async () => {
    setIsLoadingFunds(true);
    await Promise.all([
      loadHotFunds(),
      loadIndices(),
      holdings.length > 0 ? updateHoldingsEstimate() : Promise.resolve()
    ]);
  };

  // 更新持仓估值
  const updateHoldingsEstimate = async () => {
    if (holdings.length === 0) return;
    const codes = holdings.map(h => h.code);
    const estimates = await getBatchEstimates(codes);
    const estimateMap = new Map(estimates.map(e => [e.code, e]));
    
    const updatedHoldings = holdings.map((h) => {
      const estimate = estimateMap.get(h.code);
      if (estimate) {
        return {
          ...h,
          nav: estimate.nav,
          estimate: estimate.estimate,
          growth: estimate.growth,
          updateTime: estimate.updateTime,
        };
      }
      return h;
    });
    setHoldings(updatedHoldings);
  };

  // 搜索功能
  const handleSearch = useCallback(async (keyword: string) => {
    setSearchTerm(keyword);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchFunds(keyword, 15);
        setSearchResults(results);
      } catch (error) {
        console.error('搜索失败:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // 添加持仓
  const addToHoldings = async (fund: Fund | FundSearchResult) => {
    if (!holdings.find(h => h.code === fund.code)) {
      const estimate = await getFundEstimate(fund.code);
      let accNav, accNavDate, syl_1m, syl_3m, syl_6m, syl_1y;
      let navUpdated, navUpdateGrowth, navUpdateDate;
      
      try {
        const accData = await getFundAccumulatedNav(fund.code);
        if (accData) {
          accNav = accData.accNav;
          accNavDate = accData.accNavDate ? new Date(accData.accNavDate).toISOString().slice(0, 10) : undefined;
          syl_1m = accData.syl_1m;
          syl_3m = accData.syl_3m;
          syl_6m = accData.syl_6m;
          syl_1y = accData.syl_1y;
        }
      } catch (e) { console.warn(e); }
      
      try {
        const navStatusMap = await getBatchNavUpdateStatus([fund.code]);
        const navStatus = navStatusMap.get(fund.code);
        if (navStatus) {
          navUpdated = navStatus.navUpdated;
          navUpdateGrowth = navStatus.navUpdateGrowth;
          navUpdateDate = navStatus.navUpdateDate;
        }
      } catch (e) { console.warn(e); }
      
      let holdingsEstimate, holdingsGrowth;
      try {
        const holdingsCalc = await calculateHoldingsEstimate(fund.code, estimate?.nav || 1);
        holdingsEstimate = holdingsCalc.estimate;
        holdingsGrowth = holdingsCalc.growth;
      } catch (e) { console.warn(e); }
      
      const newHolding: Holding = {
        id: Date.now(),
        code: fund.code,
        name: fund.name || estimate?.name || fund.code,
        nav: estimate?.nav || ('nav' in fund ? fund.nav : 0) || 0,
        estimate: estimate?.estimate || ('estimate' in fund ? fund.estimate : 0) || 0,
        growth: estimate?.growth || ('growth' in fund ? fund.growth : 0) || 0,
        updateTime: estimate?.updateTime || ('updateTime' in fund ? fund.updateTime : '--:--') || '--:--',
        shares: 1000,
        cost: estimate?.nav || ('nav' in fund ? fund.nav : 0) || 0,
        source: 'manual',
        holdingsEstimate,
        holdingsGrowth,
        accNav,
        accNavDate,
        syl_1m,
        syl_3m,
        syl_6m,
        syl_1y,
        navUpdated,
        navUpdateGrowth,
        navUpdateDate,
      };
      setHoldings([...holdings, newHolding]);
    }
  };

  // 导入数据
  const handleImportAlipay = async (data: string) => {
    const parsed = parseAlipayData(data);
    if (parsed.length === 0) return;
    const codes = parsed.map(p => p.code);
    const estimates = await getBatchEstimates(codes);
    const estimateMap = new Map(estimates.map(e => [e.code, e]));

    const newHoldings: Holding[] = parsed.map((p, idx) => {
      const estimate = estimateMap.get(p.code);
      const existing = holdings.find(h => h.code === p.code);
      return {
        id: existing?.id || Date.now() + idx,
        code: p.code,
        name: estimate?.name || p.name || p.code,
        nav: estimate?.nav || p.nav,
        estimate: estimate?.estimate || p.nav,
        growth: estimate?.growth || 0,
        updateTime: estimate?.updateTime || '--:--',
        shares: p.shares,
        cost: p.cost,
        alipayNav: p.nav,
        alipayUpdateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        source: 'alipay' as const
      };
    });

    setHoldings(prev => {
      const updated = [...prev];
      newHoldings.forEach(nh => {
        const existingIdx = updated.findIndex(h => h.code === nh.code);
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], shares: nh.shares, cost: nh.cost, source: 'alipay' };
        } else {
          updated.push(nh);
        }
      });
      return updated;
    });
  };

  const removeFromHoldings = (code: string) => setHoldings(holdings.filter(h => h.code !== code));
  const updateHoldingShares = (code: string, sh: string) => setHoldings(holdings.map(h => h.code === code ? { ...h, shares: parseFloat(sh) || 0 } : h));
  const updateHoldingCost = (code: string, co: string) => setHoldings(holdings.map(h => h.code === code ? { ...h, cost: parseFloat(co) || 0 } : h));
  const updateHoldingAmount = (code: string, am: string) => setHoldings(holdings.map(h => {
    if (h.code === code) {
      const amount = parseFloat(am) || 0;
      const val = h.estimate || h.nav || 1;
      return { ...h, shares: parseFloat((val > 0 ? amount / val : 0).toFixed(2)) };
    }
    return h;
  }));

  const handleFundClick = (code: string, name: string) => {
    setSelectedFundCode(code);
    setSelectedFundName(name);
    setDetailModalOpen(true);
    const fund = displayedFunds.find(f => f.code === code);
    if (fund) setDailyChangeFund(fund);
  };

  const displayedFunds = searchTerm.trim() ? searchResults : funds;

  const handleAnalyzePortfolio = () => {
    if (holdings.length === 0) {
      setAiTitle("持仓诊断");
      setAiContent("请先添加基金。");
      setAiModalOpen(true);
      return;
    }
    setAiTitle("智能持仓诊断");
    setAiModalOpen(true);
    setAiLoading(true);
    setTimeout(() => {
      const totalValue = holdings.reduce((acc, h) => acc + h.shares * (h.estimate || h.nav), 0);
      const totalProfit = holdings.reduce((acc, h) => acc + (((h.estimate || h.nav) - h.cost) * h.shares), 0);
      const profitRate = totalProfit / (totalValue - totalProfit || 1) * 100;
      setAiContent(`### 持仓报告\n- 总资产: ¥${totalValue.toFixed(2)}\n- 累计盈亏: ¥${totalProfit.toFixed(2)} (${profitRate.toFixed(2)}%)`);
      setAiLoading(false);
    }, 1500);
  };

  const handleAnalyzeFund = (fund: Fund | FundSearchResult | Holding) => {
    setAiTitle(`${fund.name} - 基金分析`);
    setAiModalOpen(true);
    setAiLoading(true);
    setTimeout(() => {
      // 修复处：使用可选链或逻辑默认值处理可能为 undefined 的属性
      const growth = 'growth' in fund ? (fund.growth ?? 0) : 0;
      const nav = 'nav' in fund ? (fund.nav ?? 0) : 0;
      const estimate = 'estimate' in fund ? (fund.estimate ?? nav) : nav;
      
      setAiContent(`
### ${fund.name}
**基金代码**: ${fund.code}
**实时估值**
- 当前净值: ${nav.toFixed(4)}
- 估算净值: ${estimate.toFixed(4)}
- 今日涨跌: ${growth > 0 ? '+' : ''}${growth.toFixed(2)}%
      `);
      setAiLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen font-sans text-foreground relative">
      <div className="ascii-bg fixed inset-0 z-[-1] opacity-30"></div>
      <LightRays />
      <AIModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title={aiTitle} content={aiContent} loading={aiLoading} />
      <FundDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} fundCode={selectedFundCode} fundName={selectedFundName} />
      <AboutModal isOpen={aboutModalOpen} onClose={() => setAboutModalOpen(false)} />
      <Navbar onAboutClick={() => setAboutModalOpen(true)} />
      <HeroSection onAboutClick={() => setAboutModalOpen(true)} />
      <MarqueeSection indices={indices} holdings={holdings} onFundClick={handleFundClick} />
      <section id="dashboard" className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <SearchPanel 
              searchTerm={searchTerm} onSearch={handleSearch} isSearching={isSearching} 
              displayedFunds={displayedFunds} isLoadingFunds={isLoadingFunds} 
              lastUpdateTime={lastUpdateTime} apiError={apiError} 
              onAddHolding={addToHoldings} onAnalyzeFund={handleAnalyzeFund} onFundClick={handleFundClick} 
            />
            <DailyChangePanel selectedFund={dailyChangeFund} onFundClick={handleFundClick} />
          </div>
          <HoldingsPanel 
            holdings={holdings} lastUpdateTime={lastUpdateTime} 
            onAnalyzePortfolio={handleAnalyzePortfolio} onAnalyzeFund={handleAnalyzeFund} 
            onRemoveHolding={removeFromHoldings} onUpdateShares={updateHoldingShares} 
            onUpdateCost={updateHoldingCost} onUpdateAmount={updateHoldingAmount} 
            onImportAlipay={handleImportAlipay} onRefreshData={handleRefreshData} 
            onFundClick={(fund) => setDailyChangeFund(fund)} 
          />
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm font-mono">
        <p>© 2026 CHORD DESIGN. 仅供学习参考使用.</p>
      </footer>
    </div>
  );
}

export default App;