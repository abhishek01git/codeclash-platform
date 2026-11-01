import React, { useEffect, useRef, useState } from 'react';
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
  const { login, register, verifySignupOtp, refreshUser, googleAuth } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('details');
  const [otp, setOtp] = useState('');

  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      setRegistrationStep('otp');
    } catch (err) {
      setError(err.message || 'Registration failed. Username or email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifySignupOtp(email, otp);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not verify that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await googleAuth(credential);
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
    }
  };

  useEffect(() => {
    if (!isOpen || !googleClientId || !googleButtonRef.current) return undefined;
    const renderGoogleButton = () => {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => handleGoogleSignIn(credential),
        auto_select: false
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 352,
        text: 'continue_with'
      });
    };
    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return undefined;
    }
    const existing = document.querySelector('script[data-google-identity]');
    const script = existing || document.createElement('script');
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', renderGoogleButton, { once: true });
    return () => script.removeEventListener('load', renderGoogleButton);
  }, [isOpen, googleClientId]);

  if (!isOpen) return null;

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
            {registrationStep === 'otp' ? 'Verify Your Email' : mode === 'login' ? 'Sign In to CodeClash' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {registrationStep === 'otp'
              ? `We sent a six-digit code to ${email}.`
              : mode === 'login'
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

        {registrationStep !== 'otp' && <>
        {/* Google Identity Services gives us a signed credential; no typed email is trusted. */}
        <div className="space-y-3 mb-5">
          {googleClientId ? (
            <div ref={googleButtonRef} className="min-h-10 flex justify-center" />
          ) : (
            <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-center text-[11px] text-blue-300">Google sign-in will be available after VITE_GOOGLE_CLIENT_ID is configured.</p>
          )}
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#30363d] w-full" />
          <span className="bg-[#161b22] px-3 text-[11px] text-gray-500 uppercase tracking-wider">Or with email</span>
        </div>
        </>}

        {/* Tab Selector */}
        {registrationStep !== 'otp' && <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setRegistrationStep('details'); }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'login' ? 'bg-[#21262d] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setRegistrationStep('details'); }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'register' ? 'bg-[#21262d] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
            <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-extrabold">+200</span>
          </button>
        </div>
        }

        {/* Form */}
        {registrationStep === 'otp' ? (
          <form onSubmit={handleOtpSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Six-digit verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-3 text-center text-lg tracking-[0.35em] text-white focus:outline-none focus:border-amber-500"
                required
                maxLength={6}
              />
            </div>
            <button type="submit" disabled={loading || otp.length !== 6} className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs rounded-xl transition shadow-lg disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>
            <button type="button" onClick={() => { setRegistrationStep('details'); setOtp(''); setError(''); }} className="w-full text-xs text-gray-400 hover:text-white">Use a different email</button>
          </form>
        ) : (
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
              placeholder={mode === 'login' ? 'username or email' : 'you@example.com'}
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
        )}
      </div>
    </div>
  );
}
