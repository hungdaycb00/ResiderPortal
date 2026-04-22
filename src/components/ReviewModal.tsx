import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { externalApi } from '../services/externalApi';

export interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviewGameId: string | null;
    gameStartTime: number;
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
    isOpen,
    onClose,
    reviewGameId,
    gameStartTime,
    showNotification
}) => {
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setReviewRating(0);
            setReviewHover(0);
            setReviewComment('');
            setReviewSubmitting(false);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#1a1d24] border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                    >
                        <h3 className="text-white font-bold text-lg text-center mb-1">Rate Game</h3>
                        <p className="text-gray-500 text-[11px] text-center mb-4">Your feedback helps improve game quality</p>

                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setReviewHover(star)}
                                    onMouseLeave={() => setReviewHover(0)}
                                    onClick={() => setReviewRating(star)}
                                    className="transition-transform hover:scale-125"
                                >
                                    <Star
                                        className={`w-8 h-8 transition-colors ${star <= (reviewHover || reviewRating)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-600'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Comment */}
                        <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Enter your feedback for this game (optional)..."
                            className="w-full bg-[#252830] border border-gray-700 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20 mb-4"
                        />

                        {/* Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-[#252830] text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                disabled={reviewRating === 0 || reviewSubmitting}
                                onClick={async () => {
                                    if (reviewRating === 0 || !reviewGameId) return;
                                    setReviewSubmitting(true);
                                    try {
                                        await externalApi.request(`/api/games/${reviewGameId}/review`, {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                rating: reviewRating,
                                                comment: reviewComment || null,
                                                playDuration: Math.floor((Date.now() - gameStartTime) / 1000)
                                            })
                                        });
                                        localStorage.setItem(`rated_game_${reviewGameId}`, 'true');
                                        showNotification('Thank you for your rating! ⭐', 'success');
                                    } catch (err: any) {
                                        showNotification(err.message || 'Error submitting rating', 'error');
                                    }
                                    setReviewSubmitting(false);
                                    onClose();
                                }}

                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${reviewRating > 0
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {reviewSubmitting ? 'Sending...' : 'Submit Rating'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReviewModal;
