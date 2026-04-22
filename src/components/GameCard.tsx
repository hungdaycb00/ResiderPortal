import React from 'react';
import { Play } from 'lucide-react';

interface GameCardProps {
  title: string;
  image: string;
  logoStyle: string;
  onClick: () => void;
  lightMode?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ title, image, logoStyle, onClick, lightMode = false }) => (
  <div onClick={onClick} className={`relative rounded-xl overflow-hidden group cursor-pointer aspect-[1.5/1] sm:aspect-[16/9] border transition-all ${lightMode ? 'bg-gray-50 border-gray-200 shadow-sm' : 'bg-[#1a1d24] border-gray-800/50'}`}>
    <img src={image} alt={title} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${lightMode ? 'opacity-80' : 'opacity-50 group-hover:opacity-70'}`} />
    
    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none pb-10">
      <h3 className={`text-2xl md:text-3xl lg:text-4xl font-black uppercase text-center leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] ${logoStyle} ${lightMode && logoStyle === 'text-white' ? 'text-gray-900' : ''}`} style={{ WebkitTextStroke: lightMode ? 'none' : '1px rgba(0,0,0,0.8)' }}>
        { (title || '').split(' ').map((word, i) => (
          <React.Fragment key={i}>
            {word}<br/>
          </React.Fragment>
        ))}
      </h3>
    </div>

    <div className={`absolute inset-x-0 bottom-0 p-2.5 md:p-3 flex items-center gap-2.5 md:gap-3 ${lightMode ? 'bg-white/90 border-t border-gray-100' : 'bg-gradient-to-t from-black via-black/80 to-transparent'}`}>
      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${lightMode ? 'bg-blue-600' : 'bg-white'}`}>
        <Play className={`w-3 h-3 md:w-3.5 md:h-3.5 ml-0.5 ${lightMode ? 'text-white' : 'text-black'}`} fill="currentColor" />
      </div>
      <span className={`font-medium text-sm md:text-base truncate ${lightMode ? 'text-gray-900' : 'text-white'}`}>{title}</span>
    </div>
  </div>
);

export default GameCard;
