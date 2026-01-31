import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';
import type { Fund, MarketIndex, Holding } from '../types';

interface MarqueeSectionProps {
  indices: MarketIndex[];
  holdings: Holding[];
  onFundClick: (code: string, name: string) => void;
}

// 数字跳动动画组件 - 使用 memo 避免不必要的重新渲染
const AnimatedNumber = React.memo<{ value: number; decimals?: number; prefix?: string }>(({ 
  value, 
  decimals = 2,
  prefix = '' 
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (Math.abs(value - displayValue) > 0.001) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);
  
  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'scale-105 opacity-80' : ''}`}>
      {prefix}{displayValue.toFixed(decimals)}
    </span>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';

// 指数卡片组件
const IndexCard = React.memo<{ index: MarketIndex }>(({ index }) => {
  const isPositive = index.changePercent >= 0;
  const isClosed = index.isClosed;
  
  return (
    <div 
      className={`flex-shrink-0 w-52 p-3 rounded-lg border backdrop-blur-sm transition-all mx-2 ${
        isClosed 
          ? 'bg-surface/50 border-border/30 opacity-70' 
          : 'bg-surface/80 border-border/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-3 h-3 ${isClosed ? 'text-muted-foreground' : 'text-secondary'}`} />
          <span className="text-xs text-muted-foreground font-mono">{index.name}</span>
        </div>
        {isClosed && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            停盘
          </span>
        )}
      </div>
      <div className="flex justify-between items-end">
        <div className={`text-lg font-mono font-bold ${isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
          {index.price > 0 ? <AnimatedNumber value={index.price} decimals={2} /> : '--'}
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-mono font-bold ${
            isClosed ? 'text-muted-foreground' : (isPositive ? 'text-positive' : 'text-negative')
          }`}>
            {!isClosed && (isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
            <AnimatedNumber value={index.changePercent} decimals={2} prefix={isPositive ? '+' : ''} />%
          </div>
          <div className={`text-[10px] font-mono ${isClosed ? 'text-muted' : 'text-muted-foreground'}`}>
            {isPositive ? '+' : ''}{index.change.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground flex justify-end">
        {index.updateTime}
      </div>
    </div>
  );
});

IndexCard.displayName = 'IndexCard';

// 基金卡片组件
const FundCard = React.memo<{ fund: Fund; isHolding: boolean; onClick: () => void }>(({ fund, isHolding, onClick }) => {
  const isUp = fund.growth >= 0;
  return (
    <div 
      className={`flex-shrink-0 w-56 p-3 rounded-lg border backdrop-blur-sm transition-colors cursor-pointer mx-2
        ${isHolding 
          ? isUp 
            ? 'bg-destructive/10 border-destructive/30 hover:bg-destructive/20' 
            : 'bg-primary/10 border-primary/30 hover:bg-primary/20'
          : 'bg-surface/50 border-border/50 hover:bg-surface'
        }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{fund.code}</span>
            {isHolding && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isUp ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>持仓</span>
            )}
          </div>
          <div className="font-bold text-sm text-foreground mt-1 truncate">{fund.name}</div>
        </div>
        <div className={`text-sm font-mono font-bold ml-2 ${fund.growth >= 0 ? 'text-positive' : 'text-negative'}`}>
          <AnimatedNumber value={fund.growth} decimals={2} prefix={fund.growth > 0 ? '+' : ''} />%
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex justify-between">
        <span>估值: <AnimatedNumber value={fund.estimate || fund.nav} decimals={4} /></span>
        <span>{fund.updateTime}</span>
      </div>
    </div>
  );
});

FundCard.displayName = 'FundCard';

export const MarqueeSection: React.FC<MarqueeSectionProps> = ({ 
  indices, 
  holdings,
  onFundClick 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const animationRef = useRef<number>();
  
  // 持仓基金数据
  const holdingFunds: Fund[] = useMemo(() => holdings.map(h => ({
    id: h.id,
    code: h.code,
    name: h.name,
    nav: h.nav,
    estimate: h.estimate,
    growth: h.growth,
    updateTime: h.updateTime,
  })), [holdings]);

  // 只显示指数和持仓
  const allItems = useMemo(() => [...indices, ...holdingFunds], [indices, holdingFunds]);
  const hasData = allItems.length > 0;

  // 使用 JS 实现平滑无缝滚动
  useEffect(() => {
    if (!scrollRef.current || !hasData) return;
    
    const scrollContainer = scrollRef.current;
    const scrollSpeed = 0.5; // 像素/帧
    let position = scrollPosition;
    
    const animate = () => {
      if (!scrollContainer) return;
      
      const contentWidth = scrollContainer.scrollWidth / 2; // 因为内容复制了两遍
      position += scrollSpeed;
      
      // 无缝循环：当滚动到一半时重置位置
      if (position >= contentWidth) {
        position = 0;
      }
      
      scrollContainer.style.transform = `translateX(-${position}px)`;
      setScrollPosition(position);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasData]); // 只依赖 hasData，不依赖数据内容变化

  return (
    <section className="py-6 border-y border-border/50 bg-background/50 relative overflow-hidden">
      {/* 渐变遮罩 */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
      
      <div className="overflow-hidden">
        {hasData ? (
          <div ref={scrollRef} className="flex whitespace-nowrap will-change-transform">
            {/* 复制两遍实现无缝循环滚动 */}
            {[...allItems, ...allItems].map((item, idx) => {
              const isIndex = 'isIndex' in item && item.isIndex;
              
              if (isIndex) {
                return <IndexCard key={`index-${(item as MarketIndex).code}-${idx}`} index={item as MarketIndex} />;
              } else {
                const fund = item as Fund;
                const isHolding = holdings.some(h => h.code === fund.code);
                return (
                  <FundCard 
                    key={`fund-${fund.code}-${idx}`} 
                    fund={fund} 
                    isHolding={isHolding}
                    onClick={() => onFundClick(fund.code, fund.name)}
                  />
                );
              }
            })}
          </div>
        ) : (
          <div className="w-full text-center py-4 text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>加载实时行情...</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MarqueeSection;
