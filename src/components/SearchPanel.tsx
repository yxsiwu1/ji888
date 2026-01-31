import React from 'react';
import { Search, Activity, AlertCircle, TrendingUp, SearchX, Plus, Sparkles, ExternalLink } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import type { Fund, FundSearchResult } from '../types';

interface SearchPanelProps {
  searchTerm: string;
  onSearch: (keyword: string) => void;
  isSearching: boolean;
  displayedFunds: (Fund | FundSearchResult)[];
  isLoadingFunds: boolean;
  lastUpdateTime: string | null;
  apiError: string | null;
  onAddHolding: (fund: Fund | FundSearchResult) => void;
  onAnalyzeFund: (fund: Fund | FundSearchResult) => void;
  onFundClick?: (code: string, name: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  searchTerm,
  onSearch,
  isSearching,
  displayedFunds,
  isLoadingFunds,
  lastUpdateTime,
  apiError,
  onAddHolding,
  onAnalyzeFund,
  onFundClick,
}) => {
  return (
    <div className="space-y-6">
      <div className="scroll-animate">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Search className="text-red-500" /> 基金搜索
        </h2>
        <SpotlightCard className="h-full">
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="输入基金代码、名称或拼音..." 
                className="w-full bg-background/50 border border-border rounded-lg py-3 px-4 pl-10 text-foreground focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 text-muted-foreground w-4 h-4" />
              {isSearching && (
                <div className="absolute right-3 top-3.5">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* 数据状态提示 */}
            {lastUpdateTime && !searchTerm && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-primary" />
                  实时数据
                </span>
                <span>更新于 {lastUpdateTime}</span>
              </div>
            )}

            {apiError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                {apiError}
              </div>
            )}

            <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
              {isLoadingFunds && !searchTerm ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-muted-foreground">加载热门基金中...</span>
                </div>
              ) : displayedFunds.length > 0 ? (
                displayedFunds.map(fund => (
                  <div 
                    key={fund.code} 
                    className="group flex justify-between items-center p-3 rounded-md hover:bg-surface transition-colors border border-transparent hover:border-border"
                  >
                    <div 
                      className="flex-1 min-w-0 mr-2 cursor-pointer"
                      onClick={() => onFundClick?.(fund.code, fund.name)}
                    >
                      <div className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors flex items-center gap-1">
                        {fund.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                        <span>{fund.code}</span>
                        {'type' in fund && fund.type && <span className="text-muted">· {fund.type}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {'growth' in fund && fund.growth !== undefined && (
                        <span className={`text-xs font-mono font-bold ${fund.growth >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {fund.growth > 0 ? '+' : ''}{fund.growth.toFixed(2)}%
                        </span>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAnalyzeFund(fund); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-accent hover:bg-accent/20 transition-all"
                        title="AI 深度透视"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAddHolding(fund); }}
                        className="opacity-0 group-hover:opacity-100 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground p-2 rounded-full transition-all"
                        title="添加到持仓"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : searchTerm && !isSearching ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <SearchX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  未找到相关基金
                </div>
              ) : !searchTerm ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  输入关键词搜索基金
                </div>
              ) : null}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};

export default SearchPanel;
