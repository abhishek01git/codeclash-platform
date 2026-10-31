import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  LogIn,
  UserPlus,
  Coins,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, refreshUser, googleAuth } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Sign-In state
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Use AuthContext login — it handles setToken + setUser + fetchProfile internally
      await login(username || email, password);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Use AuthContext register — it handles setToken + setUser + fetchProfile internally
      await register(username, email, password);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Username or email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In handler
  const handleGoogleSignIn = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!googleEmail.trim()) {
      setError('Please enter your Google Email');
      return;
    }

    setLoading(true);
    try {
      const selectedEmail = googleEmail.trim().toLowerCase();
      const selectedName = googleName.trim() || selectedEmail.split('@')[0];
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedName}`;

      // Use AuthContext googleAuth — it handles setToken + setUser internally
      await googleAuth({
        email: selectedEmail,
        username: selectedName,
        googleId: 'g_' + Math.random().toString(36).substring(2, 10),
        avatar
      });

      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 }
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
      setShowGooglePrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
            <Coins className="w-6 h-6 fill-amber-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {mode === 'login' ? 'Sign In to CodeClash' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login'
              ? 'Access your coin wallet, 1v1 duels, and mock interviews.'
              : 'Join now & claim 200 Welcome Bonus Coins for 1v1 Betting!'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Button */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => setShowGooglePrompt(!showGooglePrompt)}
            className="w-full py-2.5 px-4 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-gray-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-3 cursor-pointer shadow-sm"
          >
            {/* Google G logo */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Google Custom Email Sign-In Prompt */}
          {showGooglePrompt && (
            <form onSubmit={handleGoogleSignIn} className="p-3 bg-[#0d1117] border border-blue-500/30 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
              <div className="text-[11px] font-bold text-blue-400">Continue with Google Account:</div>
              <input
                type="email"
                placeholder="Enter your Google email (e.g. name@gmail.com)"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign in with Google'}
              </button>
            </form>
          )}
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#30363d] w-full" />
          <span className="bg-[#161b22] px-3 text-[11px] text-gray-500 uppercase tracking-wider">Or with email</span>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'login' ? 'bg-[#21262d] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'register' ? 'bg-[#21262d] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
            <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-extrabold">+200</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Username</label>
              <input
                type="text"
                placeholder="e.g. CodeNinja"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-400 font-semibold mb-1">
              {mode === 'login' ? 'Username or Email' : 'Email Address'}
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              placeholder={mode === 'login' ? 'demo@example.com or DemoUser' : 'you@example.com'}
              value={mode === 'login' ? (username || email) : email}
              onChange={(e) => {
                if (mode === 'login') {
                  setUsername(e.target.value);
                  setEmail(e.target.value);
                } else {
                  setEmail(e.target.value);
                }
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
          >
            {mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                {loading ? 'Signing In...' : 'Sign In'}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {loading ? 'Creating Account...' : 'Create Account (+200 Coins)'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
