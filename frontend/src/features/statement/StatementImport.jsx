import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  X,
  FileUp,
  Lock,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Layers,
  Undo2,
  Search,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { CATEGORIES, categoryIcon } from '../../constants/categories';
import { inspectStatement, saveTransactionsBulk } from '../../services/api';

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
  });

const handled = (e) => Boolean(e && (e.category || e.skipped));

const STEPS = ['Upload', 'Months', 'Sort', 'Group', 'Save'];

const StepBar = ({ step }) => (
  <div className="flex items-center gap-2 px-6 pt-5">
    {STEPS.map((label, i) => (
      <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
        <div
          className={twMerge(
            'flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0',
            i < step ? 'bg-ink text-white' : i === step ? 'bg-accent text-white' : 'bg-surface text-gray-400'
          )}
        >
          {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
        </div>
        <span className={twMerge('hidden sm:inline text-xs font-medium', i === step ? 'text-ink' : 'text-gray-400')}>
          {label}
        </span>
        {i < STEPS.length - 1 && <div className="flex-1 h-px bg-muted/60" />}
      </div>
    ))}
  </div>
);

const PrimaryButton = ({ className, ...props }) => (
  <button
    {...props}
    className={twMerge(
      'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ink text-white text-sm font-semibold shadow-soft hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed',
      className
    )}
  />
);

const GhostButton = ({ className, ...props }) => (
  <button
    {...props}
    className={twMerge(
      'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white border border-muted text-sm font-medium text-ink hover:bg-surface transition-all disabled:opacity-40',
      className
    )}
  />
);

const UploadStep = ({ onLoaded }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const run = useCallback(
    async (target, pass) => {
      setLoading(true);
      setError('');
      try {
        const data = await inspectStatement(target, pass);
        onLoaded(data, target.name);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        const code = detail?.code;
        if (code === 'PASSWORD_REQUIRED' || code === 'PASSWORD_INCORRECT') {
          setNeedsPassword(true);
          setError(code === 'PASSWORD_INCORRECT' ? detail.message : '');
        } else {
          setNeedsPassword(false);
          setError(detail?.message || 'Something went wrong while reading the statement.');
        }
      } finally {
        setLoading(false);
      }
    },
    [onLoaded]
  );

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setPassword('');
    setNeedsPassword(false);
    setError('');
    run(f, '');
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-ink">Import a bank statement</h3>
        <p className="text-gray-500 mt-1 text-sm">
          Only money that left your account is imported. Deposits and credits are ignored.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xlsm,.csv"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={twMerge(
          'flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed py-12 px-6 transition-all',
          dragging ? 'border-accent bg-surface' : 'border-muted bg-white/60 hover:bg-white'
        )}
      >
        {loading ? (
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        ) : (
          <FileUp className="w-8 h-8 text-accent" />
        )}
        <div className="text-center">
          <p className="font-medium text-ink">{file ? file.name : 'Choose your statement or drop it here'}</p>
          <p className="text-xs text-gray-500 mt-1">PDF, XLSX or CSV from any bank</p>
        </div>
      </button>

      {needsPassword && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (file && password) run(file, password);
          }}
          className="flex flex-col gap-3 bg-white rounded-3xl border border-muted/60 p-5"
        >
          <div className="flex items-center gap-2 text-ink font-medium">
            <Lock className="w-4 h-4 text-accent" />
            This statement is password protected
          </div>
          <p className="text-xs text-gray-500">
            Banks usually set it to something like your date of birth or customer ID. The password is used once to
            read the file and is never stored.
          </p>
          <div className="flex gap-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PDF password"
              className="flex-1 px-4 py-3 rounded-full bg-canvas border border-muted outline-none focus:border-accent text-sm"
            />
            <PrimaryButton type="submit" disabled={!password || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
            </PrimaryButton>
          </div>
        </form>
      )}

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">{error}</div>}
    </div>
  );
};

const MonthsStep = ({ data, fileName, selected, setSelected, onBack, onNext }) => {
  const all = data.months.map((m) => m.key);
  const chosen = data.months.filter((m) => selected.includes(m.key));
  const count = chosen.reduce((a, m) => a + m.count, 0);
  const total = chosen.reduce((a, m) => a + m.total, 0);

  const toggle = (key) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-ink">Which months do you want?</h3>
        <p className="text-gray-500 mt-1 text-sm">
          {data.bank ? `${data.bank} · ` : ''}
          {fileName} · {data.transactions.length} payments found
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelected(all)}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-muted hover:bg-surface"
        >
          Select all
        </button>
        <button
          onClick={() => setSelected([])}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-muted hover:bg-surface"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.months.map((m) => {
          const on = selected.includes(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={twMerge(
                'flex items-center justify-between gap-4 text-left rounded-2xl border px-4 py-3.5 transition-all',
                on ? 'bg-white border-accent shadow-soft' : 'bg-white/50 border-muted/60 hover:bg-white'
              )}
            >
              <div>
                <p className="font-semibold text-ink">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.count} payments · {money(m.total)} spent
                </p>
              </div>
              <div
                className={twMerge(
                  'w-6 h-6 rounded-full flex items-center justify-center border shrink-0',
                  on ? 'bg-ink border-ink text-white' : 'border-muted'
                )}
              >
                {on && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <GhostButton onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </GhostButton>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:inline">
            {count} payments · {money(total)}
          </span>
          <PrimaryButton disabled={!selected.length} onClick={onNext}>
            Continue <ChevronRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

const SortStep = ({ queue, entries, setEntries, onBack, onNext }) => {
  const [index, setIndex] = useState(() => {
    const first = queue.findIndex((t) => !handled(entries[t.id]));
    return first === -1 ? 0 : first;
  });
  const [applyAll, setApplyAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);

  const tx = queue[index];
  const entry = entries[tx.id] || {};
  const name = entry.name ?? tx.name;
  const sameCount = useMemo(
    () => queue.filter((t) => t.id !== tx.id && t.name === tx.name && !handled(entries[t.id])).length,
    [queue, tx, entries]
  );

  const learned = useMemo(() => {
    const map = {};
    Object.entries(entries).forEach(([id, e]) => {
      if (e.category) {
        const src = queue.find((t) => t.id === id);
        if (src) map[src.name] = e.category;
      }
    });
    return map;
  }, [entries, queue]);

  const suggestion = learned[tx.name];
  const done = queue.filter((t) => handled(entries[t.id])).length;
  const allDone = done === queue.length;

  useEffect(() => {
    setApplyAll(false);
    setShowRaw(false);
    setEditing(false);
  }, [index]);

  const nextUnsorted = useCallback(
    (from, covered) => {
      const open = (t) => !handled(entries[t.id]) && !covered.has(t.id);
      const after = queue.findIndex((t, i) => i > from && open(t));
      if (after !== -1) return after;
      const before = queue.findIndex((t, i) => i < from && open(t));
      if (before !== -1) return before;
      return Math.min(from + 1, queue.length - 1);
    },
    [entries, queue]
  );

  const choose = useCallback(
    (category) => {
      const covered = new Set([tx.id]);
      const baseName = (entries[tx.id] || {}).name ?? tx.name;
      if (applyAll) {
        queue.forEach((t) => {
          if (t.id !== tx.id && t.name === tx.name && !handled(entries[t.id])) covered.add(t.id);
        });
      }
      setEntries((cur) => {
        const next = { ...cur };
        const base = cur[tx.id] || {};
        next[tx.id] = { ...base, name: base.name ?? tx.name, category, skipped: false };
        covered.forEach((id) => {
          if (id !== tx.id) next[id] = { ...(cur[id] || {}), name: (cur[id] || {}).name ?? baseName, category, skipped: false };
        });
        return next;
      });
      const targetIdx = index;
      const target = nextUnsorted(index, covered);
      setTimeout(() => {
        setIndex((i) => (i === targetIdx ? target : i));
      }, 120);
    },
    [applyAll, entries, index, nextUnsorted, queue, setEntries, tx]
  );

  const skip = () => {
    setEntries((cur) => ({ ...cur, [tx.id]: { ...(cur[tx.id] || {}), name, category: null, skipped: true } }));
    setIndex(nextUnsorted(index, new Set([tx.id])));
  };

  const rename = (value) => {
    setEntries((cur) => ({ ...cur, [tx.id]: { ...(cur[tx.id] || {}), name: value } }));
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') || e.metaKey || e.ctrlKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CATEGORIES.length) choose(CATEGORIES[n - 1].id);
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, queue.length - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, queue.length]);

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-ink">Sort your spending</h3>
          <p className="text-gray-500 mt-1 text-sm">
            Payment {index + 1} of {queue.length} · {done} sorted
          </p>
        </div>
        <span className="text-xs text-gray-400 hidden md:inline">Tip: press 1–9 to pick a category</span>
      </div>

      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${(done / queue.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-[2rem] border border-muted/50 shadow-soft p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-gray-400">{prettyDate(tx.date)}</p>
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => rename(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                className="mt-1 w-full text-xl font-semibold text-ink bg-canvas rounded-xl px-3 py-1.5 border border-accent outline-none"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="mt-1 flex items-center gap-2 text-left group max-w-full"
                title="Rename this payment"
              >
                <span className="text-xl font-semibold text-ink truncate">{name}</span>
                <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-accent shrink-0" />
              </button>
            )}
            {tx.method !== 'OTHER' && (
              <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-wider text-gray-500 bg-surface rounded-full px-2 py-0.5">
                {tx.method}
              </span>
            )}
          </div>
          <p className="text-3xl font-semibold tracking-tight text-ink shrink-0">{money(tx.amount)}</p>
        </div>

        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-left text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showRaw ? tx.narration : 'Show original bank text'}
        </button>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {CATEGORIES.map((c, i) => {
            const active = entry.category === c.id;
            const suggested = !entry.category && suggestion === c.id;
            return (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                className={twMerge(
                  'relative flex flex-col items-center gap-1 rounded-2xl border py-3 px-2 transition-all',
                  active
                    ? 'bg-ink text-white border-ink shadow-soft'
                    : suggested
                    ? 'bg-surface border-accent'
                    : 'bg-canvas border-muted/60 hover:bg-surface'
                )}
              >
                <span className="text-xl leading-none">{c.icon}</span>
                <span className="text-[11px] font-medium">{c.name}</span>
                <span className="absolute top-1 left-2 text-[9px] opacity-40">{i + 1}</span>
                {suggested && <Sparkles className="absolute top-1 right-1.5 w-3 h-3 text-accent" />}
              </button>
            );
          })}
        </div>

        {sameCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(e) => setApplyAll(e.target.checked)}
              className="accent-ink"
            />
            Use this category for the {sameCount} other payment{sameCount === 1 ? '' : 's'} to {tx.name}
          </label>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <GhostButton onClick={onBack} className="px-4">
            <ChevronLeft className="w-4 h-4" /> Months
          </GhostButton>
          <GhostButton onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} className="px-4">
            <Undo2 className="w-4 h-4" /> Previous
          </GhostButton>
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={skip} className="px-4" title="Leave this payment out of the import">
            <SkipForward className="w-4 h-4" /> Don't import
          </GhostButton>
          <PrimaryButton onClick={onNext} disabled={!allDone}>
            {allDone ? 'Continue' : `${queue.length - done} left`} <ChevronRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

const weekKey = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.floor((d - jan1) / 604800000)}`;
};

const GroupStep = ({ rows, groups, setGroups, onBack, onNext }) => {
  const groupedIds = useMemo(() => new Set(groups.flatMap((g) => g.members.map((m) => m.id))), [groups]);
  const free = useMemo(() => rows.filter((r) => !groupedIds.has(r.id)), [rows, groupedIds]);

  const [selected, setSelected] = useState([]);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const suggestions = useMemo(() => {
    const out = [];
    const byName = {};
    free.forEach((r) => {
      (byName[r.name] = byName[r.name] || []).push(r);
    });
    Object.entries(byName).forEach(([n, list]) => {
      if (list.length >= 3) out.push({ key: `n-${n}`, title: n, hint: 'same shop', label: n, list });
    });
    const byCatWeek = {};
    free.forEach((r) => {
      const k = `${r.category}|${weekKey(r.date)}`;
      (byCatWeek[k] = byCatWeek[k] || []).push(r);
    });
    Object.entries(byCatWeek).forEach(([k, list]) => {
      if (list.length >= 3) {
        const cat = CATEGORIES.find((c) => c.id === list[0].category);
        out.push({
          key: `c-${k}`,
          title: `${cat ? cat.name : list[0].category}, week of ${new Date(`${list[0].date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          hint: '',
          label: `${cat ? cat.name : list[0].category}`,
          list,
        });
      }
    });
    return out.sort((a, b) => b.list.length - a.list.length).slice(0, 8);
  }, [free]);

  const visible = free.filter(
    (r) =>
      (catFilter === 'all' || r.category === catFilter) &&
      (!query || r.name.toLowerCase().includes(query.toLowerCase()))
  );

  const selectedRows = free.filter((r) => selected.includes(r.id));
  const selectedTotal = selectedRows.reduce((a, r) => a + r.amount, 0);

  const majorityCategory = (list) => {
    const counts = {};
    list.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'misc';
  };

  const applySelection = (list, suggestedLabel) => {
    setSelected(list.map((r) => r.id));
    setLabel(suggestedLabel || '');
    setCategory(majorityCategory(list));
  };

  const toggle = (id) => {
    setSelected((cur) => {
      const next = cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id];
      const list = free.filter((r) => next.includes(r.id));
      if (list.length) setCategory((c) => c || majorityCategory(list));
      return next;
    });
  };

  const createGroup = () => {
    if (selectedRows.length < 2 || !label.trim()) return;
    const sorted = [...selectedRows].sort((a, b) => a.date.localeCompare(b.date));
    setGroups((cur) => [
      ...cur,
      {
        gid: `g${Date.now()}`,
        label: label.trim(),
        category: category || majorityCategory(sorted),
        date: sorted[sorted.length - 1].date,
        members: sorted,
      },
    ]);
    setSelected([]);
    setLabel('');
    setCategory('');
  };

  const usedCategories = [...new Set(free.map((r) => r.category))];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-ink">Combine payments (optional)</h3>
        <p className="text-gray-500 mt-1 text-sm">
          Went grocery shopping across 20 small shops? Tick them, name the group "Groceries", and they become one
          entry. The individual payments are kept inside it.
        </p>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Suggested groups</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.key}
                onClick={() => applySelection(s.list, s.label)}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full bg-white border border-muted hover:bg-surface hover:border-accent transition-all"
              >
                <Sparkles className="w-3 h-3 text-accent" />
                {s.title} · {s.list.length} · {money(s.list.reduce((a, r) => a + r.amount, 0))}
              </button>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-gray-400">Your groups</p>
          {groups.map((g) => (
            <div
              key={g.gid}
              className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-accent/60 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{categoryIcon(g.category)}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{g.label}</p>
                  <p className="text-xs text-gray-500">{g.members.length} payments</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold">{money(g.members.reduce((a, m) => a + m.amount, 0))}</span>
                <button
                  onClick={() => setGroups((cur) => cur.filter((x) => x.gid !== g.gid))}
                  className="text-xs text-gray-500 underline hover:text-ink"
                >
                  Ungroup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRows.length >= 2 && (
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-3xl border border-accent p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-ink font-medium shrink-0">
            <Layers className="w-4 h-4 text-accent" />
            {selectedRows.length} payments · {money(selectedTotal)}
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Group name, e.g. Groceries"
            className="flex-1 px-4 py-2.5 rounded-full bg-canvas border border-muted outline-none focus:border-accent text-sm"
          />
          <select
            value={category || majorityCategory(selectedRows)}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 rounded-full bg-canvas border border-muted text-sm outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <PrimaryButton onClick={createGroup} disabled={!label.trim()} className="py-2.5">
            Group them
          </PrimaryButton>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payee"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-muted outline-none focus:border-accent text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-4 py-2.5 rounded-full bg-white border border-muted text-sm outline-none"
        >
          <option value="all">All categories</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>
              {categoryIcon(c)} {CATEGORIES.find((x) => x.id === c)?.name || c}
            </option>
          ))}
        </select>
        <GhostButton className="px-4 py-2.5" onClick={() => setSelected(visible.map((r) => r.id))}>
          Select shown
        </GhostButton>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-muted/50 bg-white divide-y divide-muted/30">
        {visible.length === 0 && <p className="p-6 text-center text-sm text-gray-400">Nothing to show.</p>}
        {visible.map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={twMerge(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                on ? 'bg-surface' : 'hover:bg-canvas'
              )}
            >
              <div
                className={twMerge(
                  'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                  on ? 'bg-ink border-ink text-white' : 'border-muted'
                )}
              >
                {on && <Check className="w-3 h-3" />}
              </div>
              <span className="text-lg">{categoryIcon(r.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                <p className="text-[11px] text-gray-400">{prettyDate(r.date)}</p>
              </div>
              <span className="text-sm font-semibold">{money(r.amount)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <GhostButton onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </GhostButton>
        <PrimaryButton onClick={onNext}>
          {groups.length ? 'Continue' : 'Skip grouping'} <ChevronRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </div>
  );
};

const SaveStep = ({ finalList, saving, error, onBack, onSave }) => {
  const total = finalList.reduce((a, t) => a + t.amount, 0);
  const grouped = finalList.filter((t) => t.items).length;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-ink">Ready to save</h3>
        <p className="text-gray-500 mt-1 text-sm">
          {finalList.length} entries{grouped ? ` (${grouped} grouped)` : ''} · {money(total)} total
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-2xl border border-muted/50 bg-white divide-y divide-muted/30">
        {finalList.map((t, i) => (
          <div key={`${t.ref || t.description}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-lg">{categoryIcon(t.category)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{t.description}</p>
              <p className="text-[11px] text-gray-400">
                {prettyDate(t.date.slice(0, 10))}
                {t.items ? ` · ${t.items.length} payments` : ''}
              </p>
            </div>
            <span className="text-sm font-semibold">{money(t.amount)}</span>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">{error}</div>}

      <div className="flex items-center justify-between">
        <GhostButton onClick={onBack} disabled={saving}>
          <ChevronLeft className="w-4 h-4" /> Back
        </GhostButton>
        <PrimaryButton onClick={onSave} disabled={saving || !finalList.length}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save {finalList.length} entries
        </PrimaryButton>
      </div>
    </div>
  );
};

const StatementImport = ({ isOpen, onClose, onSaved }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [entries, setEntries] = useState({});
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setStep(0);
    setData(null);
    setFileName('');
    setSelectedMonths([]);
    setEntries({});
    setGroups([]);
    setSaving(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const queue = useMemo(
    () =>
      data
        ? data.transactions
            .filter((t) => selectedMonths.includes(t.date.slice(0, 7)))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [data, selectedMonths]
  );

  const sortedRows = useMemo(
    () =>
      queue
        .filter((t) => entries[t.id] && entries[t.id].category && !entries[t.id].skipped)
        .map((t) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          name: (entries[t.id].name || t.name).trim() || t.name,
          category: entries[t.id].category,
          narration: t.narration,
        })),
    [queue, entries]
  );

  const finalList = useMemo(() => {
    const groupedIds = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
    const singles = sortedRows
      .filter((r) => !groupedIds.has(r.id))
      .map((r) => ({
        amount: r.amount,
        description: r.name,
        category: r.category,
        source_type: 'BANK',
        is_expense: true,
        date: `${r.date}T12:00:00`,
        ref: r.id,
      }));
    const grouped = groups.map((g) => ({
      amount: Math.round(g.members.reduce((a, m) => a + m.amount, 0) * 100) / 100,
      description: g.label,
      category: g.category,
      source_type: 'BANK',
      is_expense: true,
      date: `${g.date}T12:00:00`,
      items: g.members.map((m) => ({ id: m.id, name: m.name, amount: m.amount, date: m.date })),
    }));
    return [...singles, ...grouped].sort((a, b) => a.date.localeCompare(b.date));
  }, [sortedRows, groups]);

  const handleLoaded = useCallback((payload, name) => {
    setData(payload);
    setFileName(name);
    setSelectedMonths(payload.months.map((m) => m.key));
    setEntries({});
    setGroups([]);
    setStep(1);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await saveTransactionsBulk(finalList);
      onSaved?.(result);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Saving failed. Please try again.');
      setSaving(false);
    }
  };

  const requestClose = () => {
    const progress = Object.keys(entries).length;
    if (progress > 0 && step < 4 && !window.confirm('Close and lose your progress on this statement?')) return;
    onClose();
  };

  const goToSort = () => {
    const allowed = new Set(queue.map((t) => t.id));
    setEntries((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => allowed.has(id))));
    setStep(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-ink/30 backdrop-blur-sm">
      <div className="bg-canvas w-full max-w-3xl max-h-[94vh] rounded-[2rem] shadow-2xl overflow-hidden border border-white/40 flex flex-col">
        <div className="flex items-center justify-between pr-4 pt-3">
          <div className="flex-1">
            <StepBar step={step} />
          </div>
          <button
            onClick={requestClose}
            className="p-2 rounded-full hover:bg-surface text-gray-500 transition-colors mt-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 0 && <UploadStep onLoaded={handleLoaded} />}
          {step === 1 && data && (
            <MonthsStep
              data={data}
              fileName={fileName}
              selected={selectedMonths}
              setSelected={setSelectedMonths}
              onBack={() => setStep(0)}
              onNext={goToSort}
            />
          )}
          {step === 2 && queue.length > 0 && (
            <SortStep queue={queue} entries={entries} setEntries={setEntries} onBack={() => setStep(1)} onNext={() => setStep(3)} />
          )}
          {step === 2 && queue.length === 0 && (
            <div className="p-8 text-center text-gray-500">No payments in the selected months.</div>
          )}
          {step === 3 && (
            <GroupStep rows={sortedRows} groups={groups} setGroups={setGroups} onBack={() => setStep(2)} onNext={() => setStep(4)} />
          )}
          {step === 4 && (
            <SaveStep finalList={finalList} saving={saving} error={error} onBack={() => setStep(3)} onSave={handleSave} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StatementImport;