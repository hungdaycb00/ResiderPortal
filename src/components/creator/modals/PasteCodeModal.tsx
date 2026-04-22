import React from 'react';
import { X, FileCode } from 'lucide-react';
import { motion } from 'motion/react';

interface PasteCodeModalProps {
  isOpen: boolean;
  pastedCode: string;
  onPastedCodeChange: (code: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function PasteCodeModal({
  isOpen, pastedCode, onPastedCodeChange, onSubmit, onClose,
}: PasteCodeModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1d24] border border-blue-500/30 rounded-3xl p-6 max-w-3xl w-full h-[80vh] shadow-2xl relative flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <FileCode className="w-5 h-5 text-blue-400" />
              Paste HTML Code
            </h3>
            <p className="text-xs text-blue-400/70 mt-1">Sử dụng cho các game thiết kế chung 1 file HTML duy nhất (như p5.js AI generated)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 relative mb-4">
          <textarea
            value={pastedCode}
            onChange={(e) => onPastedCodeChange(e.target.value)}
            placeholder="Dán toàn bộ nội dung file HTML vào đây..."
            className="w-full h-full bg-black/50 border border-gray-700/50 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none custom-scrollbar"
            style={{ whiteSpace: 'pre' }}
            spellCheck="false"
          />
          {!pastedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="text-center text-gray-600">
                <FileCode className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <div className="text-sm font-medium">Ctrl+V to paste your code</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-transparent border border-gray-700 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all"
          >
            Hủy
          </button>
          <button 
            onClick={onSubmit}
            disabled={!pastedCode.trim()}
            className="flex-1 max-w-[200px] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Áp dụng & Preview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
