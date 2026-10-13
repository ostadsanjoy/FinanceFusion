import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import MagneticButton from '../../components/ui/MagneticButton';

const HeroCanvas = lazy(() => import('./scene/HeroCanvas'));
const ConfettiPop = lazy(() => import('../../components/ui/ConfettiPop'));

const HEADLINE_PHRASES = ['Finance Fusion.', 'Log expenses.', 'Set budgets.', 'Watch money grow.'];

const VERTICAL_END = 2 / 3;
const PAN_END = VERTICAL_END + (1 - VERTICAL_END) * 0.8;

const renderPhrase = (text) =>
  text.endsWith('.') ? (
    <>
      {text.slice(0, -1)}
      <span className="text-accent">.</span>
    </>
  ) : (
    text
  );

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const LandingPage = () => {
  const navigate = useNavigate();
  const canvasWrapRef = useRef(null);
  const headlineWrapRef = useRef(null);
  const progressRef = useRef(0);
  const flipRef = useRef(0);
  const [headlineStep, setHeadlineStep] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [burstOrigin, setBurstOrigin] = useState({ x: 0, y: 0 });
  const [hasClickedHeadline, setHasClickedHeadline] = useState(false);
  const [confettiData, setConfettiData] = useState(null);

  useEffect(() => {
    fetch('/lottie/confetti.json')
      .then((res) => res.json())
      .then(setConfettiData)
      .catch(() => {});
    import('../../components/ui/ConfettiPop');
  }, []);

  const handleHeadlineClick = (e) => {
    const rect = headlineWrapRef.current.getBoundingClientRect();
    setBurstOrigin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHeadlineStep((s) => (s + 1) % HEADLINE_PHRASES.length);
    setBurstKey((k) => k + 1);
    setHasClickedHeadline(true);
  };

  const { scrollYProgress } = useScroll({
    target: canvasWrapRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = Math.min(v / VERTICAL_END, 1);
    flipRef.current = Math.min(Math.max((v - VERTICAL_END) / (1 - VERTICAL_END), 0), 1);
  });

  const detailsX = useTransform(scrollYProgress, [VERTICAL_END, PAN_END], ['100%', '0%']);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-accent selection:text-white">
      <div ref={canvasWrapRef} className="relative h-[550vh]">

        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">

          <div className="absolute inset-0 w-full h-full">
            <Suspense fallback={<div className="absolute inset-0" />}>
              <HeroCanvas className="absolute inset-0" progress={progressRef} flip={flipRef} />
            </Suspense>
            <div className="absolute bottom-0 inset-x-0 h-28 md:h-40 bg-gradient-to-t from-canvas to-transparent pointer-events-none" />
          </div>

          <motion.div
            style={{ x: detailsX }}
            className="absolute inset-y-0 right-0 w-full lg:w-1/2 z-30 flex flex-col justify-center px-6 md:px-10 lg:pl-10 lg:pr-16 overflow-y-auto"
          >
            <div className="max-w-xl w-full py-12">
              <span className="px-3 py-1 rounded-full bg-white/90 border border-black/5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 inline-block">
                Everything you need
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                Features designed for clarity and control.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-10">
                Managing money shouldn't feel like a second job. Finance Fusion gives you the exact tools you need to stay on top of your wealth without the overwhelming clutter.
              </p>

              <div className="flex flex-col gap-5">
                <div className="p-6 rounded-3xl bg-white/60 border border-black/5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:bg-white transition-colors">
                  <div className="w-14 h-14 shrink-0 bg-accent/10 text-accent rounded-2xl flex items-center justify-center text-2xl">
                    📊
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 tracking-tight">Smart Expense Tracking</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Log transactions in seconds. Our categorization automatically organizes your spending so you know exactly where your money goes.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/60 border border-black/5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:bg-white transition-colors">
                  <div className="w-14 h-14 shrink-0 bg-accent/10 text-accent rounded-2xl flex items-center justify-center text-2xl">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 tracking-tight">Dynamic Budgets</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Set flexible limits that adapt to your lifestyle. Get visual alerts before you overspend, keeping you safely within your means.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/60 border border-black/5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:bg-white transition-colors">
                  <div className="w-14 h-14 shrink-0 bg-accent/10 text-accent rounded-2xl flex items-center justify-center text-2xl">
                    🌱
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 tracking-tight">Wealth Analytics</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Turn raw data into actionable insights. Beautiful charts help you spot trends, cut unnecessary costs, and watch your savings grow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-x-0 top-0 z-10">
          <motion.nav
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex justify-between items-center px-5 md:px-10 py-6"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-ink rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">Finance Fusion</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline text-sm font-medium hover:text-accent transition-colors px-2 pointer-events-auto"
              >
                Login
              </button>
              <MagneticButton
                strength={0.3}
                onClick={() => navigate('/signup')}
                className="px-5 py-2.5 bg-ink text-white rounded-full text-sm font-medium gap-1.5 hover:shadow-lg transition-shadow pointer-events-auto"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>
          </motion.nav>

          <div className="max-w-lg px-5 md:px-10 pt-6">
            <motion.div
              ref={headlineWrapRef}
              custom={0.2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="relative inline-block mb-6 pointer-events-auto"
            >
              {burstKey > 0 && (
                <Suspense fallback={null}>
                  <ConfettiPop key={burstKey} x={burstOrigin.x} y={burstOrigin.y} animationData={confettiData} />
                </Suspense>
              )}

              <AnimatePresence mode="wait">
                <motion.h1
                  key={headlineStep}
                  onClick={handleHeadlineClick}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95] whitespace-nowrap cursor-pointer select-none"
                >
                  {renderPhrase(HEADLINE_PHRASES[headlineStep])}
                </motion.h1>
              </AnimatePresence>

              {!hasClickedHeadline && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="absolute -top-14 left-1 flex flex-col items-center gap-1 pointer-events-none"
                >
                  <span
                    style={{ fontFamily: "'Caveat', cursive" }}
                    className="text-2xl text-[#C9B59C] -rotate-3"
                  >
                    click it!
                  </span>
                  <motion.svg
                    width="20"
                    height="26"
                    viewBox="0 0 20 26"
                    fill="none"
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <path
                      d="M10 2V22"
                      stroke="#C9B59C"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 15L10 22L17 15"
                      stroke="#C9B59C"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </motion.svg>
                </motion.div>
              )}
            </motion.div>

            <motion.p
              custom={0.3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-lg text-gray-500 leading-relaxed mb-10 max-w-md"
            >
              Every rupee, tracked and put to work. Log expenses, set budgets,
              and watch your savings actually add up.
            </motion.p>

            <motion.div custom={0.4} variants={fadeUp} initial="hidden" animate="show" className="pointer-events-auto">
              <MagneticButton
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-ink text-white rounded-full font-medium text-lg shadow-xl gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </MagneticButton>
            </motion.div>

            <motion.div
              custom={0.6}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex items-center gap-2 mt-14 text-xs text-gray-400 font-medium"
            >
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
              Scroll to watch it fill up
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={0}
              className="mt-40 max-w-lg"
            >
              <span className="px-3 py-1 rounded-full bg-white/70 border border-black/5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 inline-block">
                Why it matters
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5 leading-tight">
                Money you can't see is money you can't manage.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-5 text-lg">
                Most people don't lose money to bad decisions — they lose it
                to invisibility. A coffee here, a forgotten subscription
                there, a small "just this once" splurge. None of it feels big
                in the moment. That's exactly the problem: your brain is bad
                at tracking hundreds of tiny decisions, and by the time you
                check your balance, the story has already been written.
              </p>
              <p className="text-gray-500 leading-relaxed mb-10 text-lg">
                It's not about earning more, either. Plenty of people with
                rising incomes still end every month wondering where it all
                went — because more money without more visibility just means
                bigger blind spots. The gap between what you earn and what
                you keep isn't closed by a raise. It's closed by knowing.
              </p>

              <h3 className="text-2xl font-semibold mb-4 tracking-tight">
                Finance Fusion makes it visible.
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5 text-lg">
                We built Finance Fusion around one idea: you can't fix what
                you can't see. Every rupee you log becomes part of a running,
                honest picture of where your money actually goes — not a
                guess, not a vague feeling, an actual number you can look at.
              </p>
              <p className="text-gray-500 leading-relaxed mb-10 text-lg">
                That visibility does the heavy lifting most budgeting apps
                leave to willpower. Instead of asking you to remember your
                limits, we show them to you before you cross them.
              </p>

              <ul className="space-y-5 mb-10">
                <li className="flex gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
                  <span className="text-gray-500 leading-relaxed">
                    <strong className="text-ink font-medium">Track everything in seconds</strong> —
                    no spreadsheets, no friction. Log an expense faster than
                    you'd forget it.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
                  <span className="text-gray-500 leading-relaxed">
                    <strong className="text-ink font-medium">See patterns, not just numbers</strong> —
                    spot the subscription you forgot, the category quietly
                    eating your budget.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
                  <span className="text-gray-500 leading-relaxed">
                    <strong className="text-ink font-medium">Get warned before you overspend</strong> —
                    set a limit once, and we'll flag it before it becomes a
                    problem, not after.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
                  <span className="text-gray-500 leading-relaxed">
                    <strong className="text-ink font-medium">Watch your savings compound</strong> —
                    every rupee you don't waste is a rupee working toward a
                    goal you actually chose.
                  </span>
                </li>
              </ul>

              <p className="text-gray-500 leading-relaxed text-lg">
                Personal finance isn't about restriction. It's about control —
                and control starts with seeing clearly.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <footer className="py-10 text-center text-sm text-gray-400 bg-canvas relative z-40">
        <p>© 2026 Finance Fusion. Crafted by Sanjoy Ostad.</p>
      </footer>
    </div>
  );
};

export default LandingPage;