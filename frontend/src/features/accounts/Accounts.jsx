import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import AddTransactionModal from '../rapid-log/AddTransactionModal';
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react';

const Accounts = () => {
  const [years, setYears] = useState({});
  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [targetDate, setTargetDate] = useState(null); // Used when "Adding to a specific month"

  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const data = await getTransactions();
    
    // Group By Year -> Month
    // { "2025": { total: 5000, months: { "October": { total: 2000, transactions: [] } } } }
    const grouped = {};

    data.forEach(t => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });

      if (!grouped[year]) grouped[year] = { total: 0, months: {} };
      if (!grouped[year].months[month]) grouped[year].months[month] = { total: 0, transactions: [] };

      grouped[year].total += t.amount;
      grouped[year].months[month].total += t.amount;
      grouped[year].months[month].transactions.push(t);
    });

    setYears(grouped);
    // Auto-expand current year
    setExpandedYear(new Date().getFullYear().toString());
  };

  // --- Handlers ---

  const handleOpenAdd = (dateOverride = null) => {
    setEditingItem(null); // Clear editing state
    // If we clicked "Add" on a specific month card, pre-set the date for that month
    if (dateOverride) {
        // Just a way to signal the modal to default to this date
        // Note: The modal expects an object for edit, or we can logic this inside modal.
        // For simplicity, we will manually inject a "dummy" item with just the date if needed
        // OR simply let user pick date in modal.
        // Let's rely on the user picking the date in the modal for now, simpler.
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (transaction) => {
    setEditingItem(transaction);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await updateTransaction(editingItem.id, data);
      } else {
        await createTransaction(data);
      }
      await fetchHistory();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      alert("Error saving transaction");
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    if (window.confirm("Are you sure you want to delete this?")) {
      try {
        await deleteTransaction(editingItem.id);
        await fetchHistory();
        setIsModalOpen(false);
        setEditingItem(null);
      } catch (e) {
        alert("Error deleting");
      }
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-surface rounded-full hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-ink" />
          </button>
          <h1 className="text-3xl font-semibold tracking-tight">Records</h1>
        </div>
        
        {/* Global Add Button (Add Past Months) */}
        <button 
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full shadow-lg hover:bg-ink transition-all"
        >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Record</span>
        </button>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {Object.keys(years).length === 0 ? (
           <p className="text-gray-400 text-center mt-10">No records found. Click "Add Record" to start.</p>
        ) : (
          // Sort years descending
          Object.entries(years).sort((a,b) => b[0] - a[0]).map(([year, yearData]) => (
            <div key={year} className="space-y-4">
                
                {/* Year Header Card */}
                <div 
                    onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                    className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-soft cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-surface rounded-xl">
                            <Calendar className="w-6 h-6 text-ink" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{year}</h2>
                            <p className="text-sm text-gray-400">Total Annual Spend</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-light">₹{yearData.total.toLocaleString()}</span>
                        {expandedYear === year ? <ChevronDown className="text-gray-400"/> : <ChevronRight className="text-gray-400"/>}
                    </div>
                </div>

                {/* Months List (Collapsible) */}
                {expandedYear === year && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 md:pl-4 animate-in slide-in-from-top-4 duration-300">
                        {Object.entries(yearData.months).map(([month, monthData]) => {
                             const isMonthOpen = expandedMonth === `${year}-${month}`;
                             return (
                                <GlassCard 
                                    key={month} 
                                    className={`bg-surface/50 border-transparent transition-all ${isMonthOpen ? 'col-span-1 md:col-span-2 bg-white ring-1 ring-accent/30' : 'hover:bg-white'}`}
                                >
                                    {/* Month Header */}
                                    <div 
                                        onClick={() => setExpandedMonth(isMonthOpen ? null : `${year}-${month}`)}
                                        className="flex justify-between items-center cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-accent"></div>
                                            <h3 className="text-lg font-semibold">{month}</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">₹{monthData.total.toLocaleString()}</span>
                                            {isMonthOpen ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                                        </div>
                                    </div>

                                    {/* Transactions List (Drill Down) */}
                                    {isMonthOpen && (
                                        <div className="mt-6 space-y-3 pt-4 border-t border-muted/20 animate-in fade-in">
                                            {monthData.transactions.map((t) => (
                                                <div 
                                                    key={t.id} 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                                                    className="flex justify-between items-center p-3 bg-white rounded-xl cursor-pointer hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">
                                                            {t.category === 'Food' ? '🍔' : t.category === 'Travel' ? '🚕' : t.category === 'Bills' ? '💡' : '✨'}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">{t.description}</span>
                                                            <span className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-ink">- ₹{t.amount}</span>
                                                        <Pencil className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors" />
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add to specific month button shortcut (optional visual cue) */}
                                            <div className="text-center pt-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenAdd(); }}
                                                    className="text-xs text-accent font-medium hover:underline"
                                                >
                                                    + Add another entry to history
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                             );
                        })}
                    </div>
                )}
            </div>
          ))
        )}
      </div>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSave}
        initialData={editingItem}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Accounts;