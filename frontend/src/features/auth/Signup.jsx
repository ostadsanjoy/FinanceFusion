import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, login } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Create Account
      await signup(email, password, fullName);
      // 2. Auto Login
      await login(email, password);
      // 3. Go to Dashboard
      navigate('/dashboard');
    } catch (err) {
      setError('Email already exists or invalid data');
    }
  };

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