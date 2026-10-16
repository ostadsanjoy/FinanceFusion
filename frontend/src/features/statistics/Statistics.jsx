import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { getTransactions } from '../../services/api';
import { categoryIcon } from '../../constants/categories';
import {
  buildStats, categoryName, categoryColor, monthLabel, inr, inrShort, pct, WEEKDAYS,
} from './statsMath';

const INK = '#2A2A2A';
const INK2 = '#6B6B66';
const GRID = '#E7E1DA';
const UP = '#eb6834';
const DOWN = '#2a78d6';

const RANGES = [
  { id: 3, label: '3 months' },
  { id: 6, label: '6 months' },
  { id: 12, label: '12 months' },
  { id: 0, label: 'All time' },
];

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
      active ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-muted hover:bg-surface'
    }`}
  >
    {children}
  </button>
);

const Section = ({ title, subtitle, right, children, className = '' }) => (
  <GlassCard className={`bg-white ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </GlassCard>
);

const Tile = ({ label, value, sub, tone }) => (
  <div className="bg-white rounded-2xl border border-muted/60 p-4">
    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{label}</div>
    <div className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{value}</div>
    {sub && (
      <div className={`text-xs mt-1 ${tone === 'up' ? 'text-orange-600' : tone === 'down' ? 'text-blue-600' : 'text-gray-500'}`}>{sub}</div>
    )}
  </div>
);

const TipBox = ({ title, rows, footer }) => (
  <div className="bg-white border border-muted rounded-xl shadow-lg px-3 py-2 text-xs min-w-[160px]">
    {title && <div className="font-semibold text-sm mb-1">{title}</div>}
    {rows.map((r) => (
      <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
        <span className="flex items-center gap-1.5 text-gray-600">
          {r.color && <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />}
          {r.label}
        </span>
        <span className="font-medium tabular-nums">{r.value}</span>
      </div>
    ))}
    {footer && <div className="mt-1 pt-1 border-t border-muted text-gray-500">{footer}</div>}
  </div>
);

const CatChips = ({ cats, selected, onToggle, onAll, onNone }) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    {cats.map((c) => {
      const on = selected.has(c.key);
      return (
        <button
          key={c.key}
          onClick={() => onToggle(c.key)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            on ? 'bg-white border-ink/70' : 'bg-surface/60 border-transparent text-gray-400'
          }`}
        >
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: on ? c.color : '#cfcac3' }} />
          {c.name}
        </button>
      );
    })}
    <button onClick={onAll} className="text-xs text-gray-500 underline ml-1">All</button>
    <button onClick={onNone} className="text-xs text-gray-500 underline">None</button>
  </div>
);

const Spark = ({ values, color, w = 90, h = 26 }) => {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.length > 0 && (
        <circle cx={(values.length - 1) * step} cy={h - 3 - (values[values.length - 1] / max) * (h - 6)} r="2.5" fill={color} stroke="#fff" strokeWidth="1.5" />
      )}
    </svg>
  );
};

const axisProps = { tick: { fill: INK2, fontSize: 11 }, axisLine: false, tickLine: false };

const volatilityLabel = (cv) => (cv < 0.35 ? 'Steady' : cv < 0.75 ? 'Moderate' : cv < 1.25 ? 'Volatile' : 'Erratic');

const Trend = ({ slopePct, slope }) => {
  if (Math.abs(slopePct) < 0.03) return <span className="inline-flex items-center gap-1 text-gray-500"><Minus className="w-3.5 h-3.5" />flat</span>;
  const up = slope > 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-orange-600' : 'text-blue-600'}`}>
      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {up ? '+' : '−'}{inrShort(Math.abs(slope))}/mo
    </span>
  );
};

const Statistics = () => {
  const navigate = useNavigate();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(false);
  const [range, setRange] = useState(6);
  const [excludeCurrent, setExcludeCurrent] = useState(true);
  const [stackMode, setStackMode] = useState('amount');
  const [stackSel, setStackSel] = useState(null);
  const [lineSel, setLineSel] = useState(null);
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');
  const [domMode, setDomMode] = useState('avg');

  useEffect(() => {
    getTransactions().then(setRaw).catch(() => setError(true));
  }, []);

  const stats = useMemo(() => (raw ? buildStats(raw, { months: range, excludeCurrent }) : null), [raw, range, excludeCurrent]);

  const cats = useMemo(
    () => (stats ? stats.catStats.map((c) => ({ key: c.key, name: c.name, color: c.color })) : []),
    [stats]
  );

  const stackSet = stackSel || new Set(cats.map((c) => c.key));
  const lineSet = lineSel || new Set(cats.slice(0, 4).map((c) => c.key));

  const toggle = (set, setter) => (k) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setter(next);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-canvas text-ink p-8">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-surface rounded-full"><ArrowLeft className="w-6 h-6" /></button>
        <p className="mt-6 text-red-600">Couldn't load your transactions. Please go back and try again.</p>
      </div>
    );
  }

  const header = (
    <header className="flex items-center gap-4 mb-6">
      <button onClick={() => navigate('/dashboard')} className="p-2 bg-surface rounded-full hover:bg-white transition-colors">
        <ArrowLeft className="w-6 h-6 text-ink" />
      </button>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Spending Statistics</h1>
        <p className="text-accent text-sm">Where your money goes, category by category, month by month</p>
      </div>
    </header>
  );

  if (!raw) {
    return <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8 max-w-7xl mx-auto">{header}<p className="text-gray-500">Crunching your numbers…</p></div>;
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8 max-w-7xl mx-auto">
        {header}
        <GlassCard className="bg-white text-center py-16">
          <p className="text-lg font-medium">No spending data in this range yet</p>
          <p className="text-gray-500 mt-1">Add a few transactions or import a bank statement and your statistics will appear here.</p>
        </GlassCard>
      </div>
    );
  }

  const { kpis, catStats, monthKeys, matrix, monthTotals } = stats;
  const sortedCats = [...catStats].sort((a, b) => (sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
  const topCat = catStats[0];
  const lastTotal = monthTotals[monthTotals.length - 1];
  const prevTotal = monthTotals.length > 1 ? monthTotals[monthTotals.length - 2] : null;
  const momPct = prevTotal ? (lastTotal - prevTotal) / prevTotal : null;

  const stackData = monthKeys.map((k, i) => {
    const row = { month: monthLabel(k), key: k, total: monthTotals[i] };
    const visibleTotal = cats.reduce((s, c) => s + (stackSet.has(c.key) ? matrix[k][c.key] : 0), 0);
    cats.forEach((c) => {
      const v = stackSet.has(c.key) ? matrix[k][c.key] : 0;
      row[c.key] = stackMode === 'share' ? (visibleTotal ? (v / visibleTotal) * 100 : 0) : v;
      row[`${c.key}__raw`] = matrix[k][c.key];
    });
    return row;
  });
  const visibleCats = cats.filter((c) => stackSet.has(c.key));

  const lineData = monthKeys.map((k) => {
    const row = { month: monthLabel(k) };
    cats.forEach((c) => {
      row[c.key] = matrix[k][c.key];
    });
    return row;
  });

  const maxRange = Math.max(...catStats.map((c) => c.max), 1);
  const heatMax = (c) => Math.max(c.max, 1);
  const wkMax = Math.max(...stats.weekday.map((w) => w.perDay), 1);
  const wkStrong = stats.weekday.findIndex((w) => w.perDay === wkMax);

  const insights = [];
  if (topCat) insights.push(`${topCat.name} takes the biggest bite: ${pct(topCat.share)} of everything you spent (${inr(topCat.total)}), about ${inr(topCat.mean)} a month.`);
  const volatile = [...catStats].filter((c) => c.activeMonths >= 2 || monthKeys.length < 3).sort((a, b) => b.cv - a.cv)[0];
  const steady = [...catStats].filter((c) => c.activeMonths >= Math.max(2, monthKeys.length - 1) && c.mean > 0).sort((a, b) => a.cv - b.cv)[0];
  if (volatile && volatile.cv > 0.5) insights.push(`${volatile.name} is your most unpredictable category — it swings between ${inr(volatile.min)} and ${inr(volatile.max)} a month (volatility ${volatile.cv.toFixed(2)}).`);
  if (steady && steady !== volatile) insights.push(`${steady.name} is your most predictable spend, staying within ${inr(steady.min)}–${inr(steady.max)} each month.`);
  const risers = [...catStats].filter((c) => monthKeys.length >= 3 && c.mean > 0).sort((a, b) => b.slopePct - a.slopePct);
  if (risers[0] && risers[0].slopePct > 0.05) insights.push(`${risers[0].name} is climbing fastest: roughly +${inrShort(risers[0].slope)} more every month.`);
  const fallers = [...risers].reverse();
  if (fallers[0] && fallers[0].slopePct < -0.05) insights.push(`${fallers[0].name} is shrinking fastest: roughly −${inrShort(Math.abs(fallers[0].slope))} every month.`);
  if (stats.spikes[0]) {
    const s = stats.spikes[0];
    insights.push(`${monthLabel(s.key, true)} was your spikiest month at ${inr(s.total)}, mostly driven by ${s.driver.name} (${inr(s.driverDelta)} above its usual).`);
  }
  insights.push(`Weekends account for ${pct(kpis.weekendShare)} of your spend; ${WEEKDAYS[wkStrong]} is your priciest day of the week on average (${inr(wkMax)} each).`);
  insights.push(`Half your payments are under ${inr(kpis.medianTicket)}, but the top 10% are ${inr(kpis.p90Ticket)} or more, and your single biggest was ${inr(kpis.maxTicket)}.`);

  const setSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const Th = ({ k, children, align = 'right' }) => (
    <th
      onClick={() => setSort(k)}
      className={`py-2 px-2 font-medium text-[11px] uppercase tracking-wider text-gray-500 cursor-pointer select-none whitespace-nowrap text-${align}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {sortKey === k && (sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {header}

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {RANGES.map((r) => (
            <Pill key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>{r.label}</Pill>
          ))}
          {kpis.hasCurrent || excludeCurrent || stats.pace ? (
            <label className="flex items-center gap-2 text-sm text-gray-600 ml-2 cursor-pointer select-none">
              <input type="checkbox" checked={excludeCurrent} onChange={(e) => setExcludeCurrent(e.target.checked)} className="accent-black" />
              Ignore current (unfinished) month
            </label>
          ) : null}
          <span className="ml-auto text-sm text-gray-500">
            {monthLabel(monthKeys[0], true)}{monthKeys.length > 1 ? ` → ${monthLabel(monthKeys[monthKeys.length - 1], true)}` : ''} · {kpis.txCount} payments · {kpis.nMonths} month{kpis.nMonths === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Tile label="Total spent" value={inr(kpis.total)} sub={`${kpis.txCount} payments on ${kpis.days} days`} />
          <Tile label="Average / month" value={inr(kpis.meanMonth)} sub={`median ${inr(kpis.medianMonth)} · σ ${inr(kpis.sdMonth)}`} />
          <Tile label="Average / day" value={inr(kpis.perDay)} sub={`${inr(kpis.total / Math.max(1, kpis.days))} on days you spend`} />
          <Tile
            label={kpis.hasCurrent ? 'This month so far' : 'Latest month'}
            value={inr(lastTotal)}
            sub={momPct === null ? monthLabel(monthKeys[monthKeys.length - 1], true) : `${momPct >= 0 ? '+' : ''}${pct(momPct, 1)} vs ${monthLabel(monthKeys[monthKeys.length - 2])}`}
            tone={momPct === null ? undefined : momPct > 0 ? 'up' : 'down'}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Tile label="Avg payment" value={inr(kpis.avgTicket)} sub={`median ${inr(kpis.medianTicket)} · p90 ${inr(kpis.p90Ticket)}`} />
          <Tile label="Highest month" value={inr(kpis.worstMonth.total)} sub={monthLabel(kpis.worstMonth.key, true)} />
          <Tile label="Lowest month" value={inr(kpis.bestMonth.total)} sub={monthLabel(kpis.bestMonth.key, true)} />
          <Tile
            label="Monthly trend"
            value={`${kpis.slopeMonth >= 0 ? '+' : '−'}${inrShort(Math.abs(kpis.slopeMonth))}/mo`}
            sub={`volatility ${kpis.cvMonth.toFixed(2)} · spread across ${catStats.length} categories (HHI ${kpis.hhi.toFixed(2)})`}
            tone={Math.abs(kpis.slopeMonth) < 1 ? undefined : kpis.slopeMonth > 0 ? 'up' : 'down'}
          />
        </div>

        <Section title="What the numbers say" subtitle="Plain-language read-outs generated from your data" className="mb-6">
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2.5">
            {insights.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm leading-relaxed">
                <Sparkles className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Monthly spend by category"
          subtitle="Each bar is a month; each colour is a category. Switch to share view to see how the mix shifts."
          right={
            <div className="flex gap-2">
              <Pill active={stackMode === 'amount'} onClick={() => setStackMode('amount')}>₹ Amount</Pill>
              <Pill active={stackMode === 'share'} onClick={() => setStackMode('share')}>% Share</Pill>
            </div>
          }
          className="mb-6"
        >
          <CatChips
            cats={cats}
            selected={stackSet}
            onToggle={toggle(stackSet, setStackSel)}
            onAll={() => setStackSel(new Set(cats.map((c) => c.key)))}
            onNone={() => setStackSel(new Set())}
          />
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={stackData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={48} tickFormatter={(v) => (stackMode === 'share' ? `${v}%` : inrShort(v))} domain={stackMode === 'share' ? [0, 100] : [0, 'auto']} />
                {stackMode === 'amount' && <ReferenceLine y={kpis.meanMonth} stroke={INK2} strokeDasharray="4 4" label={{ value: `avg ${inrShort(kpis.meanMonth)}`, fill: INK2, fontSize: 11, position: 'insideTopRight' }} />}
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const rows = visibleCats
                      .map((c) => ({ label: c.name, color: c.color, raw: d[`${c.key}__raw`] }))
                      .filter((r) => r.raw > 0)
                      .sort((a, b) => b.raw - a.raw)
                      .map((r) => ({ label: r.label, color: r.color, value: inr(r.raw) }));
                    return <TipBox title={monthLabel(d.key, true)} rows={rows} footer={`Month total ${inr(d.total)}`} />;
                  }}
                />
                {visibleCats.map((c, i) => (
                  <Bar key={c.key} dataKey={c.key} stackId="s" fill={c.color} stroke="#fff" strokeWidth={1.5} radius={i === visibleCats.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={56} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Category trends" subtitle="Pick categories to compare how each one moves month to month" className="mb-6">
          <CatChips
            cats={cats}
            selected={lineSet}
            onToggle={toggle(lineSet, setLineSel)}
            onAll={() => setLineSel(new Set(cats.map((c) => c.key)))}
            onNone={() => setLineSel(new Set())}
          />
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={48} tickFormatter={inrShort} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const rows = [...payload].sort((a, b) => b.value - a.value).map((p) => ({ label: categoryName(p.dataKey), color: p.stroke, value: inr(p.value) }));
                    return <TipBox title={label} rows={rows} />;
                  }}
                />
                {cats.filter((c) => lineSet.has(c.key)).map((c) => (
                  <Line key={c.key} type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={{ r: 3, fill: c.color, stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          title="Highs, lows and typical spend per category"
          subtitle="The bar runs from your lowest to your highest month. The shaded core is the middle 50% of months (25th–75th percentile). The white tick is the average and the dot is the median."
          className="mb-6"
        >
          <div className="space-y-3">
            {catStats.map((c) => (
              <div key={c.key} className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr_210px] items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium truncate">
                  <span>{categoryIcon(c.key)}</span>
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="relative h-6" title={`${c.name}: low ${inr(c.min)} (${monthLabel(c.minMonth)}) · avg ${inr(c.mean)} · high ${inr(c.max)} (${monthLabel(c.maxMonth)})`}>
                  <div className="absolute inset-y-2.5 left-0 right-0 bg-surface/70 rounded-full" />
                  <div className="absolute inset-y-1.5 rounded-full opacity-35" style={{ left: `${(c.min / maxRange) * 100}%`, width: `${Math.max(((c.max - c.min) / maxRange) * 100, 0.8)}%`, background: c.color }} />
                  <div className="absolute inset-y-1 rounded-full" style={{ left: `${(c.p25 / maxRange) * 100}%`, width: `${Math.max(((c.p75 - c.p25) / maxRange) * 100, 0.8)}%`, background: c.color }} />
                  <div className="absolute inset-y-0.5 w-[3px] bg-white rounded-full shadow ring-1 ring-black/20" style={{ left: `calc(${(c.mean / maxRange) * 100}% - 1.5px)` }} />
                  <div className="absolute top-1/2 w-2.5 h-2.5 -mt-[5px] rounded-full bg-ink ring-2 ring-white" style={{ left: `calc(${(c.median / maxRange) * 100}% - 5px)` }} />
                </div>
                <div className="hidden sm:flex justify-between text-xs tabular-nums text-gray-600">
                  <span title={monthLabel(c.minMonth, true)}>low {inrShort(c.min)}</span>
                  <span className="font-semibold text-ink">avg {inrShort(c.mean)}</span>
                  <span title={monthLabel(c.maxMonth, true)}>high {inrShort(c.max)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Category × month heatmap" subtitle="Darker means closer to that category's own record month. Numbers are rupees." className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate" style={{ borderSpacing: 3 }}>
              <thead>
                <tr>
                  <th className="text-left font-medium text-gray-500 pr-2">Category</th>
                  {monthKeys.map((k) => (
                    <th key={k} className="font-medium text-gray-500 whitespace-nowrap px-1">{monthLabel(k)}</th>
                  ))}
                  <th className="font-medium text-gray-500 px-1">Avg</th>
                </tr>
              </thead>
              <tbody>
                {catStats.map((c) => (
                  <tr key={c.key}>
                    <td className="pr-2 py-1 whitespace-nowrap font-medium text-sm">{categoryIcon(c.key)} {c.name}</td>
                    {monthKeys.map((k) => {
                      const v = matrix[k][c.key];
                      const a = v / heatMax(c);
                      return (
                        <td
                          key={k}
                          title={`${c.name} · ${monthLabel(k, true)} · ${inr(v)}`}
                          className="text-center rounded-md min-w-[52px] h-9 tabular-nums"
                          style={{ background: v ? `rgba(42,120,214,${0.1 + a * 0.8})` : '#F3EFEA', color: a > 0.55 ? '#fff' : INK }}
                        >
                          {v ? inrShort(v) : '–'}
                        </td>
                      );
                    })}
                    <td className="text-center font-semibold tabular-nums px-1">{inrShort(c.mean)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pr-2 pt-2 font-semibold text-sm">Total</td>
                  {monthTotals.map((v, i) => (
                    <td key={monthKeys[i]} className="text-center pt-2 font-semibold tabular-nums">{inrShort(v)}</td>
                  ))}
                  <td className="text-center pt-2 font-semibold tabular-nums">{inrShort(kpis.meanMonth)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Every number, per category" subtitle="Click a column heading to sort. Volatility is the coefficient of variation (σ ÷ average): the higher it is, the less predictable the category." className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted">
                  <Th k="name" align="left">Category</Th>
                  <Th k="total">Total</Th>
                  <Th k="share">Share</Th>
                  <Th k="mean">Avg/mo</Th>
                  <Th k="median">Median/mo</Th>
                  <Th k="min">Low</Th>
                  <Th k="max">High</Th>
                  <Th k="std">σ</Th>
                  <Th k="cv">Volatility</Th>
                  <Th k="slope">Trend</Th>
                  <Th k="count">Payments</Th>
                  <Th k="avgTicket">Avg payment</Th>
                  <Th k="medianTicket">Median payment</Th>
                  <Th k="last">Last month</Th>
                  <th className="py-2 px-2 text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right">Shape</th>
                </tr>
              </thead>
              <tbody>
                {sortedCats.map((c) => (
                  <tr key={c.key} className="border-b border-muted/50 hover:bg-surface/40">
                    <td className="py-2 px-2 whitespace-nowrap font-medium">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: c.color }} />
                      {c.name}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.total)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{pct(c.share, 1)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.mean)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.median)}</td>
                    <td className="py-2 px-2 text-right tabular-nums" title={monthLabel(c.minMonth, true)}>{inr(c.min)}</td>
                    <td className="py-2 px-2 text-right tabular-nums" title={monthLabel(c.maxMonth, true)}>{inr(c.max)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.std)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{c.cv.toFixed(2)} <span className="text-xs text-gray-500">{volatilityLabel(c.cv)}</span></td>
                    <td className="py-2 px-2 text-right whitespace-nowrap"><Trend slope={c.slope} slopePct={c.slopePct} /></td>
                    <td className="py-2 px-2 text-right tabular-nums">{c.count}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.avgTicket)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{inr(c.medianTicket)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {inr(c.last)}
                      <span className="block text-[11px] text-gray-400">{c.lastZ >= 1 ? 'unusually high' : c.lastZ <= -1 ? 'unusually low' : 'typical'}</span>
                    </td>
                    <td className="py-2 px-2 flex justify-end"><Spark values={c.series} color={c.color} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Section title="Month over month" subtitle="Change in total spend from the previous month">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={stats.momChanges.filter((m) => m.change !== null).map((m) => ({ ...m, month: monthLabel(m.key) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} width={48} tickFormatter={inrShort} />
                  <ReferenceLine y={0} stroke={INK2} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <TipBox title={monthLabel(d.key, true)} rows={[{ label: 'Total', value: inr(d.total) }, { label: 'Change', value: `${d.change >= 0 ? '+' : '−'}${inr(Math.abs(d.change))}` }, { label: 'Change %', value: d.pct === null ? '–' : `${d.pct >= 0 ? '+' : ''}${pct(d.pct, 1)}` }]} />;
                    }}
                  />
                  <Bar dataKey="change" radius={[4, 4, 4, 4]} maxBarSize={40}>
                    {stats.momChanges.filter((m) => m.change !== null).map((m) => (
                      <Cell key={m.key} fill={m.change > 0 ? UP : DOWN} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-2"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: UP }} />spent more · <span className="inline-block w-2.5 h-2.5 rounded-sm mx-1" style={{ background: DOWN }} />spent less</p>
          </Section>

          {stats.pace ? (
            <Section
              title="This month's pace"
              subtitle={`Day ${stats.pace.today} of ${stats.pace.dim}: ${inr(stats.pace.spentSoFar)} spent${stats.pace.avgSoFar != null ? ` versus ${inr(stats.pace.avgSoFar)} on an average month by this date` : ''}. At this rate the month ends near ${inr(stats.pace.projected)}${stats.pace.histTotalAvg ? ` (usual ${inr(stats.pace.histTotalAvg)})` : ''}.`}
            >
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={stats.pace.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} width={48} tickFormatter={inrShort} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const rows = payload.filter((p) => p.value != null).map((p) => ({ label: p.dataKey === 'current' ? 'This month' : 'Average month', color: p.stroke, value: inr(p.value) }));
                        return <TipBox title={`Day ${label}`} rows={rows} />;
                      }}
                    />
                    {stats.pace.series.some((s) => s.average != null) && <Line type="monotone" dataKey="average" stroke={INK2} strokeDasharray="5 4" strokeWidth={2} dot={false} />}
                    <Line type="monotone" dataKey="current" stroke={DOWN} strokeWidth={2.5} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-2"><span className="inline-block w-5 h-0.5 align-middle mr-1" style={{ background: DOWN }} />this month · <span className="inline-block w-5 border-t-2 border-dashed align-middle mx-1" style={{ borderColor: INK2 }} />average month</p>
            </Section>
          ) : (
            <Section title="Spend by weekday" subtitle="Average rupees spent on each day of the week">
              <WeekdayChart stats={stats} wkStrong={wkStrong} />
            </Section>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {stats.pace && (
            <Section title="Spend by weekday" subtitle="Average rupees spent on each day of the week">
              <WeekdayChart stats={stats} wkStrong={wkStrong} />
            </Section>
          )}
          <Section
            title="Spend by day of month"
            subtitle="Which dates your money tends to leave"
            right={
              <div className="flex gap-2">
                <Pill active={domMode === 'avg'} onClick={() => setDomMode('avg')}>Avg / month</Pill>
                <Pill active={domMode === 'count'} onClick={() => setDomMode('count')}>Payments</Pill>
              </div>
            }
          >
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={stats.dom} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" {...axisProps} interval={2} />
                  <YAxis {...axisProps} width={48} tickFormatter={domMode === 'avg' ? inrShort : undefined} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return <TipBox title={`Day ${d.day}`} rows={[{ label: 'Avg per month', value: inr(d.avg) }, { label: 'All-time total', value: inr(d.total) }, { label: 'Payments', value: d.count }]} />;
                    }}
                  />
                  <Area type="monotone" dataKey={domMode === 'avg' ? 'avg' : 'count'} stroke={DOWN} strokeWidth={2} fill={DOWN} fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
          {!stats.pace && (
            <Section title="Payment size distribution" subtitle="How many of your payments fall in each size band">
              <SizeChart stats={stats} />
            </Section>
          )}
        </div>

        {stats.pace && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Section title="Payment size distribution" subtitle="How many of your payments fall in each size band">
              <SizeChart stats={stats} />
            </Section>
            <Section title="Where the rupees go by size" subtitle="Total rupees contributed by each size band">
              <div className="space-y-2">
                {stats.sizes.map((s) => (
                  <div key={s.label} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <div className="h-3 bg-surface/70 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(s.total / kpis.total) * 100}%`, background: DOWN }} />
                    </div>
                    <span className="text-right tabular-nums">{inrShort(s.total)} · {pct(s.total / kpis.total)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <Section title="Ten biggest payments">
            <ul className="divide-y divide-muted/60">
              {stats.topTx.map((t, i) => (
                <li key={t.id || i} className="flex items-center justify-between py-2 text-sm gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                    <span className="text-lg">{categoryIcon(t.ck)}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.description || categoryName(t.ck)}</div>
                      <div className="text-xs text-gray-500">{t.d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {categoryName(t.ck)}</div>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{inr(t.amount)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Where it went: top receivers" subtitle="Grouped by the name on each payment">
            <ul className="divide-y divide-muted/60">
              {stats.payees.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between py-2 text-sm gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: categoryColor(p.cat) }} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.count} payment{p.count === 1 ? '' : 's'} · avg {inr(p.total / p.count)} · {pct(p.total / kpis.total, 1)} of all spend</div>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{inr(p.total)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
};

const WeekdayChart = ({ stats, wkStrong }) => (
  <div className="h-64">
    <ResponsiveContainer>
      <BarChart data={stats.weekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={inrShort} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return <TipBox title={d.name} rows={[{ label: 'Avg per day', value: inr(d.perDay) }, { label: 'Total', value: inr(d.total) }, { label: 'Payments', value: d.count }, { label: 'Avg payment', value: inr(d.avgTicket) }]} />;
          }}
        />
        <Bar dataKey="perDay" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {stats.weekday.map((w, i) => (
            <Cell key={w.name} fill={i === wkStrong ? UP : DOWN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const SizeChart = ({ stats }) => (
  <div className="h-64">
    <ResponsiveContainer>
      <BarChart data={stats.sizes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={36} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return <TipBox title={`₹${d.label}`} rows={[{ label: 'Payments', value: d.count }, { label: 'Total', value: inr(d.total) }]} />;
          }}
        />
        <Bar dataKey="count" fill={DOWN} radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default Statistics;