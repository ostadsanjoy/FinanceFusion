import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    key: 'expense',
    title: 'Smart Expense Tracking',
    text: 'Log transactions in seconds. Our categorization automatically organizes your spending so you know exactly where your money goes.',
    still: '/icons/receipts.png',
    moving: '/icons/receipts-anim.png',
    tint: '#EADFD0',
  },
  {
    key: 'budget',
    title: 'Dynamic Budgets',
    text: 'Set flexible limits that adapt to your lifestyle. Get visual alerts before you overspend, keeping you safely within your means.',
    still: '/icons/budget.png',
    moving: '/icons/budget-anim.png',
    tint: '#F1E9DE',
  },
  {
    key: 'analytics',
    title: 'Wealth Analytics',
    text: 'Turn raw data into actionable insights. Beautiful charts help you spot trends, cut unnecessary costs, and watch your savings grow.',
    still: '/icons/analytics.png',
    moving: '/icons/analytics-anim.png',
    tint: '#E4D6C3',
  },
];

const DEFAULT_ACTIVE = 1;
const LEFTS = ['0%', '29%', '58%'];
const BASE_ROTATE = [-5, 0, 5];
const SPRING = { type: 'spring', stiffness: 240, damping: 24, mass: 0.9 };

const useFan = () => {
  const query = '(min-width: 640px)';
  const [fan, setFan] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setFan(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return fan;
};

const FanCard = ({ feature, index, active, onActivate }) => {
  const isActive = active === index;
  const side = index < active ? -1 : 1;

  return (
    <motion.article
      tabIndex={0}
      onMouseEnter={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      onClick={() => onActivate(index)}
      initial={false}
      animate={{
        x: isActive ? 0 : side * 12,
        y: isActive ? -14 : 8,
        rotate: isActive ? 0 : BASE_ROTATE[index],
        scale: isActive ? 1.04 : 0.96,
        boxShadow: isActive
          ? '0 28px 50px -16px rgba(42,42,42,0.28)'
          : '0 10px 22px -14px rgba(42,42,42,0.18)',
      }}
      transition={SPRING}
      style={{ left: LEFTS[index], zIndex: isActive ? 30 : 20 - Math.abs(index - active) }}
      className="absolute top-0 h-full w-[42%] rounded-[28px] bg-white border border-black/5 overflow-hidden cursor-pointer outline-none flex flex-col will-change-transform"
    >
      <div
        className="relative h-[42%] shrink-0 flex items-center justify-center"
        style={{ backgroundColor: feature.tint }}
      >
        <img
          src={isActive ? feature.moving : feature.still}
          alt=""
          draggable={false}
          className="h-[82%] w-auto object-contain select-none pointer-events-none"
        />
      </div>

      <div className="flex-1 min-h-0 px-4 pt-3 pb-3 flex flex-col overflow-hidden">
        <h3 className="text-base font-bold tracking-tight leading-tight text-ink">
          {feature.title}
        </h3>
        <motion.p
          initial={false}
          animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: isActive ? 0.08 : 0 }}
          className="mt-1.5 text-[12.5px] leading-snug text-gray-500"
        >
          {feature.text}
        </motion.p>
      </div>
    </motion.article>
  );
};

const StackCard = ({ feature }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 rounded-3xl bg-white border border-black/5 shadow-sm p-4"
    >
      <div
        className="h-20 w-20 shrink-0 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: feature.tint }}
      >
        <img
          src={hovered ? feature.moving : feature.still}
          alt=""
          draggable={false}
          className="h-[80%] w-auto object-contain select-none"
        />
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-tight leading-tight text-ink">{feature.title}</h3>
        <p className="mt-1 text-[13px] leading-snug text-gray-500">{feature.text}</p>
      </div>
    </article>
  );
};

const FeatureFan = () => {
  const fan = useFan();
  const [active, setActive] = useState(DEFAULT_ACTIVE);

  useEffect(() => {
    FEATURES.forEach((f) => {
      const img = new Image();
      img.src = f.moving;
    });
  }, []);

  if (!fan) {
    return (
      <div className="flex flex-col gap-3">
        {FEATURES.map((f) => (
          <StackCard key={f.key} feature={f} />
        ))}
      </div>
    );
  }

  return (
    <div
      onMouseLeave={() => setActive(DEFAULT_ACTIVE)}
      className="relative w-full px-2 pt-4"
      style={{ height: 'clamp(250px, 33vh, 330px)' }}
    >
      <div className="relative h-full w-full">
        {FEATURES.map((f, i) => (
          <FanCard key={f.key} feature={f} index={i} active={active} onActivate={setActive} />
        ))}
      </div>
    </div>
  );
};

export default FeatureFan;