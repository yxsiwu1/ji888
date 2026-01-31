import React from 'react';

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

export const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ text, className = '' }) => {
  return (
    <h1 className={`flex overflow-hidden ${className}`}>
      {text.split('').map((char, index) => (
        <span 
          key={index} 
          className="char-reveal" 
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
};

export default AnimatedTitle;
