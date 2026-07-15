import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, PieChart, Shield } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-accent selection:text-white">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Finance Fusion</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-medium hover:text-accent transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 mt-16 md:mt-24 max-w-4xl mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <span className="px-3 py-1 rounded-full bg-surface border border-muted/50 text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 inline-block">
              Financial Intelligence v1.0
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-ink to-gray-500 bg-clip-text text-transparent pb-2">
                Master your money <br /> with elegance.
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Track expenses, set monthly budgets, and analyze your spending habits with a privacy-first, beautiful dashboard.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-ink text-white rounded-full font-medium text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <GlassCard className="bg-white/40 p-8 text-left hover:bg-white/80 transition-colors">
            <div className="p-3 bg-surface rounded-xl w-fit mb-4">
              <Wallet className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Tracking</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Log expenses in seconds. Edit history and organize categories seamlessly.
            </p>
          </GlassCard>

          <GlassCard className="bg-white/40 p-8 text-left hover:bg-white/80 transition-colors">
            <div className="p-3 bg-surface rounded-xl w-fit mb-4">
              <PieChart className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Visual Analytics</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Beautiful charts that compare your monthly spending to help you save.
            </p>
          </GlassCard>

          <GlassCard className="bg-white/40 p-8 text-left hover:bg-white/80 transition-colors">
            <div className="p-3 bg-surface rounded-xl w-fit mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Budget Control</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Set strict monthly limits. We warn you before you overspend.
            </p>
          </GlassCard>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-24 pb-8 text-center text-sm text-gray-300">
        <p>© 2026 Finance Fusion. Crafted by Sanjoy.</p>
      </footer>
    </div>
  );
};

export default LandingPage;