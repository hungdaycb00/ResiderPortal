import React from 'react';
import { MapPin } from 'lucide-react';
import { DEGREES_TO_PX } from '../constants';

/**
 * Province Boundary: Vòng tròn giới hạn tỉnh thành
 */
export const MapBoundary: React.FC<{
    currentProvince: string;
}> = ({ currentProvince }) => (
    <div className="absolute w-[2000px] h-[2000px] border-[5px] border-gray-500/20 rounded-full flex items-center justify-center pointer-events-none" style={{ left: 'calc(50% - 1000px)', top: 'calc(50% - 1000px)' }}>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 alin-map-billboard">
            <div className="px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-full text-gray-500 text-xs font-black tracking-widest uppercase backdrop-blur-sm alin-map-upright-sprite">
                {currentProvince} BOUNDARY
            </div>
        </div>
    </div>
);

/**
 * Search Marker Pin: Marker mục tiêu tìm kiếm
 */
export const SearchMarkerPin: React.FC<{
    pos: { lat: number; lng: number };
    myObfPos: { lat: number; lng: number };
}> = ({ pos, myObfPos }) => (
    <div className="absolute w-10 h-10 -ml-5 -mt-10 flex items-center justify-center pointer-events-none z-[105] alin-map-billboard" style={{
        top: `calc(50% + ${-(pos.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
        left: `calc(50% + ${(pos.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
    }}>
        <div className="relative flex flex-col items-center alin-map-upright-sprite">
            <div className="absolute -top-6 whitespace-nowrap bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">Target</div>
            <MapPin className="w-8 h-8 text-red-500 fill-red-100" />
            <div className="w-2 h-1 bg-black/30 rounded-[100%] blur-[1px] -mt-1" />
        </div>
    </div>
);
