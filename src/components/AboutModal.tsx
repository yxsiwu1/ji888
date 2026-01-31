import React from 'react';
import { X, Info, AlertTriangle, Github, Lightbulb, Mail, MessageCircle } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-gradient-to-r from-red-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <Info className="text-red-500 w-6 h-6" />
            <h3 className="text-xl font-bold text-foreground tracking-wide">关于本工具</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-surface"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 开发初衷 */}
          <div className="space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              本人专业并非计算机领域，但因听到某些估值数据服务停止的消息感到困扰，于是萌生了利用公开数据自行开发一个个人投资辅助工具的想法。这个项目是我边学代码边设计制作的，旨在满足个人投资信息需求，并配备AI管家协助进行投资决策分析。由于是个人学习项目，可能会存在一些bug和不足之处，敬请谅解，我也会持续学习和迭代改进。
            </p>
          </div>

          {/* 风险提示 */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-destructive mb-2">重要提示</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  本工具展示的所有数据均来源于公开渠道，可能存在延迟或不准确的情况，投资决策需谨慎参考。
                </p>
              </div>
            </div>
          </div>

          {/* 开源声明 */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Github className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-primary mb-2">开源声明</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  本工具完全免费且完全开源，仅供个人学习和技术交流使用。
                </p>
              </div>
            </div>
          </div>

          {/* 功能引导 */}
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-secondary mb-2">使用提示</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  具体功能使用方法请自行探索体验，但请注意：<span className="text-foreground font-medium">周一早上系统可能出现不稳定情况</span>。
                </p>
              </div>
            </div>
          </div>

          {/* 反馈渠道 */}
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-accent mb-3">意见反馈</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  如有问题或建议，欢迎通过以下方式联系我：
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('2558139125@qq.com');
                      alert('邮箱已复制：2558139125@qq.com');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="w-4 h-4" />
                    邮箱：2558139125@qq.com
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('3980520271');
                      alert('小红书号已复制：3980520271');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 hover:border-red-500/50 transition-all text-sm text-muted-foreground hover:text-foreground"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                    小红书：3980520271
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex justify-between items-center">
          <span className="text-xs text-muted font-mono">CHORD DESIGN © 2026</span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
