import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2, ArrowRight, UserPlus, CheckSquare, Square, Send } from 'lucide-react';
import { externalApi } from '../services/externalApi';
import TermsModal from './TermsModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    // --- LUỒNG QUÊN MẬT KHẨU ---
    if (isForgotPass) {
      if (!email) {
        setError('Vui lòng nhập email của bạn');
        return;
      }
      setIsLoading(true);
      try {
        const data = await externalApi.request<{ success: boolean; error?: string; message?: string }>('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        if (!data.success) throw new Error(data.error);
        setSuccessMsg(data.message || 'Mật khẩu mới đã được gửi vào email của bạn!');
        
        // Tự động quay về màn log in sau 3s
        setTimeout(() => {
          setIsForgotPass(false);
          setSuccessMsg(null);
        }, 3000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- LUỒNG ĐĂNG NHẬP / ĐĂNG KÝ ---
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    const emailPrefix = email.split('@')[0];
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Vui lòng sử dụng tài khoản @gmail.com');
      return;
    }
    if (emailPrefix.length < 8 || emailPrefix.length > 30) {
      setError('Tên Gmail phải từ 8 đến 30 ký tự');
      return;
    }
    if (!/^[a-z0-9.]+$/i.test(emailPrefix)) {
      setError('Gmail chỉ cho phép chữ cái, số và dấu chấm');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải dài ít nhất 8 ký tự');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }

    if (isRegistering && !acceptedTerms) {
      setError('Bạn phải đồng ý với Điều khoản Dịch vụ để đăng ký');
      return;
    }

    setIsLoading(true);

    try {
      const data = await externalApi.request<{ success: boolean; error?: string; message?: string; user?: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, isRegistering })
      });

      if (!data.success) {
        throw new Error(data.error || 'Lỗi đăng nhập/đăng ký');
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1d24] border border-gray-700/50 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white">
                {isForgotPass ? 'Quên Mật Khẩu' : (isRegistering ? 'Đăng Ký' : 'Đăng Nhập')}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-bold text-center">
                  {successMsg}
                </div>
              )}

              {isForgotPass && <p className="text-sm text-gray-400 mb-2">Nhập email tài khoản của bạn, hệ thống sẽ tự động tạo và gửi mật khẩu mới vào hộp thư.</p>}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#13151a] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              {!isForgotPass && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#13151a] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nhập lại mật khẩu</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#13151a] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

                  {isRegistering && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#13151a] border border-gray-700/50">
                      <button
                        type="button"
                        onClick={() => setAcceptedTerms(!acceptedTerms)}
                        className="mt-0.5 shrink-0 transition-colors"
                      >
                        {acceptedTerms ? (
                          <CheckSquare className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-500 hover:text-gray-300" />
                        )}
                      </button>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Tôi đã đọc và đồng ý với{' '}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-2"
                        >
                          Điều khoản Dịch vụ
                        </button>
                        {' '}và Chính sách Bảo mật của Alin.
                      </p>
                    </div>
                  )}
                  
                  {!isRegistering && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPass(true);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}
                </>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-6"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 (isForgotPass ? <Send className="w-5 h-5" /> : 
                 (isRegistering ? <UserPlus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />))}
                {isForgotPass ? 'Gửi Mật Khẩu' : (isRegistering ? 'Đăng Ký Ngay' : 'Đăng Nhập')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400 font-medium">
              {isForgotPass ? (
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPass(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
                >
                  Quay lại Đăng Nhập
                </button>
              ) : (
                <>
                  {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError(null);
                    }}
                    className="ml-1 text-blue-400 hover:text-blue-300 font-bold hover:underline"
                  >
                    {isRegistering ? 'Đăng Nhập' : 'Đăng Ký'}
                  </button>
                </>
              )}
            </div>
          </div>

          <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
