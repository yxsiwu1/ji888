import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, User, Building, Calendar, Scale, Award, AlertTriangle, PieChart, LineChart, BarChart3, Target, Layers } from 'lucide-react';
import type { FundDetail } from '../types';
import { getFundDetail } from '../services/fundApi';

interface FundDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundCode: string | null;
  fundName?: string;
}

export const FundDetailModal: React.FC<FundDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  fundCode,
  fundName 
}) => {
  const [detail, setDetail] = useState<FundDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'holdings'>('overview');

  useEffect(() => {
    if (isOpen && fundCode) {
      setLoading(true);
      setDetail(null);
      getFundDetail(fundCode).then(data => {
        setDetail(data);
        setLoading(false);
      });
    }
  }, [isOpen, fundCode]);

  if (!isOpen) return null;

  const renderReturnBadge = (value: number, label: string) => {
    const isPositive = value >= 0;
    return (
      <div className="text-center p-3 rounded-lg bg-background/50">
        <div className={`text-lg font-mono font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
          {isPositive ? '+' : ''}{value.toFixed(2)}%
        </div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    );
  };

  // 简易的折线图渲染
  const renderChart = () => {
    if (!detail?.navHistory || detail.navHistory.length === 0) return null;
    
    const data = detail.navHistory;
    const maxNav = Math.max(...data.map(d => d.nav));
    const minNav = Math.min(...data.map(d => d.nav));
    const range = maxNav - minNav || 1;
    
    const width = 100;
    const height = 60;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.nav - minNav) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    const isPositive = data[data.length - 1].nav >= data[0].nav;
    
    return (
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? 'hsl(155, 100%, 50%)' : 'hsl(0, 84%, 60%)'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? 'hsl(155, 100%, 50%)' : 'hsl(0, 84%, 60%)'} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon 
            points={`0,${height} ${points} ${width},${height}`} 
            fill="url(#chartGradient)" 
          />
          <polyline 
            points={points} 
            fill="none" 
            stroke={isPositive ? 'hsl(155, 100%, 50%)' : 'hsl(0, 84%, 60%)'} 
            strokeWidth="1.5"
          />
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              {fundName || detail?.name || '基金详情'}
            </h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">{fundCode}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-background/50 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {[
            { key: 'overview', label: '概览', icon: TrendingUp },
            { key: 'history', label: '历史净值', icon: LineChart },
            { key: 'holdings', label: '持仓', icon: PieChart },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">加载基金详情...</p>
            </div>
          ) : !detail ? (
            <div className="text-center py-16 text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 实时估值 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">最新净值</div>
                      <div className="text-2xl font-mono font-bold text-foreground">{detail.nav.toFixed(4)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{detail.navDate}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">实时估值</div>
                      <div className="text-2xl font-mono font-bold text-foreground">{detail.estimate.toFixed(4)}</div>
                      <div className={`text-xs mt-1 flex items-center gap-1 ${detail.estimateGrowth >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {detail.estimateGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {detail.estimateGrowth > 0 ? '+' : ''}{detail.estimateGrowth.toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">基金规模</div>
                      <div className="text-2xl font-mono font-bold text-foreground">{detail.scale}</div>
                      <div className="text-xs text-muted-foreground mt-1">{detail.scaleDate}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">风险等级</div>
                      <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        {detail.riskLevel}
                      </div>
                    </div>
                  </div>

                  {/* 净值走势图 */}
                  <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-primary" />
                      近30日净值走势
                    </h4>
                    {renderChart()}
                  </div>

                  {/* 历史业绩 */}
                  <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      历史业绩
                    </h4>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {renderReturnBadge(detail.returnDay, '今日')}
                      {renderReturnBadge(detail.returnWeek, '近1周')}
                      {renderReturnBadge(detail.returnMonth, '近1月')}
                      {renderReturnBadge(detail.return3Month, '近3月')}
                      {renderReturnBadge(detail.return6Month, '近6月')}
                      {renderReturnBadge(detail.returnYear, '近1年')}
                      {renderReturnBadge(detail.return3Year, '近3年')}
                      {renderReturnBadge(detail.returnSinceEstablish, '成立来')}
                    </div>
                  </div>

                  {/* 基金信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        基金经理
                      </h4>
                      <div className="text-foreground">{detail.manager}</div>
                      <div className="text-xs text-muted-foreground mt-1">任职时间: {detail.managerTenure}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        基金公司
                      </h4>
                      <div className="text-foreground">{detail.company}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        成立日期: {detail.establishDate}
                      </div>
                    </div>
                  </div>

                  {/* 风险指标 */}
                  {(detail.sharpeRatio || detail.maxDrawdown) && (
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        风险指标
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {detail.sharpeRatio && (
                          <div>
                            <div className="text-xs text-muted-foreground">夏普比率</div>
                            <div className="text-lg font-mono font-bold text-foreground">{detail.sharpeRatio.toFixed(2)}</div>
                          </div>
                        )}
                        {detail.maxDrawdown && (
                          <div>
                            <div className="text-xs text-muted-foreground">最大回撤</div>
                            <div className="text-lg font-mono font-bold text-negative">{detail.maxDrawdown.toFixed(2)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-primary" />
                      历史净值
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (最近30个交易日)
                      </span>
                    </h4>
                    {detail.navHistory && detail.navHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border">
                              <th className="text-left py-2">日期</th>
                              <th className="text-right py-2">单位净值</th>
                              <th className="text-right py-2">累计净值</th>
                              <th className="text-right py-2">日涨幅</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.navHistory.slice().reverse().map((item, idx) => (
                              <tr key={idx} className="border-b border-border/50 last:border-0">
                                <td className="py-2 text-foreground font-mono">{item.date}</td>
                                <td className="py-2 text-right font-mono">{item.nav.toFixed(4)}</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{item.accNav.toFixed(4)}</td>
                                <td className={`py-2 text-right font-mono font-bold ${item.growth >= 0 ? 'text-positive' : 'text-negative'}`}>
                                  {item.growth > 0 ? '+' : ''}{item.growth.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无历史净值数据</p>
                        <p className="text-xs mt-1">数据正在加载中或暂时无法获取</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'holdings' && (
                <div className="space-y-4">
                  {/* 持仓风格 */}
                  {detail.style && (
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        持仓风格
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-3 rounded-lg bg-surface border border-border">
                          <div className="text-xs text-muted-foreground mb-1">市值偏好</div>
                          <div className={`text-lg font-bold ${
                            detail.style.scale === '大盘' ? 'text-blue-500' : 
                            detail.style.scale === '中盘' ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {detail.style.scale}
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-surface border border-border">
                          <div className="text-xs text-muted-foreground mb-1">投资风格</div>
                          <div className={`text-lg font-bold ${
                            detail.style.type === '价值' ? 'text-blue-500' : 
                            detail.style.type === '平衡' ? 'text-purple-500' : 'text-orange-500'
                          }`}>
                            {detail.style.type}
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-surface border border-border">
                          <div className="text-xs text-muted-foreground mb-1">估值水平</div>
                          <div className={`text-lg font-bold ${
                            detail.style.valuation === '低估' ? 'text-positive' : 
                            detail.style.valuation === '中估' ? 'text-yellow-500' : 'text-negative'
                          }`}>
                            {detail.style.valuation}
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-surface border border-border">
                          <div className="text-xs text-muted-foreground mb-1">盈利能力</div>
                          <div className={`text-lg font-bold ${
                            detail.style.profit === '高' ? 'text-positive' : 
                            detail.style.profit === '中' ? 'text-yellow-500' : 'text-negative'
                          }`}>
                            {detail.style.profit}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 重仓主题分布 */}
                  {detail.subStyles && detail.subStyles.length > 0 && (
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        重仓主题分布
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          (经理占比 vs 同类平均)
                        </span>
                      </h4>
                      <div className="space-y-3">
                        {detail.subStyles.slice(0, 5).map((theme, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-foreground font-medium">{theme.name}</span>
                              <div className="flex gap-3 text-xs">
                                <span className="text-primary">经理: {theme.ratio.toFixed(1)}%</span>
                                <span className="text-muted-foreground">平均: {theme.avgRatio.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="relative h-2 bg-background rounded-full overflow-hidden">
                              {/* 同类平均线 */}
                              <div 
                                className="absolute top-0 h-full w-0.5 bg-muted-foreground/50 z-10"
                                style={{ left: `${Math.min(theme.avgRatio * 2, 100)}%` }}
                              />
                              {/* 经理占比条 */}
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  theme.ratio > theme.avgRatio ? 'bg-primary' : 'bg-muted-foreground'
                                }`}
                                style={{ width: `${Math.min(theme.ratio * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 前十大持仓 */}
                  <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-primary" />
                      前十大持仓
                      {detail.holdingsDate && (
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          (更新: {detail.holdingsDate})
                        </span>
                      )}
                    </h4>
                    {detail.topHoldings && detail.topHoldings.length > 0 ? (
                      <div className="space-y-3">
                        {detail.topHoldings.map((holding, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground font-medium">{holding.name}</span>
                                  {holding.change !== undefined && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      holding.change > 0 ? 'bg-positive/10 text-positive' : 
                                      holding.change < 0 ? 'bg-negative/10 text-negative' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {holding.change > 0 ? '↑' : holding.change < 0 ? '↓' : '–'} 
                                      {holding.change !== 0 ? `${Math.abs(holding.change).toFixed(2)}%` : '持平'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{holding.code}</span>
                                  {holding.industry && (
                                    <>
                                      <span>•</span>
                                      <span>{holding.industry}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-foreground">{holding.ratio.toFixed(2)}%</div>
                              <div className="w-20 h-1.5 bg-background rounded-full mt-1">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all" 
                                  style={{ width: `${Math.min(holding.ratio * 5, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">前十大持仓占比</span>
                            <span className="font-mono font-bold text-foreground">
                              {detail.topHoldings.reduce((sum, h) => sum + h.ratio, 0).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无持仓数据</p>
                        <p className="text-xs mt-1">可能该基金未公布持仓信息或数据正在更新中</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background text-xs text-muted flex justify-between items-center font-mono">
          <span>数据来源: 天天基金</span>
          <span>更新时间: {detail?.estimateTime || '--:--'}</span>
        </div>
      </div>
    </div>
  );
};

export default FundDetailModal;
