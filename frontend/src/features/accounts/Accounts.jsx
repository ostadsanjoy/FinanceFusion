import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, exportTransactions } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import AddTransactionModal from '../rapid-log/AddTransactionModal';
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, Plus, Pencil, Download, Check } from 'lucide-react';
import { categoryIcon, CATEGORIES } from '../../constants/categories';

const SORT_OPTIONS = [
  { id: 'date_asc', label: 'Date: first to last' },
  { id: 'date_desc', label: 'Latest first' },
  { id: 'amount_desc', label: 'Highest amount first' },
  { id: 'amount_asc', label: 'Lowest amount first' },
  { id: 'category', label: 'By category (by date)' },
];

const SortMenu = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SORT_OPTIONS.find((o) => o.id === value) || SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 pl-4 pr-3 py-2 bg-accent text-white rounded-full shadow-lg hover:bg-ink transition-all text-sm font-medium whitespace-nowrap"
      >
        {current.label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 min-w-full bg-white rounded-2xl shadow-soft border border-muted/40 py-1.5 overflow-hidden">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-4 px-4 py-2 text-sm text-left text-ink whitespace-nowrap hover:bg-surface transition-colors"
            >
              {o.label}
              {o.id === value && <Check className="w-4 h-4 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const byDate = (a, b) => new Date(a.date) - new Date(b.date);

const categoryName = (id) => {
  const match = CATEGORIES.find((c) => c.id === String(id || '').toLowerCase());
  return match ? match.name : id || 'Uncategorized';
};

const buildRows = (transactions, mode) => {
  const list = [...transactions];
  if (mode === 'date_desc') return list.sort((a, b) => byDate(b, a)).map((t) => ({ type: 'tx', t }));
  if (mode === 'amount_desc') return list.sort((a, b) => b.amount - a.amount || byDate(a, b)).map((t) => ({ type: 'tx', t }));
  if (mode === 'amount_asc') return list.sort((a, b) => a.amount - b.amount || byDate(a, b)).map((t) => ({ type: 'tx', t }));
  if (mode === 'category') {
    const groups = {};
    list.forEach((t) => {
      const key = String(t.category || 'uncategorized').toLowerCase();
      (groups[key] = groups[key] || []).push(t);
    });
    const rows = [];
    Object.keys(groups)
      .sort((a, b) => categoryName(a).localeCompare(categoryName(b)))
      .forEach((key) => {
        const items = groups[key].sort(byDate);
        rows.push({ type: 'header', key, count: items.length, total: items.reduce((a, t) => a + t.amount, 0) });
        items.forEach((t) => rows.push({ type: 'tx', t }));
      });
    return rows;
  }
  return list.sort(byDate).map((t) => ({ type: 'tx', t }));
};

const Accounts = () => {
  const [years, setYears] = useState({});
  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exportingKey, setExportingKey] = useState(null);
  const [sortMode, setSortMode] = useState(() => {
    try {
      return localStorage.getItem('records_sort') || 'date_asc';
    } catch (e) {
      return 'date_asc';
    }
  });

  const changeSort = (value) => {
    setSortMode(value);
    try {
      localStorage.setItem('records_sort', value);
    } catch (e) {}
  };
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [targetDate, setTargetDate] = useState(null); // Used when "Adding to a specific month"

  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    setLoadError(false);

    let data;
    try {
      data = await getTransactions();
    } catch (error) {
      setLoadError(true);
      setIsLoading(false);
      return;
    }
    
    // Group By Year -> Month
    // { "2025": { total: 5000, months: { "October": { total: 2000, monthIndex: 10, transactions: [] } } } }
    const grouped = {};

    data.forEach(t => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      const monthIndex = date.getMonth() + 1;

      if (!grouped[year]) grouped[year] = { total: 0, months: {} };
      if (!grouped[year].months[month]) grouped[year].months[month] = { total: 0, monthIndex, transactions: [] };

      grouped[year].total += t.amount;
      grouped[year].months[month].total += t.amount;
      grouped[year].months[month].transactions.push(t);
    });

    setYears(grouped);
    // Auto-expand current year
    setExpandedYear(new Date().getFullYear().toString());
    setIsLoading(false);
  };

  const handleExportMonth = async (e, year, monthIndex, monthKey) => {
    e.stopPropagation();
    setExportingKey(monthKey);
    try {
      await exportTransactions({ year: Number(year), month: monthIndex });
    } catch (error) {
      alert('Export failed. Please try again.');
    } finally {
      setExportingKey(null);
    }
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
        {loadError ? (
          <div className="flex flex-col items-center gap-3 mt-10">
            <p className="text-red-500 text-center">
              Couldn't load your records. Check your connection and try again.
            </p>
            <button
              onClick={fetchHistory}
              className="text-sm font-semibold text-accent underline"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-gray-400 text-center mt-10">Loading records...</p>
        ) : Object.keys(years).length === 0 ? (
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
                        {Object.entries(yearData.months).sort((a, b) => a[1].monthIndex - b[1].monthIndex).map(([month, monthData]) => {
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
                                            <button
                                                onClick={(e) => handleExportMonth(e, year, monthData.monthIndex, `${year}-${month}`)}
                                                disabled={exportingKey === `${year}-${month}`}
                                                className="p-1.5 rounded-full hover:bg-surface text-gray-400 hover:text-accent transition-colors disabled:opacity-50"
                                                title={`Export ${month} ${year}`}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            {isMonthOpen ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                                        </div>
                                    </div>

                                    {/* Transactions List (Drill Down) */}
                                    {isMonthOpen && (
                                        <div className="mt-6 space-y-3 pt-4 border-t border-muted/20 animate-in fade-in">
                                            <div className="flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-xs text-gray-400">{monthData.transactions.length} transactions</span>
                                                <SortMenu value={sortMode} onChange={changeSort} />
                                            </div>
                                            {buildRows(monthData.transactions, sortMode).map((row) => row.type === 'header' ? (
                                                <div key={`h-${row.key}`} className="flex items-center justify-between pt-3 pb-1 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{categoryIcon(row.key)}</span>
                                                        <span className="text-sm font-semibold">{categoryName(row.key)}</span>
                                                        <span className="text-[11px] text-gray-400">{row.count}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-500">₹{row.total.toLocaleString()}</span>
                                                </div>
                                            ) : (() => { const t = row.t; return (
                                                <div 
                                                    key={t.id} 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                                                    className="flex justify-between items-center p-3 bg-white rounded-xl cursor-pointer hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">
                                                            {categoryIcon(t.category)}
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
                                            ); })())}
                                            
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