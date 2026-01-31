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

  // 加载市场指数（快速刷新实现跳动效果）
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
    loadAllFunds(); // 预加载基金列表
  }, [loadHotFunds, loadIndices]);

  // 初始化时异步加载持仓的净值更新状态
  useEffect(() => {
    const loadNavStatus = async () => {
      if (holdings.length === 0) return;
      // 检查是否已有净值更新状态
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
  }, []); // 只在首次加载时执行

  // 指数数据快速刷新（每5秒）实现跳动效果
  useEffect(() => {
    const indexInterval = setInterval(() => {
      loadIndices();
    }, 5000);
    return () => clearInterval(indexInterval);
  }, [loadIndices]);

  // 基金数据定时刷新（每30秒）
  useEffect(() => {
    const fundInterval = setInterval(() => {
      loadHotFunds();
      if (holdings.length > 0) {
        updateHoldingsEstimate();
      }
    }, 30000);
    return () => clearInterval(fundInterval);
  }, [loadHotFunds, holdings.length]);

  // 手动刷新数据
  const handleRefreshData = async () => {
    setIsLoadingFunds(true);
    await Promise.all([
      loadHotFunds(),
      loadIndices(),
      holdings.length > 0 ? updateHoldingsEstimate() : Promise.resolve()
    ]);
  };

  // 更新持仓估值（只更新估值，保留已有的净值更新状态）
  const updateHoldingsEstimate = async () => {
    if (holdings.length === 0) return;
    
    const codes = holdings.map(h => h.code);
    const estimates = await getBatchEstimates(codes);
    const estimateMap = new Map(estimates.map(e => [e.code, e]));
    
    // 只更新估值数据，保留已有的净值更新状态
    const updatedHoldings = holdings.map((h) => {
      const estimate = estimateMap.get(h.code);
      if (estimate) {
        return {
          ...h,
          nav: estimate.nav,
          estimate: estimate.estimate,
          growth: estimate.growth,
          updateTime: estimate.updateTime,
          // 保留已有的净值更新状态（不重新请求）
        };
      }
      return h;
    });
    
    setHoldings(updatedHoldings);
  };

  // 搜索基金（带防抖）
  const handleSearch = useCallback(async (keyword: string) => {
    setSearchTerm(keyword);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
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

  // 添加到持仓
  const addToHoldings = async (fund: Fund | FundSearchResult) => {
    if (!holdings.find(h => h.code === fund.code)) {
      const estimate = await getFundEstimate(fund.code);
      
      // 获取累计净值数据 (从pingzhongdata)
      let accNav: number | undefined;
      let accNavDate: string | undefined;
      let syl_1m: number | undefined;
      let syl_3m: number | undefined;
      let syl_6m: number | undefined;
      let syl_1y: number | undefined;
      
      // 净值更新状态
      let navUpdated: boolean | undefined;
      let navUpdateGrowth: number | undefined;
      let navUpdateDate: string | undefined;
      
      try {
        const accData = await getFundAccumulatedNav(fund.code);
        if (accData) {
          accNav = accData.accNav;
          accNavDate = accData.accNavDate ? new Date(accData.accNavDate).toISOString().slice(0, 10) : undefined;
          syl_1m = accData.syl_1m;
          syl_3m = accData.syl_3m;
          syl_6m = accData.syl_6m;
          syl_1y = accData.syl_1y;
          console.log(`[AddHolding] ${fund.code} 累计净值:`, accData);
        }
      } catch (e) {
        console.warn(`[AddHolding] ${fund.code} 获取累计净值失败:`, e);
      }
      
      // 获取净值更新状态
      try {
        const navStatusMap = await getBatchNavUpdateStatus([fund.code]);
        const navStatus = navStatusMap.get(fund.code);
        if (navStatus) {
          navUpdated = navStatus.navUpdated;
          navUpdateGrowth = navStatus.navUpdateGrowth;
          navUpdateDate = navStatus.navUpdateDate;
          console.log(`[AddHolding] ${fund.code} 净值更新状态:`, navStatus);
        }
      } catch (e) {
        console.warn(`[AddHolding] ${fund.code} 获取净值更新状态失败:`, e);
      }
      
      // 计算穿透估值 (基于持仓股票实时价格)
      let holdingsEstimate: number | undefined;
      let holdingsGrowth: number | undefined;
      try {
        const holdingsCalc = await calculateHoldingsEstimate(fund.code, estimate?.nav || 1);
        holdingsEstimate = holdingsCalc.estimate;
        holdingsGrowth = holdingsCalc.growth;
        console.log(`[AddHolding] ${fund.code} 穿透估值:`, holdingsCalc);
      } catch (e) {
        console.warn(`[AddHolding] ${fund.code} 穿透计算失败:`, e);
      }
      
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

  // 导入支付宝数据
  const handleImportAlipay = async (data: string) => {
    const parsed = parseAlipayData(data);
    if (parsed.length === 0) return;

    // 获取实时估值
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

    // 合并持仓：更新已有的，添加新的
    setHoldings(prev => {
      const updated = [...prev];
      newHoldings.forEach(nh => {
        const existingIdx = updated.findIndex(h => h.code === nh.code);
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            shares: nh.shares,
            cost: nh.cost,
            alipayNav: nh.alipayNav,
            alipayUpdateTime: nh.alipayUpdateTime,
            source: 'alipay'
          };
        } else {
          updated.push(nh);
        }
      });
      return updated;
    });
  };

  // 删除持仓
  const removeFromHoldings = (fundCode: string) => {
    setHoldings(holdings.filter(h => h.code !== fundCode));
  };

  // 修改持仓份额
  const updateHoldingShares = (fundCode: string, newShares: string) => {
    setHoldings(holdings.map(h => 
      h.code === fundCode ? { ...h, shares: parseFloat(newShares) || 0 } : h
    ));
  };

  // 修改持仓成本
  const updateHoldingCost = (fundCode: string, newCost: string) => {
    setHoldings(holdings.map(h => 
      h.code === fundCode ? { ...h, cost: parseFloat(newCost) || 0 } : h
    ));
  };

  // 修改持有金额（自动计算份额）
  const updateHoldingAmount = (fundCode: string, newAmount: string) => {
    setHoldings(holdings.map(h => {
      if (h.code === fundCode) {
        const amount = parseFloat(newAmount) || 0;
        const currentValue = h.estimate || h.nav || 1;
        const newShares = currentValue > 0 ? amount / currentValue : 0;
        return { ...h, shares: parseFloat(newShares.toFixed(2)) };
      }
      return h;
    }));
  };

  // 打开基金详情
  const handleFundClick = (code: string, name: string) => {
    setSelectedFundCode(code);
    setSelectedFundName(name);
    setDetailModalOpen(true);
    
    // 更新当日涨幅面板的数据
    const fund = displayedFunds.find(f => f.code === code);
    if (fund) {
      setDailyChangeFund(fund);
    }
  };

  // 显示的基金列表
  const displayedFunds = searchTerm.trim() ? searchResults : funds;

  // 分析持仓组合
  const handleAnalyzePortfolio = () => {
    if (holdings.length === 0) {
      setAiTitle("持仓诊断");
      setAiContent("请先添加一些基金到您的持仓，才能进行分析。");
      setAiModalOpen(true);
      return;
    }

    setAiTitle("智能持仓诊断");
    setAiModalOpen(true);
    setAiLoading(true);

    setTimeout(() => {
      const totalValue = holdings.reduce((acc, h) => acc + h.shares * (h.estimate || h.nav), 0);
      const totalProfit = holdings.reduce((acc, h) => acc + (((h.estimate || h.nav) - h.cost) * h.shares), 0);
      const profitRate = totalProfit / (totalValue - totalProfit) * 100;
      const alipayCount = holdings.filter(h => h.source === 'alipay').length;
      
      setAiContent(`
### 持仓分析报告

**资产概览**
- 总资产: ¥${totalValue.toFixed(2)}
- 累计盈亏: ¥${totalProfit.toFixed(2)} (${profitRate > 0 ? '+' : ''}${profitRate.toFixed(2)}%)
- 持有基金数量: ${holdings.length} 只
${alipayCount > 0 ? `- 支付宝导入: ${alipayCount} 只` : ''}

**风险评估**
当前持仓${holdings.length > 3 ? '较为分散' : '相对集中'}，建议${holdings.length > 3 ? '保持' : '适当分散'}投资组合。

**数据更新**
- 最后更新时间: ${lastUpdateTime || '未知'}
- 数据来源: 天天基金实时估值

**操作建议**
- 定期关注各基金的净值变化
- 根据市场情况适时调整持仓比例
- 长期持有优质基金，避免频繁操作
      `);
      setAiLoading(false);
    }, 1500);
  };

  // 分析单个基金
  const handleAnalyzeFund = (fund: Fund | FundSearchResult | Holding) => {
    setAiTitle(`${fund.name} - 基金分析`);
    setAiModalOpen(true);
    setAiLoading(true);

    setTimeout(() => {
      const growth = 'growth' in fund ? fund.growth : 0;
      const nav = 'nav' in fund ? fund.nav : 0;
      const estimate = 'estimate' in fund ? fund.estimate : nav;
      const hasAlipay = 'alipayNav' in fund && fund.alipayNav;
      
      setAiContent(`
### ${fund.name}

**基金代码**: ${fund.code}

**实时估值**
- 当前净值: ${nav.toFixed(4)}
- 估算净值: ${estimate.toFixed(4)}
- 今日涨跌: ${growth > 0 ? '+' : ''}${growth.toFixed(2)}%
- 更新时间: ${'updateTime' in fund ? fund.updateTime : '--:--'}
${hasAlipay ? `
**支付宝数据对比**
- 导入净值: ${(fund as Holding).alipayNav!.toFixed(4)}
- 估值差异: ${((estimate - (fund as Holding).alipayNav!) / (fund as Holding).alipayNav! * 100).toFixed(3)}%
` : ''}

**市场分析**
${growth >= 0 
  ? '该基金今日表现良好，呈上涨趋势。' 
  : '该基金今日出现回调，建议关注后续走势。'}

**投资建议**
- 关注基金的长期业绩表现
- 结合自身风险偏好做出投资决策
- 建议分批建仓，降低择时风险
      `);
      setAiLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen font-sans text-foreground relative">
      <div className="ascii-bg fixed inset-0 z-[-1] opacity-30"></div>
      <div className="bg-glow"></div>
      <LightRays />
      
      <AIModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)}
        title={aiTitle}
        content={aiContent}
        loading={aiLoading}
      />

      <FundDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        fundCode={selectedFundCode}
        fundName={selectedFundName}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <Navbar onAboutClick={() => setAboutModalOpen(true)} />
      <HeroSection onAboutClick={() => setAboutModalOpen(true)} />
      <MarqueeSection 
        indices={indices}
        holdings={holdings}
        onFundClick={handleFundClick}
      />

      {/* Dashboard Section */}
      <section id="dashboard" className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <SearchPanel 
              searchTerm={searchTerm}
              onSearch={handleSearch}
              isSearching={isSearching}
              displayedFunds={displayedFunds}
              isLoadingFunds={isLoadingFunds}
              lastUpdateTime={lastUpdateTime}
              apiError={apiError}
              onAddHolding={addToHoldings}
              onAnalyzeFund={handleAnalyzeFund}
              onFundClick={handleFundClick}
            />
            
            <DailyChangePanel selectedFund={dailyChangeFund} onFundClick={handleFundClick} />
          </div>
          
          <HoldingsPanel 
            holdings={holdings}
            lastUpdateTime={lastUpdateTime}
            onAnalyzePortfolio={handleAnalyzePortfolio}
            onAnalyzeFund={handleAnalyzeFund}
            onRemoveHolding={removeFromHoldings}
            onUpdateShares={updateHoldingShares}
            onUpdateCost={updateHoldingCost}
            onUpdateAmount={updateHoldingAmount}
            onImportAlipay={handleImportAlipay}
            onRefreshData={handleRefreshData}
            onFundClick={(fund) => setDailyChangeFund(fund)}
          />
        </div>
      </section>
      
      <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm font-mono">
        <p>© 2026 CHORD DESIGN. 仅供学习参考使用.</p>
        <p className="mt-2 text-xs text-muted flex items-center justify-center gap-1">
          实时数据 · 自动刷新 · 本地持久化
        </p>
        <button
          onClick={() => setAboutModalOpen(true)}
          className="mt-4 px-4 py-2 rounded-lg border border-border hover:border-red-500/50 hover:bg-red-500/5 transition-all text-muted-foreground hover:text-red-500"
        >
          意见反馈
        </button>
      </footer>
    </div>
  );
}

export default App;
