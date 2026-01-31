import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Calendar, Activity, BarChart3, RefreshCw } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { getFundEstimate } from '../services/fundApi';
import type { Fund, FundSearchResult } from '../types';

interface DailyChangePanelProps {
  selectedFund: (Fund | FundSearchResult) | null;
  onFundClick?: (code: string, name: string) => void;
}

interface DataPoint {
  time: string;
  value: number;
  timestamp: number;
}

// 判断是否在交易时间
const isMarketHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();
  const time = hour * 100 + minute;
  
  if (day === 0 || day === 6) return false;
  return (time >= 930 && time <= 1130) || (time >= 1300 && time <= 1500);
};

// 纯 SVG 折线图组件
const SimpleLineChart: React.FC<{
  data: DataPoint[];
  prevClose: number;
  isPositive: boolean;
}> = ({ data, prevClose, isPositive }) => {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center">
          <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
          {isMarketHours() ? '数据加载中...' : '非交易时段'}
        </div>
      </div>
    );
  }

  const width = 300;
  const height = 120;
  const padding = { top: 15, right: 15, bottom: 25, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const allValues = prevClose > 0 ? [...values, prevClose] : values;
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 0.001;
  const yMin = minVal - range * 0.15;
  const yMax = maxVal + range * 0.15;

  const valueToY = (val: number) => {
    const normalized = (val - yMin) / (yMax - yMin);
    return padding.top + (1 - normalized) * chartHeight;
  };

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: valueToY(d.value),
    ...d
  }));

  const linePath = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const prevCloseY = prevClose > 0 ? valueToY(prevClose) : null;
  const yTickValues = [yMax, (yMin + yMax) / 2, yMin];
  const lineColor = isPositive ? '#ef4444' : '#22c55e';

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <pattern id="chartGrid" width="40" height="26" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 26" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="url(#chartGrid)" />

      {yTickValues.map((tick, i) => (
        <g key={i}>
          <line x1={padding.left - 3} y1={valueToY(tick)} x2={padding.left} y2={valueToY(tick)} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <text x={padding.left - 6} y={valueToY(tick) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">
            {tick.toFixed(4)}
          </text>
        </g>
      ))}

      {prevCloseY !== null && (
        <g>
          <line x1={padding.left} y1={prevCloseY} x2={width - padding.right} y2={prevCloseY} stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          <text x={width - padding.right + 2} y={prevCloseY + 3} className="fill-muted-foreground" fontSize="8">昨收</text>
        </g>
      )}

      {points.length > 1 ? (
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : points.length === 1 && (
        <circle cx={points[0].x} cy={points[0].y} r={5} fill={lineColor} />
      )}

      {points.length > 1 && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={lineColor} opacity={i === points.length - 1 ? 1 : 0.5} />
      ))}

      <text x={padding.left} y={height - 6} textAnchor="start" className="fill-muted-foreground" fontSize="9">{data[0].time}</text>
      {data.length > 1 && (
        <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-muted-foreground" fontSize="9">
          {data[data.length - 1].time}
        </text>
      )}
    </svg>
  );
};

export const DailyChangePanel: React.FC<DailyChangePanelProps> = ({
  selectedFund,
  onFundClick,
}) => {
  const [intradayData, setIntradayData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prevClose, setPrevClose] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFundCodeRef = useRef<string | null>(null);

  const fundCode = selectedFund?.code || null;

  const fetchDataPoint = useCallback(async () => {
    if (!fundCode) return;
    setIsLoading(true);
    try {
      const data = await getFundEstimate(fundCode);
      if (data && data.estimate > 0) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const timestamp = Math.floor(now.getTime() / 60000);

        if (data.nav > 0 && prevClose === 0) setPrevClose(data.nav);

        setIntradayData(prev => {
          if (prev.some(p => p.timestamp === timestamp)) return prev;
          const newPoint: DataPoint = { time: timeStr, value: data.estimate, timestamp };
          return [...prev, newPoint].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    } catch (error) {
      console.error('获取估值失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fundCode, prevClose]);

  useEffect(() => {
    if (fundCode !== currentFundCodeRef.current) {
      currentFundCodeRef.current = fundCode;
      setIntradayData([]);
      setPrevClose(0);
      if (fundCode) fetchDataPoint();
    }
  }, [fundCode, fetchDataPoint]);

  useEffect(() => {
    if (!fundCode) return;
    intervalRef.current = setInterval(() => {
      if (isMarketHours()) fetchDataPoint();
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fundCode, fetchDataPoint]);

  if (!selectedFund) {
    return (
      <div className="scroll-animate" style={{ transitionDelay: '0.1s' }}>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="text-red-500 w-5 h-5" /> 当日涨幅
        </h2>
        <SpotlightCard>
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            点击持仓基金查看当日涨幅
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // 修复 TS18048: 使用解构赋值并确保默认值
  const fundData = {
    growth: ('growth' in selectedFund ? selectedFund.growth : 0) ?? 0,
    nav: ('nav' in selectedFund ? selectedFund.nav : 0) ?? 0,
    updateTime: ('updateTime' in selectedFund ? selectedFund.updateTime : '--:--') ?? '--:--'
  };

  const estimate = 'estimate' in selectedFund ? (selectedFund.estimate ?? fundData.nav) : fundData.nav;
  const isPositive = fundData.growth >= 0;
  const changeAmount = fundData.nav > 0 ? (fundData.nav * fundData.growth / 100) : 0;

  return (
    <div className="scroll-animate" style={{ transitionDelay: '0.1s' }}>
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="text-primary w-5 h-5" /> 当日涨幅
      </h2>
      <SpotlightCard>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div 
                className="text-base font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                onClick={() => onFundClick?.(selectedFund.code, selectedFund.name)}
              >
                {selectedFund.name}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">{selectedFund.code}</div>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${
              isPositive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
            }`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {fundData.growth !== undefined ? `${fundData.growth > 0 ? '+' : ''}${fundData.growth.toFixed(2)}%` : '--'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">日内估值走势</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
                <span>{intradayData.length} 点</span>
              </div>
            </div>
            <SimpleLineChart data={intradayData} prevClose={prevClose} isPositive={isPositive} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <div className="text-xs text-muted-foreground mb-1">估算净值</div>
              <div className="text-lg font-mono font-bold text-primary">
                {estimate ? estimate.toFixed(4) : '--'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <div className="text-xs text-muted-foreground mb-1">昨日净值</div>
              <div className="text-lg font-mono font-bold text-foreground">
                {fundData.nav ? fundData.nav.toFixed(4) : '--'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">估算涨跌</div>
              <div className={`text-base font-mono font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
                {isPositive ? '+' : ''}{changeAmount.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              更新于 {fundData.updateTime}
              {isMarketHours() && <span className="ml-1 text-primary">●</span>}
            </span>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
};

export default DailyChangePanel;