import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface GameSliderProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  lightMode?: boolean;
}

export default function GameSlider({ children, title, icon, lightMode = false }: GameSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showButtons, setShowButtons] = React.useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setShowButtons(scrollWidth > clientWidth);
    }
  };

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      scrollRef.current.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {title && (
        <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
          <h3 className={`text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic ${lightMode ? 'text-gray-900' : ''}`}>
            {icon}
            {title}
          </h3>
          {showButtons && (
            <div className="flex gap-2">
              <button 
                onClick={() => scroll('left')}
                className={`p-2 rounded-full transition-all active:scale-95 ${lightMode ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scroll('right')}
                className={`p-2 rounded-full transition-all active:scale-95 ${lightMode ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="relative group/slider">
        <div 
          ref={scrollRef}
          className="flex gap-4 md:gap-6 pb-4 overflow-x-auto snap-x snap-mandatory custom-scrollbar px-4 md:px-0"
          style={{ scrollBehavior: 'smooth' }}
        >
          {React.Children.map(children, (child) => (
            <div className="shrink-0 snap-start">
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
