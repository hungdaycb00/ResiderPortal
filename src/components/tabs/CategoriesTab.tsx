import React from 'react';
import { Grid, Sword, Shield, Brain, Zap, Trophy, Users } from 'lucide-react';
import { games } from '../../constants';

export interface CategoriesTabProps {
    fetchedGames: any[];
    setActiveTab: (tab: any) => void;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ fetchedGames, setActiveTab }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-2 uppercase tracking-tighter italic">
                <Grid className="w-8 h-8 text-blue-400" />
                Explore Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { name: 'Action', icon: <Sword className="w-8 h-8" />, color: 'from-orange-500 to-red-600', id: 'action' },
                    { name: 'Strategy', icon: <Shield className="w-8 h-8" />, color: 'from-blue-500 to-indigo-600', id: 'strategy' },
                    { name: 'Puzzle', icon: <Brain className="w-8 h-8" />, color: 'from-purple-500 to-pink-600', id: 'puzzle' },
                    { name: 'Racing', icon: <Zap className="w-8 h-8" />, color: 'from-yellow-500 to-orange-600', id: 'racing' },
                    { name: 'RPG', icon: <Trophy className="w-8 h-8" />, color: 'from-emerald-500 to-teal-600', id: 'rpg' },
                    { name: 'Multiplayer', icon: <Users className="w-8 h-8" />, color: 'from-cyan-500 to-blue-600', id: 'multiplayer' },
                ].map((cat) => {
                    const keywordsMap: any = {
                        puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
                        action: ['action', 'sword', 'combat', 'battle'],
                        strategy: ['strategy', 'build', 'defense']
                    };
                    const catId = cat.id;
                    const catGames = (fetchedGames || []).concat(games).filter(g =>
                        ((g.category || '').toLowerCase().includes(catId)) ||
                        (keywordsMap[catId] && keywordsMap[catId].some((k: string) => (g.title || '').toLowerCase().includes(k)))
                    );
                    const count = catGames.length;
                    const displayGames = catGames.slice(0, 3);

                    return (
                        <div
                            key={cat.id}
                            onClick={() => {
                                setActiveTab('home');
                                setTimeout(() => {
                                    document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }}
                            className="group cursor-pointer"
                        >
                            <div className={`aspect-square rounded-3xl bg-gradient-to-br ${cat.color} p-6 flex flex-col items-center justify-center transition-all group-hover:scale-[1.03] group-active:scale-95 shadow-2xl relative overflow-hidden`}>
                                {/* Category Background Grid */}
                                {displayGames.length > 0 && (
                                    <div className={`absolute inset-0 grid gap-0.5 opacity-40 group-hover:opacity-60 transition-opacity category-grid-${displayGames.length}`}>
                                        {displayGames.map((g, i) => (
                                            <img key={i} src={g.image} className="w-full h-full object-cover" alt="" />
                                        ))}
                                    </div>
                                )}

                                {/* Glass Overlay */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] group-hover:bg-black/20 transition-colors" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-md shadow-lg">{cat.icon}</div>
                                    <h3 className="font-black text-xl uppercase tracking-tighter italic">{cat.name}</h3>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{count} Games</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategoriesTab;
