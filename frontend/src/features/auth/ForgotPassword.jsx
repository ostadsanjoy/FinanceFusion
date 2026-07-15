import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';

const ForgotPassword = () => {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await forgotPassword(email);
      setStep('reset');
      setResendCooldown(30);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResendMessage('');
    try {
      await forgotPassword(email);
      setResendCooldown(30);
      setResendMessage('A new code has been sent.');
    } catch (err) {
      setError('Could not resend code. Please try again.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await resetPassword(email, otp, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError('Invalid or expired code');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md bg-white border-white/60 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-2">
            {step === 'request' ? "We'll send you a code" : 'Enter the code we sent you'}
          </p>
        </div>

        {success ? (
          <div className="p-4 bg-green-50 text-green-600 text-sm rounded-xl text-center">
            Password reset! Redirecting to sign in...
          </div>
        ) : step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
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
              Send Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink text-center tracking-[0.5em] focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <div className="text-center mt-3 text-sm">
                {resendMessage && (
                  <p className="text-green-600 mb-1">{resendMessage}</p>
                )}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className={
                    resendCooldown > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-accent font-medium hover:underline'
                  }
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">New Password</label>
              <input
                type="password"
                required
                className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full bg-surface/50 rounded-xl px-4 py-3 text-ink focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-ink text-white font-medium py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
            >
              Reset Password
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