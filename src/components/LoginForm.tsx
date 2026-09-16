import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, LogIn, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { loginAdmin } from '../lib/api.ts';
import { AuthResponse } from '../types.ts';

interface LoginFormProps {
  onSuccess: (auth: AuthResponse) => void;
  onBackToHome: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your admin email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const auth = await loginAdmin(trimmedEmail, password);
      onSuccess(auth);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (type: 'default' | 'simple' = 'default') => {
    if (type === 'simple') {
      setEmail('admin');
      setPassword('admin');
    } else {
      setEmail('admin@example.com');
      setPassword('Admin@123456');
    }
    setError(null);
  };

  return (
    <div id="login-container" className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-200/80 dark:border-neutral-800 p-8"
      >
        <button
          id="login-back-btn"
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-xs border border-indigo-100 dark:border-indigo-900/50">
            <Lock className="w-7 h-7" />
          </div>
          <h1 id="login-heading" className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Admin Portal
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to manage Web Apps and server routes
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            id="login-error-alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider"
            >
              Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com or admin"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Admin</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Seed Credentials Hint Box */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-neutral-800/80 border border-indigo-100/80 dark:border-neutral-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Admin Credentials (.env)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('simple')}
                  className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition-colors cursor-pointer"
                  title="Quick fill admin / admin"
                >
                  admin / admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('default')}
                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                  title="Quick fill default credentials"
                >
                  Auto-fill
                </button>
              </div>
            </div>
            <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span>Login: <strong className="text-neutral-900 dark:text-neutral-100">admin</strong> / <strong className="text-neutral-900 dark:text-neutral-100">admin</strong></span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">.env</span>
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans mt-1">
                You can customize <code className="text-indigo-600 dark:text-indigo-400">ADMIN_ID</code> &amp; <code className="text-indigo-600 dark:text-indigo-400">ADMIN_PASSWORD</code> in <code className="text-neutral-800 dark:text-neutral-200">.env</code>.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
