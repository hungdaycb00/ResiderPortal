import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useLooterState, useLooterActions } from '../LooterGameContext';

const DiscardModal: React.FC = () => {
    const { showDiscardModal, state } = useLooterState();
    const { setShowDiscardModal, confirmDiscard } = useLooterActions();

    if (!showDiscardModal) return null;

    const floatingCount = state.inventory.filter(i => i.gridX < 0).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-gradient-to-b from-[#1a0a0a] to-[#0d0303] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-red-900/30"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                        <Trash2 className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-black text-red-200">Vật phẩm chưa sắp xếp!</h2>
                    <p className="text-sm text-red-300/60 mt-2">
                        Bạn có <span className="text-red-400 font-bold">{floatingCount}</span> vật phẩm chưa đặt vào balo. 
                        Bạn cần sắp xếp chúng hoặc vứt bỏ để tiếp tục di chuyển.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={async () => {
                            await confirmDiscard();
                            setShowDiscardModal(false);
                        }}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" />
                        VỨT BỎ TẤT CẢ
                    </button>
                    
                    <button
                        onClick={() => setShowDiscardModal(false)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl font-bold transition-all border border-white/10"
                    >
                        ĐỂ TÔI TỰ SẮP XẾP
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default DiscardModal;
