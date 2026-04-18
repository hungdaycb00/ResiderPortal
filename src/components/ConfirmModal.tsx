import { Trash2 } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  title: string,
  message: string
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1d24] border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400">{message}</p>
        </div>
        <div className="p-4 bg-[#252830]/50 border-t border-gray-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
