import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md bg-white border-white/60 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink">Sign In</h1>
          <p className="text-gray-400 text-sm mt-2">Access your financial intelligence</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase text-gray-400">Password</label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
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
            className="w-full bg-ink text-white font-medium py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent font-medium hover:underline">
            Create one
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default Login;