import { CATEGORIES } from '../../constants/categories';

export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const OTHER_COLOR = '#8b8b86';

export const categoryKey = (c) => String(c || 'uncategorized').toLowerCase();

export const categoryName = (key) => {
  const m = CATEGORIES.find((c) => c.id === key);
  if (m) return m.name;
  return key === 'uncategorized' ? 'Uncategorized' : key.charAt(0).toUpperCase() + key.slice(1);
};

export const categoryColor = (key) => {
  const i = CATEGORIES.findIndex((c) => c.id === key);
  return i >= 0 && i < PALETTE.length ? PALETTE[i] : OTHER_COLOR;
};

export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const stdev = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

export const percentile = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
};

export const slope = (a) => {
  const n = a.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(a);
  let num = 0;
  let den = 0;
  a.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den ? num / den : 0;
};

export const parseDate = (value) => {
  const s = String(value || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const monthLabel = (key, long = false) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
};

export const daysInMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const monthRange = (fromKey, toKey) => {
  const out = [];
  let [y, m] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
};

const SIZE_BUCKETS = [
  { label: '< 100', min: 0, max: 100 },
  { label: '100–249', min: 100, max: 250 },
  { label: '250–499', min: 250, max: 500 },
  { label: '500–999', min: 500, max: 1000 },
  { label: '1k–2.5k', min: 1000, max: 2500 },
  { label: '2.5k–5k', min: 2500, max: 5000 },
  { label: '5k–10k', min: 5000, max: 10000 },
  { label: '10k+', min: 10000, max: Infinity },
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const buildStats = (transactions, { months = 0, excludeCurrent = false } = {}) => {
  const todayKey = monthKeyOf(new Date());
  let rows = (transactions || [])
    .filter((t) => t.is_expense !== false && Number(t.amount) > 0)
    .map((t) => {
      const d = parseDate(t.date);
      return d ? { ...t, amount: Number(t.amount), d, mk: monthKeyOf(d), ck: categoryKey(t.category) } : null;
    })
    .filter(Boolean);

  if (!rows.length) return null;
  const allRows = rows;

  const allKeys = [...new Set(rows.map((r) => r.mk))].sort();
  const lastKey = allKeys[allKeys.length - 1];
  let monthKeys = monthRange(allKeys[0], lastKey);
  const hasCurrent = monthKeys.includes(todayKey);
  if (excludeCurrent && hasCurrent && monthKeys.length > 1) monthKeys = monthKeys.filter((k) => k !== todayKey);
  if (months > 0) monthKeys = monthKeys.slice(-months);
  const keySet = new Set(monthKeys);
  rows = rows.filter((r) => keySet.has(r.mk));
  if (!rows.length) return null;

  const catTotals = {};
  rows.forEach((r) => {
    catTotals[r.ck] = (catTotals[r.ck] || 0) + r.amount;
  });
  const categories = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  const matrix = {};
  monthKeys.forEach((k) => {
    matrix[k] = {};
    categories.forEach((c) => {
      matrix[k][c] = 0;
    });
  });
  rows.forEach((r) => {
    matrix[r.mk][r.ck] += r.amount;
  });

  const monthTotals = monthKeys.map((k) => categories.reduce((s, c) => s + matrix[k][c], 0));
  const total = monthTotals.reduce((s, x) => s + x, 0);
  const nMonths = monthKeys.length;

  const catStats = categories.map((c) => {
    const series = monthKeys.map((k) => matrix[k][c]);
    const txs = rows.filter((r) => r.ck === c);
    const amounts = txs.map((t) => t.amount);
    const m = mean(series);
    const sd = stdev(series);
    const maxV = Math.max(...series);
    const minV = Math.min(...series);
    const active = series.filter((x) => x > 0);
    const sl = slope(series);
    const biggest = txs.reduce((a, b) => (b.amount > a.amount ? b : a), txs[0]);
    return {
      key: c,
      name: categoryName(c),
      color: categoryColor(c),
      total: catTotals[c],
      share: total ? catTotals[c] / total : 0,
      series,
      mean: m,
      median: median(series),
      activeMean: mean(active),
      activeMonths: active.length,
      std: sd,
      cv: m ? sd / m : 0,
      min: minV,
      minMonth: monthKeys[series.indexOf(minV)],
      max: maxV,
      maxMonth: monthKeys[series.indexOf(maxV)],
      p25: percentile(series, 0.25),
      p75: percentile(series, 0.75),
      count: txs.length,
      avgTicket: mean(amounts),
      medianTicket: median(amounts),
      biggest,
      slope: sl,
      slopePct: m ? sl / m : 0,
      last: series[series.length - 1],
      lastZ: sd ? (series[series.length - 1] - m) / sd : 0,
    };
  });

  const catIndex = Object.fromEntries(catStats.map((c) => [c.key, c]));

  const days = new Set(rows.map((r) => r.d.toDateString())).size;
  const amounts = rows.map((r) => r.amount);
  const meanTotal = mean(monthTotals);
  const sdTotal = stdev(monthTotals);

  const weekday = WEEKDAYS.map((name, i) => {
    const list = rows.filter((r) => r.d.getDay() === i);
    const t = list.reduce((s, r) => s + r.amount, 0);
    return { name, total: t, count: list.length, avgTicket: list.length ? t / list.length : 0 };
  });
  const weekdayCounts = WEEKDAYS.map((_, i) => {
    let n = 0;
    monthKeys.forEach((k) => {
      const [y, m] = k.split('-').map(Number);
      const dim = daysInMonth(k);
      for (let d = 1; d <= dim; d += 1) if (new Date(y, m - 1, d).getDay() === i) n += 1;
    });
    return n;
  });
  weekday.forEach((w, i) => {
    w.perDay = weekdayCounts[i] ? w.total / weekdayCounts[i] : 0;
  });

  const dom = Array.from({ length: 31 }, (_, i) => ({ day: i + 1, total: 0, count: 0 }));
  rows.forEach((r) => {
    dom[r.d.getDate() - 1].total += r.amount;
    dom[r.d.getDate() - 1].count += 1;
  });
  dom.forEach((d) => {
    d.avg = nMonths ? d.total / nMonths : 0;
  });

  const sizes = SIZE_BUCKETS.map((b) => {
    const list = amounts.filter((a) => a >= b.min && a < b.max);
    return { label: b.label, count: list.length, total: list.reduce((s, x) => s + x, 0) };
  });

  const topTx = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 10);

  const payeeMap = {};
  rows.forEach((r) => {
    const name = String(r.description || 'Unknown').trim() || 'Unknown';
    const key = name.toLowerCase();
    if (!payeeMap[key]) payeeMap[key] = { name, total: 0, count: 0, cats: {} };
    payeeMap[key].total += r.amount;
    payeeMap[key].count += 1;
    payeeMap[key].cats[r.ck] = (payeeMap[key].cats[r.ck] || 0) + r.amount;
  });
  const payees = Object.values(payeeMap)
    .map((p) => ({ ...p, cat: Object.keys(p.cats).sort((a, b) => p.cats[b] - p.cats[a])[0] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const inCurrent = monthKeys.includes(todayKey);
  let pace = null;
  if (allRows.some((r) => r.mk === todayKey)) {
    const dim = daysInMonth(todayKey);
    const today = new Date().getDate();
    const histKeys = monthKeys.filter((k) => k !== todayKey);
    const cumFor = (k, upTo) => {
      const daily = Array(dim).fill(0);
      allRows.filter((r) => r.mk === k).forEach((r) => {
        daily[r.d.getDate() - 1] += r.amount;
      });
      let run = 0;
      return daily.map((v, i) => {
        run += v;
        return i < upTo ? run : null;
      });
    };
    const current = cumFor(todayKey, today);
    const hist = histKeys.map((k) => cumFor(k, dim));
    const series = Array.from({ length: dim }, (_, i) => ({
      day: i + 1,
      current: current[i],
      average: histKeys.length ? mean(hist.map((h) => h[Math.min(i, h.length - 1)] ?? h[h.length - 1])) : null,
    }));
    const spentSoFar = current[today - 1] || 0;
    const avgSoFar = series[today - 1].average;
    pace = {
      series,
      today,
      dim,
      spentSoFar,
      avgSoFar,
      projected: today ? (spentSoFar / today) * dim : 0,
      histTotalAvg: histKeys.length ? mean(histKeys.map((k) => monthTotals[monthKeys.indexOf(k)])) : null,
    };
  }

  const weekendTotal = rows.filter((r) => [0, 6].includes(r.d.getDay())).reduce((s, r) => s + r.amount, 0);
  const hhi = catStats.reduce((s, c) => s + c.share ** 2, 0);

  const bestMonth = monthTotals.indexOf(Math.min(...monthTotals));
  const worstMonth = monthTotals.indexOf(Math.max(...monthTotals));

  const spikes = monthKeys
    .map((k, i) => {
      const z = sdTotal ? (monthTotals[i] - meanTotal) / sdTotal : 0;
      const driver = [...catStats].sort((a, b) => (matrix[k][b.key] - b.mean) - (matrix[k][a.key] - a.mean))[0];
      return { key: k, total: monthTotals[i], z, driver, driverDelta: matrix[k][driver.key] - driver.mean };
    })
    .filter((s) => s.z >= 1)
    .sort((a, b) => b.z - a.z);

  const momChanges = monthKeys.map((k, i) => ({
    key: k,
    total: monthTotals[i],
    change: i ? monthTotals[i] - monthTotals[i - 1] : null,
    pct: i && monthTotals[i - 1] ? (monthTotals[i] - monthTotals[i - 1]) / monthTotals[i - 1] : null,
  }));

  return {
    rows,
    monthKeys,
    categories,
    catStats,
    catIndex,
    matrix,
    monthTotals,
    momChanges,
    kpis: {
      total,
      nMonths,
      days,
      txCount: rows.length,
      meanMonth: meanTotal,
      medianMonth: median(monthTotals),
      sdMonth: sdTotal,
      cvMonth: meanTotal ? sdTotal / meanTotal : 0,
      slopeMonth: slope(monthTotals),
      perDay: total / Math.max(1, daysSpan(monthKeys, rows)),
      avgTicket: mean(amounts),
      medianTicket: median(amounts),
      p90Ticket: percentile(amounts, 0.9),
      maxTicket: Math.max(...amounts),
      weekendShare: total ? weekendTotal / total : 0,
      hhi,
      bestMonth: { key: monthKeys[bestMonth], total: monthTotals[bestMonth] },
      worstMonth: { key: monthKeys[worstMonth], total: monthTotals[worstMonth] },
      hasCurrent: inCurrent,
    },
    weekday,
    dom,
    sizes,
    topTx,
    payees,
    pace,
    spikes,
  };
};

const daysSpan = (monthKeys, rows) => {
  const todayKey = monthKeyOf(new Date());
  return monthKeys.reduce((s, k) => s + (k === todayKey ? new Date().getDate() : daysInMonth(k)), 0);
};

export const inr = (n, digits = 0) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;

export const inrShort = (n) => {
  const v = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (v >= 10000000) return `${sign}₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${sign}₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${sign}₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(v)}`;
};

export const pct = (x, digits = 0) => `${(x * 100).toFixed(digits)}%`;