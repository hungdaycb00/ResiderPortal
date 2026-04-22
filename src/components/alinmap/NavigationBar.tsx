import React from 'react';
import { Search, MapPin, Navigation, MessageCircle, User, UserPlus, Compass, Bell, Gamepad2 } from 'lucide-react';

interface NavigationBarProps {
    mainTab: string;
    selectedUser: any;
    isDesktop: boolean;
    unreadCount: number;
    handleTabClick: (tabId: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ mainTab, selectedUser, isDesktop, unreadCount, handleTabClick }) => {
    return (
        <>
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
                    <button onClick={() => handleTabClick('creator')} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <Gamepad2 className={`w-6 h-6 ${mainTab === 'creator' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'creator' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>Creator</span>
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-around py-2 z-[200] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pointer-events-auto">
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
                <button onClick={() => handleTabClick('creator')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'creator' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Gamepad2 className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Creator</span>
                </button>
            </div>
        </>
    );
};

export default NavigationBar;
