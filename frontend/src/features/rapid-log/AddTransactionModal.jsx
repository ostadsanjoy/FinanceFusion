import React, { useState, useEffect } from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const categories = [
  { id: 'food', name: 'Food', icon: '🍔' },
  { id: 'travel', name: 'Travel', icon: '🚕' },
  { id: 'bills', name: 'Bills', icon: '💡' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'misc', name: 'Misc', icon: '✨' },
];

const AddTransactionModal = ({ isOpen, onClose, onSubmit, initialData = null, onDelete }) => {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
  const [description, setDescription] = useState('');
  // New: Date State for custom dates
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // If initialData exists (Edit Mode), pre-fill the form
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount);
      setSelectedCategory(initialData.category.toLowerCase()); // Ensure case match
      setDescription(initialData.description);
      setCustomDate(new Date(initialData.date).toISOString().split('T')[0]);
    } else {
      // Reset for "Add Mode"
      setAmount('');
      setSelectedCategory(categories[0].id);
      setDescription('');
      setCustomDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    
    onSubmit({
      amount: parseFloat(amount),
      category: categories.find(c => c.id === selectedCategory)?.name || 'Misc',
      description: description || 'Expense',
      source_type: 'CASH',
      date: new Date(customDate).toISOString() // Use selected date
    });
    
    // Only reset if adding new, keep data if editing failed (simplified here)
    if (!initialData) {
      setAmount('');
      setDescription('');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-canvas w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/40 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-muted/30">
          <h2 className="text-xl font-semibold text-ink">
            {initialData ? 'Edit Entry' : 'New Entry'}
          </h2>
          <div className="flex gap-2">
            {initialData && (
              <button 
                onClick={onDelete}
                className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                title="Delete Transaction"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Amount Input */}
          <div className="flex flex-col items-center">
             <label className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-2">Amount</label>
             <div className="relative">
               <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl text-gray-400">₹</span>
               <input 
                 type="number" 
                 autoFocus={!initialData}
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 className="w-full text-center text-5xl font-light bg-transparent border-none outline-none text-ink placeholder-gray-200"
                 placeholder="0"
               />
             </div>
          </div>

          {/* Date Picker (New) */}
          <div className="bg-surface/50 p-3 rounded-xl flex justify-between items-center">
             <label className="text-xs font-bold uppercase text-gray-400">Date</label>
             <input 
               type="date" 
               value={customDate}
               onChange={(e) => setCustomDate(e.target.value)}
               className="bg-transparent font-medium text-ink outline-none text-right"
             />
          </div>

          {/* Category Selector */}
          <div>
            <label className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-3 block">Category</label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={twMerge(
                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap",
                    selectedCategory === cat.id 
                      ? "bg-ink text-white border-ink shadow-lg scale-105" 
                      : "bg-surface text-gray-600 border-transparent hover:bg-white"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <input 
               type="text" 
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Add a note (e.g. 'Lunch')" 
               className="w-full bg-surface/50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-accent/50 outline-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={!amount}
            className="w-full bg-accent hover:bg-[#BFA685] text-white font-medium py-4 rounded-xl shadow-soft flex justify-center items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            <span>{initialData ? 'Update Entry' : 'Log Expense'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;