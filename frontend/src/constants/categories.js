
export const CATEGORIES = [
  { id: 'essentials', name: 'Essentials', icon: '🧾' },
  { id: 'grocery', name: 'Grocery', icon: '🛒' },
  { id: 'maintainance', name: 'Maintainance', icon: '🔧' },
  { id: 'misc', name: 'Misc', icon: '✨' },
  { id: 'recharge', name: 'Recharge', icon: '📱' },
  { id: 'rent/repay', name: 'Rent/Repay', icon: '🏠' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'cash', name: 'Cash', icon: '💵' },
];

export const categoryIcon = (category) => {
  const match = CATEGORIES.find(
    (c) => c.id === String(category || '').toLowerCase()
  );
  return match ? match.icon : '✨';
};