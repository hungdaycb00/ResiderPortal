import { useState, useRef } from 'react';
import { Users, Globe, MessageSquare, Plus, Home, Grid, Star, MapPin, Bell } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate, useDragControls } from 'motion/react';

interface MultiTaskButtonProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isInGame?: boolean;
  onFeedback?: () => void;
  className?: string;
}

export default function MultiTaskButton({ activeTab, setActiveTab, isInGame = false, onFeedback, className }: MultiTaskButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const dragControls = useDragControls();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
  
  const mvX = useMotionValue(position.x);
  const mvY = useMotionValue(position.y);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home', color: 'bg-indigo-500' },
    { id: 'chat', icon: MessageSquare, label: 'Chat', color: 'bg-blue-500' },
    { id: 'friends', icon: Users, label: 'Friends', color: 'bg-green-500' },
    {id: 'community', icon: Globe, label: 'Community', color: 'bg-purple-500'},
    {id: 'alin', icon: MapPin, label: 'Alin Map', color: 'bg-blue-600'},
    {id: 'notifications', icon: Bell, label: 'Alerts', color: 'bg-red-500'},
    ...(isInGame && onFeedback ? [{id: 'feedback', icon: Star, label: 'Feedback', color: 'bg-amber-500'}] : []),
  ];

  const getItemPosition = (index: number) => {
    const initialRadius = 80;
    const layerSpacing = 65;
    const filteredItems = menuItems.filter(item => item.id !== activeTab);
    const total = filteredItems.length;
    
    // 1. Determine corner area (startAngle, endAngle)
    const paddingX = 150;
    const paddingY = 150;
    const isNearRight = position.x > window.innerWidth - paddingX;
    const isNearLeft = position.x < paddingX;
    const isNearBottom = position.y > window.innerHeight - paddingY;
    const isNearTop = position.y < paddingY;

    let startAngle = 0;
    let endAngle = 360;

    if (isNearRight && isNearBottom) { startAngle = 180; endAngle = 270; }
    else if (isNearLeft && isNearBottom) { startAngle = 270; endAngle = 360; }
    else if (isNearRight && isNearTop) { startAngle = 90; endAngle = 180; }
    else if (isNearLeft && isNearTop) { startAngle = 0; endAngle = 90; }
    else if (isNearRight) { startAngle = 90; endAngle = 270; }
    else if (isNearLeft) { startAngle = 270; endAngle = 450; }
    else if (isNearBottom) { startAngle = 180; endAngle = 360; }
    else if (isNearTop) { startAngle = 0; endAngle = 180; }

    const availableAngle = Math.abs(endAngle - startAngle);
    const isFullCircle = availableAngle >= 360;
    const midAngle = (startAngle + endAngle) / 2;
    
    let currentTotal = 0;
    let layer = 0;
    
    while (true) {
      const radius = initialRadius + layer * layerSpacing;
      
      // Capacity of layer L at 90 degrees is 3 + L. Proportional to actual opening angle.
      let maxInLayer = Math.floor((3 + layer) * (availableAngle / 90));
      if (isFullCircle) {
        maxInLayer = (3 + layer) * 4; // Equivalent to 12, 16, 20...
      }
      maxInLayer = Math.max(1, maxInLayer);
      
      const itemsInThisLayer = Math.min(total - currentTotal, maxInLayer);
      
      if (index < currentTotal + itemsInThisLayer) {
        const indexInLayer = index - currentTotal;
        let angle;
        
        if (isFullCircle) {
          // Arrange in a perfect circle
          angle = startAngle + (indexInLayer * (360 / itemsInThisLayer));
        } else {
          // Arrange evenly from center to both sides (Symmetric)
          // Use stepAngle calculated based on maxInLayer to maintain even spacing
          const stepAngle = itemsInThisLayer > 1 ? availableAngle / (maxInLayer - 1) : 0;
          const offset = (indexInLayer - (itemsInThisLayer - 1) / 2) * stepAngle;
          angle = midAngle + offset;
        }
        
        const rad = (angle * Math.PI) / 180;
        return {
          x: Math.cos(rad) * radius,
          y: Math.sin(rad) * radius
        };
      }
      
      currentTotal += itemsInThisLayer;
      layer++;
      if (layer > 10) break;
    }

    return { x: 0, y: 0 };
  };

  return (
    <div className={`fixed inset-0 ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'} ${className || 'z-[300]'}`} ref={constraintsRef}>
      <motion.div
        ref={buttonRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setTimeout(() => setIsDragging(false), 100);
          
          const padding = 24;
          const buttonSize = 56;
          
          // Get the actual position of MotionValue when mouse is released
          let finalX = mvX.get();
          let finalY = mvY.get();

          // Check and limit screen boundaries so the button is not lost
          if (finalX < padding) finalX = padding;
          if (finalX > window.innerWidth - buttonSize - padding) finalX = window.innerWidth - buttonSize - padding;
          if (finalY < padding) finalY = padding;
          if (finalY > window.innerHeight - buttonSize - padding) finalY = window.innerHeight - buttonSize - padding;
          
          // Smoothly move to edge position if overflowing, or keep as is if in safe zone
          animate(mvX, finalX, { type: "spring", stiffness: 400, damping: 30 });
          animate(mvY, finalY, { type: "spring", stiffness: 400, damping: 30 });
          
          setPosition({ x: finalX, y: finalY });
        }}
        style={{ x: mvX, y: mvY }}
        className="absolute pointer-events-auto flex items-center justify-center w-14 h-14 touch-none will-change-transform"
      >
        <AnimatePresence>
          {isOpen && menuItems
            .filter(item => {
              // Always show home button if in game, so user can exit
              if (item.id === 'home' && isInGame) return true;
              return item.id !== activeTab;
            })
            .map((item, index) => {
              const pos = getItemPosition(index);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{ opacity: 1, x: pos.x, y: pos.y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id === 'feedback' && onFeedback) {
                    onFeedback();
                  } else {
                    setActiveTab(item.id as any);
                  }
                  setIsOpen(false);
                }}
                className={`absolute flex items-center justify-center w-12 h-12 rounded-full ${item.color} text-white shadow-xl border border-white/20 z-10`}
              >
                <item.icon className="w-5 h-5" />
                {activeTab === item.id && (
                  <div className="absolute -right-1 -top-1 w-3 h-3 bg-white rounded-full border-2 border-gray-900" />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => {
            if (!isDragging) {
              setIsOpen(!isOpen);
            }
          }}
          className={`relative z-20 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen ? 'bg-red-500 rotate-45 border-2 border-white/30' : 'bg-[#1a1d24]/80 border border-white/10'} text-white backdrop-blur-md cursor-grab active:cursor-grabbing select-none`}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close">
                <Plus className="w-7 h-7" />
              </motion.div>
            ) : (
              <motion.div key="open" className="relative flex items-center justify-center pointer-events-none">
                <motion.img 
                  src="/multitask.png" 
                  alt="Multitask"
                  className="w-12 h-12 object-contain pointer-events-none"
                />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </div>
  );
}
