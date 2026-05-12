import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface AlinMapLoadingIconProps {
  className?: string;
  strokeWidth?: number;
}

const AlinMapLoadingIcon: React.FC<AlinMapLoadingIconProps> = ({
  className = 'h-8 w-8 text-white/35',
  strokeWidth = 2.25,
}) => {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={className}
      strokeWidth={strokeWidth}
    />
  );
};

export default React.memo(AlinMapLoadingIcon);
