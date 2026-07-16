import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, loginWithGoogle, resendVerificationEmail, logout } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signup(email, password, fullName);
      setVerificationSent(true);
    } catch (err) {
      setError('Email already exists or invalid data');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      // Google accounts are already verified by Google — no extra step needed.
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
  };

  const handleResend = async () => {
    setResendMessage('');
    try {
      await resendVerificationEmail();
      setResendMessage('Verification email sent again — check your inbox.');
    } catch (err) {
      setResendMessage('Could not resend right now. Please try again shortly.');
    }
  };

  const handleGoToLogin = async () => {
    await logout();
    navigate('/login');
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md bg-white border-white/60 shadow-xl text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Verify your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            We've sent a verification link to <span className="font-medium text-ink">{email}</span>.
            Click it, then sign in below.
          </p>

          {resendMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-xl">
              {resendMessage}
            </div>
          )}

          <button
            onClick={handleResend}
            className="w-full bg-surface text-ink font-medium py-3 rounded-xl hover:bg-gray-100 transition-colors mb-3"
          >
            Resend verification email
          </button>

          <button
            onClick={handleGoToLogin}
            className="w-full bg-ink text-white font-medium py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
          >
            Go to Sign In
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md bg-white border-white/60 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink">Create Account</h1>
          <p className="text-gray-400 text-sm mt-2">Start your journey</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white font-medium py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
          >
            Create Account
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400 uppercase">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-ink font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-ink font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default Signup;