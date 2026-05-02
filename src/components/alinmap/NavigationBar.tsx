import React from 'react';
import { Search, MapPin, Navigation, MessageCircle, User, UserPlus, Compass, Bell, Gamepad2, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { useSocial } from './features/social/context/SocialContext';
import { useLooterGame } from './looter-game/LooterGameContext';

interface NavigationBarProps {
    mainTab: string;
    selectedUser: any;
    isDesktop: boolean;
    handleTabClick: (tabId: string) => void;
    user?: any;
    isSheetExpanded?: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ mainTab, selectedUser, isDesktop, handleTabClick, user, isSheetExpanded }) => {
    const [showFullNav, setShowFullNav] = React.useState(false);
    const { unreadCount } = useSocial();
    const { isItemDragging } = useLooterGame();

    return (
        <div className={isItemDragging ? 'pointer-events-none' : ''}>
            {/* Global Left Navigation (PC Only) */}
            <div className="hidden md:flex absolute top-0 left-0 bottom-0 w-[72px] bg-white border-r border-gray-100 flex-col items-center py-8 z-[150] shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-blue-600/20">
                    <Compass className="w-7 h-7 text-white" />
                </div>

                <div className="flex flex-col gap-6">
                    <button onClick={() => handleTabClick('discover')} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <Navigation className={`w-6 h-6 ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Explore</span>
                    </button>
                    <button onClick={() => handleTabClick('friends')} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <UserPlus className={`w-6 h-6 ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Social</span>
                    </button>
                    <button onClick={() => handleTabClick('profile')} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <User className={`w-6 h-6 ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>Profile</span>
                    </button>
                    
                    {/* Looter Button */}
                    <button onClick={() => handleTabClick('backpack')} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <Package className={`w-6 h-6 ${mainTab === 'backpack' && !selectedUser ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'backpack' && !selectedUser ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-400'}`}>Looter</span>
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {/* Mobile Open Navigation Button */}
            {!isDesktop && (
                <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[200] pointer-events-auto transition-transform duration-300 ${mainTab === 'backpack' && !showFullNav ? 'translate-y-0' : 'translate-y-full'}`}>
                    <button 
                        onClick={() => setShowFullNav(true)}
                        className="w-full h-4 bg-[#1e293b]/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-center shadow-2xl text-amber-400 hover:h-6 transition-all duration-300"
                        title="Open Navigation"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Full Mobile Navigation Panel */}
            <div className={`flex md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex-row items-center justify-around py-2 z-[200] shadow-[0_-8px_32px_rgba(0,0,0,0.1)] pointer-events-auto transition-transform duration-300 ${(!isDesktop && (mainTab !== 'backpack' || showFullNav)) ? 'translate-y-0' : 'translate-y-full shadow-none border-none'}`}>
                {/* Minimalist Collapse Button for Full Nav in Looter Mode */}
                {!isDesktop && mainTab === 'backpack' && showFullNav && (
                    <button 
                        onClick={() => setShowFullNav(false)}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/95 backdrop-blur-xl border-t border-x border-gray-100 rounded-t-xl flex items-center justify-center shadow-lg text-amber-500"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                )}
                <button onClick={() => handleTabClick('discover')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Navigation className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Explore</span>
                </button>
                <button onClick={() => handleTabClick('friends')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <UserPlus className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Social</span>
                </button>
                <button onClick={() => handleTabClick('profile')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Profile</span>
                </button>
                
                {/* Looter Button */}
                <button onClick={() => {
                    handleTabClick('backpack');
                    if (!isDesktop) setShowFullNav(false);
                }} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'backpack' && !selectedUser ? 'text-amber-500' : 'text-gray-400'}`}>
                    <Package className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Looter</span>
                </button>
            </div>
        </div>
    );
};

export default NavigationBar;
