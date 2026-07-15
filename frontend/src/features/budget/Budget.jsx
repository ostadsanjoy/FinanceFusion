import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getBudgets, setBudget } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Misc'];

const Budget = () => {
  const [budgets, setBudgets] = useState({});
  const [spending, setSpending] = useState({});
  const [editMode, setEditMode] = useState(null);
  const [tempAmount, setTempAmount] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [txns, budgetList] = await Promise.all([getTransactions(), getBudgets()]);

    const now = new Date();
    const currentTxns = txns.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const spendMap = {};
    CATEGORIES.forEach(cat => spendMap[cat] = 0);
    
    currentTxns.forEach(t => {
      const cat = CATEGORIES.find(c => c.toLowerCase() === t.category.toLowerCase()) || 'Misc';
      spendMap[cat] += t.amount;
    });
    setSpending(spendMap);

    const budgetMap = {};
    budgetList.forEach(b => budgetMap[b.category] = b.amount);
    setBudgets(budgetMap);
  };

  const handleSaveBudget = async (category) => {
    if (!tempAmount) return;
    await setBudget(category, parseFloat(tempAmount));
    await fetchData();
    setEditMode(null);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-surface rounded-full hover:bg-white transition-colors">
          <ArrowLeft className="w-6 h-6 text-ink" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Monthly Budgets</h1>
          <p className="text-accent text-sm">Set limits to track your health</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {CATEGORIES.map(category => {
          const limit = budgets[category] || 0;
          const spent = spending[category] || 0;
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;
          const isOver = spent > limit && limit > 0;
          const remaining = limit - spent;

          return (
            <GlassCard key={category} className={`bg-white ${isOver ? 'border-red-200 ring-2 ring-red-100' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {category === 'Food' ? '🍔' : category === 'Travel' ? '🚕' : category === 'Bills' ? '💡' : category === 'Shopping' ? '🛍️' : '✨'}
                  </span>
                  <h3 className="font-semibold text-lg">{category}</h3>
                </div>
                {isOver && <AlertCircle className="w-5 h-5 text-red-500" />}
              </div>
              <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-accent'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-gray-500">Spent: <span className="text-ink font-medium">₹{spent.toLocaleString()}</span></span>
                <span className={`font-medium ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {remaining < 0 ? `Over: ₹${Math.abs(remaining).toLocaleString()}` : `Left: ₹${remaining.toLocaleString()}`}
                </span>
              </div>
              {editMode === category ? (
                <div className="flex gap-2">
                  <input type="number" placeholder="Limit" className="w-full bg-surface/50 rounded-lg px-3 py-2 text-sm outline-none border focus:border-accent" autoFocus onChange={(e) => setTempAmount(e.target.value)} />
                  <button onClick={() => handleSaveBudget(category)} className="bg-ink text-white p-2 rounded-lg"><Save className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => { setEditMode(category); setTempAmount(limit); }} className="w-full py-2 text-sm text-gray-400 hover:text-accent border border-dashed border-gray-300 rounded-lg hover:border-accent transition-colors">
                  {limit === 0 ? '+ Set Budget' : `Limit: ₹${limit.toLocaleString()}`}
                </button>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
export default Budget;