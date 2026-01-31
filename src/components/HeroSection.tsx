import React from 'react';
import { Sparkles, ArrowRight, Bot } from 'lucide-react';
import { TypewriterText } from './TypewriterText';

interface HeroSectionProps {
  onAboutClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onAboutClick }) => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Ambient Glow Orbs */}
      <div className="hero-orb hero-orb-primary"></div>
      <div className="hero-orb hero-orb-secondary"></div>
      <div className="hero-orb hero-orb-accent"></div>
      
      {/* Ambient Light Layer */}
      <div className="ambient-light absolute inset-0 z-0"></div>
      
      {/* ASCII Background Art */}
      <div className="absolute top-0 right-0 z-0 pointer-events-none opacity-20 hidden lg:block">
        <pre className="font-mono text-[8px] leading-[8px] whitespace-pre overflow-hidden bg-gradient-to-b from-primary to-transparent bg-clip-text text-transparent select-none opacity-30">
{`
      .                                          .
    .n                   .                 .                  n.
  .dP                  dP                 9b                9b.
 4    qXb        .      dX                   Xb       .        dX
X      99b       d8b.    d8                   8b    .d8b.      99
        88b     d8  8b  d8                    8b  d8   8b     88
        888b   d8    8bd8                      8bd8     8b   d88
        8888b d8      88                        88       8b d888
        8888888        8                        8        8888888
        888888          Y                        Y          888888
        88888            b                        d            88888
        8888              b                      d              8888
        888                b                    d                888
        88                  b                  d                  88
        8                    b                d                    8
`}
        </pre>
      </div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono tracking-widest uppercase animate-float cursor-default">
          <Sparkles className="w-3 h-3" /> 实时数据 API 已集成
        </div>
        
        <div className="flex justify-center mb-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight font-mono flex overflow-hidden justify-center text-center">
            {/* 循环打字机动画 - 保留FUND不删除，FUND为白色，MATRIX为红色 */}
            <TypewriterText
              texts={[
                'FUND MATRIX',
                'FUND MATRIX SYSTEM',
                'FUND MATRIX PRO',
                'FUND MATRIX AI'
              ]}
              typingSpeed={120}
              deletingSpeed={60}
              pauseDuration={2000}
              preservePrefix="FUND"
              prefixClassName="text-foreground"
              suffixClassName="text-red-500"
            />
          </h1>
        </div>
        
        <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground font-mono scroll-animate" style={{transitionDelay: '0.2s'}}>
          基于 React 构建，集成实时 API。不仅是可实时，更可以穿透持仓。
        </p>

        <div className="mt-10 flex justify-center gap-4 scroll-animate" style={{transitionDelay: '0.4s'}}>
          <button 
            className="border-beam-container group relative px-8 py-3 rounded-full bg-surface text-foreground font-medium overflow-hidden transition-transform active:scale-95"
            onClick={() => document.getElementById('dashboard')?.scrollIntoView({behavior: 'smooth'})}
          >
            <span className="relative z-10 flex items-center gap-2">
              立即开始 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button 
            onClick={onAboutClick}
            className="px-8 py-3 rounded-full border border-border hover:bg-surface transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Bot className="w-4 h-4 text-accent" /> 功能说明
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
