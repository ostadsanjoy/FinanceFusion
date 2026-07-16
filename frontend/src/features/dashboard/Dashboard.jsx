import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import { Plus, Wallet, History, LogOut, PieChart as PieIcon, BarChart3, Target, Upload, Download } from 'lucide-react';
import AddTransactionModal from '../rapid-log/AddTransactionModal';
import { getTransactions, createTransaction, logout, importTransactions, exportTransactions } from '../../services/api';
import { categoryIcon } from '../../constants/categories';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]); 
  const [totalSpent, setTotalSpent] = useState(0);
  const [chartMode, setChartMode] = useState('pie'); 
  const [comparisonData, setComparisonData] = useState([]); 
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const allData = await getTransactions();
    const now = new Date();
    
    // 1. Filter Current Month
    const currentMonthData = allData.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === now.getMonth() && 
             tDate.getFullYear() === now.getFullYear();
    });

    setTransactions(currentMonthData);
    const total = currentMonthData.reduce((sum, item) => sum + item.amount, 0);
    setTotalSpent(total);

    // 2. Prepare Comparison Data
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    
    const lastMonthData = allData.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === lastMonthDate.getMonth() && 
             tDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const groupByCategory = (data) => {
      return data.reduce((acc, curr) => {
        const cat = curr.category.charAt(0).toUpperCase() + curr.category.slice(1).toLowerCase();
        acc[cat] = (acc[cat] || 0) + curr.amount;
        return acc;
      }, {});
    };

    const thisMonthGrouped = groupByCategory(currentMonthData);
    const lastMonthGrouped = groupByCategory(lastMonthData);

    const allCategories = new Set([
      ...Object.keys(thisMonthGrouped), 
      ...Object.keys(lastMonthGrouped)
    ]);

    const combinedData = Array.from(allCategories).map(cat => ({
      name: cat,
      "This Month": thisMonthGrouped[cat] || 0,
      "Last Month": lastMonthGrouped[cat] || 0,
    }));

    setComparisonData(combinedData);
  };

  const handleAddTransaction = async (transactionData) => {
    try {
      await createTransaction(transactionData);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert("Failed to save transaction.");
    }
  };

  // --- UPDATED LOGOUT FUNCTION ---
  const handleLogout = async () => {
    await logout();
    navigate('/'); // <--- Redirects to Landing Page now
  };

  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');
    try {
      const result = await importTransactions(file);
      setImportMessage(
        `Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}` +
        (result.skipped ? ` (${result.skipped} row${result.skipped === 1 ? '' : 's'} skipped — couldn't read date/amount)` : '.')
      );
      await fetchData();
    } catch (error) {
      setImportMessage(error?.response?.data?.detail || 'Import failed. Check the file has DATE, AMOUNT, RECEIVER, PURPOSE columns.');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // allow re-selecting the same file later
    }
  };

  const handleExport = async () => {
    try {
      await exportTransactions();
    } catch (error) {
      alert('Export failed. Please try again.');
    }
  };

  const pieData = transactions.reduce((acc, curr) => {
    const catName = curr.category.charAt(0).toUpperCase() + curr.category.slice(1).toLowerCase();
    const existing = acc.find(item => item.name === catName);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: catName, value: curr.amount });
    }
    return acc;
  }, []);
  
  const COLORS = ['#C9B59C', '#D9CFC7', '#EFE9E3', '#A89F91', '#6B7280'];

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8">
      
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Financial Health</h1>
          <p className="text-accent font-medium mt-1">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Overview
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xlsm,.pdf"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-muted rounded-full shadow-sm hover:bg-surface transition-all disabled:opacity-50"
              title="Import spends from .xlsx or .pdf"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span className="hidden md:inline text-sm font-medium">
                {isImporting ? 'Importing...' : 'Import'}
              </span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-muted rounded-full shadow-sm hover:bg-surface transition-all"
              title="Download spends as .xlsx"
            >
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="hidden md:inline text-sm font-medium">Export</span>
            </button>

            <button 
              onClick={() => navigate('/accounts')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-muted rounded-full shadow-sm hover:bg-surface transition-all"
            >
              <History className="w-4 h-4 text-gray-500" />
              <span className="hidden md:inline text-sm font-medium">History</span>
            </button>

            <button 
              onClick={() => navigate('/budget')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-muted rounded-full shadow-sm hover:bg-surface transition-all"
            >
              <Target className="w-4 h-4 text-gray-500" />
              <span className="hidden md:inline text-sm font-medium">Budget</span>
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 bg-red-50 border border-red-100 rounded-full shadow-sm hover:bg-red-100 transition-all text-red-500"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {importMessage && (
        <div className="max-w-5xl mx-auto -mt-6 mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-xl text-center">
          {importMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <GlassCard className="bg-white">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-surface rounded-xl">
                  <Wallet className="w-6 h-6 text-accent" />
                </div>
              </div>
              <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-1">Spent This Month</h3>
              <div className="text-4xl font-light tracking-tight">₹{totalSpent.toLocaleString()}</div>
            </GlassCard>

            <GlassCard 
              onClick={() => setIsModalOpen(true)}
              className="bg-surface border-muted flex flex-col justify-center items-center cursor-pointer group hover:scale-[1.02] transition-transform"
            >
               <div className="h-14 w-14 bg-accent rounded-full flex items-center justify-center text-white shadow-lg mb-3 group-hover:bg-ink transition-colors">
                 <Plus className="w-8 h-8" />
               </div>
               <span className="font-medium text-lg text-ink">Rapid Log Cash</span>
            </GlassCard>
          </div>

          <GlassCard>
            <h3 className="text-lg font-medium mb-4">This Month's Spending Activity</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {transactions.length === 0 ? (
                <p className="text-gray-400 text-sm">No transactions this month.</p>
              ) : (
                transactions.slice().reverse().map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-muted/30 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-surface rounded-full flex items-center justify-center text-lg">
                        {categoryIcon(t.category)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{t.description}</p>
                        <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="font-medium text-ink">- ₹{t.amount}</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="h-full flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Breakdown</h3>
                
                <div className="flex bg-surface rounded-lg p-1">
                    <button 
                        onClick={() => setChartMode('pie')}
                        className={`p-1.5 rounded-md transition-all ${chartMode === 'pie' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                    >
                        <PieIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setChartMode('bar')}
                        className={`p-1.5 rounded-md transition-all ${chartMode === 'bar' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
              {chartMode === 'pie' ? (
                  pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No data this month
                    </div>
                  )
              ) : (
                  comparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                width={70}
                                tick={{fontSize: 12, fill: '#666'}}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Last Month" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={12} />
                            <Bar dataKey="This Month" fill="#C9B59C" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
                      Add records to previous months to see comparisons
                    </div>
                  )
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleAddTransaction}
      />
    </div>
  );
};

export default Dashboard;