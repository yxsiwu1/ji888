import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  loading: boolean;
}

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, title, content, loading }) => {
  if (!isOpen) return null;

  // 简单的 Markdown 解析
  const parseMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2 text-foreground">$1</h3>')
      .replace(/^- (.*$)/gim, '<li class="mb-1">$1</li>');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="bg-surface border border-accent/30 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl glow-accent animate-reveal">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-gradient-to-r from-accent/20 to-transparent">
          <div className="flex items-center gap-3">
            <Sparkles className="text-accent w-5 h-5 animate-pulse" />
            <h3 className="text-xl font-bold text-foreground tracking-wide">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-3 text-accent">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <p className="text-center text-sm text-muted-foreground font-mono animate-pulse">正在分析数据...</p>
            </div>
          ) : (
            <div 
              className="ai-content text-muted-foreground text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background text-xs text-muted flex justify-between items-center font-mono">
          <span>FUND MATRIX SYSTEM</span>
          <span>数据内容仅供参考，不构成投资建议</span>
        </div>
      </div>
    </div>
  );
};

export default AIModal;
