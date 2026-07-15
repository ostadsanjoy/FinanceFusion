import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      // Firebase throws auth/user-not-found for unregistered emails; keep
      // the message generic so we don't leak which emails are registered.
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md bg-white border-white/60 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-2">We'll email you a reset link</p>
        </div>

        {sent ? (
          <div className="p-4 bg-green-50 text-green-600 text-sm rounded-xl text-center">
            If that email is registered, a reset link is on its way. Check your inbox
            (and spam folder) and follow the link to set a new password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              className="w-full bg-ink text-white font-medium py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-8">
          Remembered your password?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default ForgotPassword;