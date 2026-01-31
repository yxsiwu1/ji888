import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface NavbarProps {
  onAboutClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAboutClick }) => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md navbar-glow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-red-500 h-6 w-6" />
            <span className="font-mono font-bold text-lg tracking-wider">
              <span className="text-foreground">FUND</span><span className="text-red-500">MATRIX</span>_
            </span>
          </div>
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-8 text-sm font-medium">
            <a href="#" className="text-muted-foreground hover:text-red-500 transition-colors">实时估值</a>
            <a href="#" className="text-muted-foreground hover:text-red-500 transition-colors">持仓分析</a>
            <a href="#" className="text-muted-foreground hover:text-red-500 transition-colors">市场洞察</a>
          </div>
          <button 
            onClick={onAboutClick}
            className="border border-border rounded-full p-2 hover:bg-surface hover:border-red-500/50 transition-colors group"
            title="关于本工具"
          >
            <Info className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
