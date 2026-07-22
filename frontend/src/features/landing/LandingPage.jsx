import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import MagneticButton from '../../components/ui/MagneticButton';

const HeroCanvas = lazy(() => import('./scene/HeroCanvas'));
const ConfettiPop = lazy(() => import('../../components/ui/ConfettiPop'));

const HEADLINE_PHRASES = ['Finance Fusion.', 'Log expenses.', 'Set budgets.', 'Watch money grow.'];

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
    progressRef.current = v;
  });

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-accent selection:text-white">
      <div ref={canvasWrapRef} className="relative h-[320vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Suspense fallback={<div className="absolute inset-0" />}>
            <HeroCanvas className="absolute inset-0" progress={progressRef} />
          </Suspense>
          <div className="absolute bottom-0 inset-x-0 h-28 md:h-40 bg-gradient-to-t from-canvas to-transparent pointer-events-none" />
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
                className="hidden sm:inline text-sm font-medium hover:text-accent transition-colors px-2"
              >
                Login
              </button>
              <MagneticButton
                strength={0.3}
                onClick={() => navigate('/signup')}
                className="px-5 py-2.5 bg-ink text-white rounded-full text-sm font-medium gap-1.5 hover:shadow-lg transition-shadow"
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
              className="relative inline-block mb-6"
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

            <motion.div custom={0.4} variants={fadeUp} initial="hidden" animate="show">
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

            <div className="mt-40 max-w-md">
              <span className="px-3 py-1 rounded-full bg-white/70 border border-black/5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 inline-block">
                More about Finance Fusion
              </span>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Placeholder — tell me what goes here
              </h2>
              <p className="text-gray-500 leading-relaxed">
                This block scrolls past while the coins are still dropping behind it.
                Tell me what you want it to say and I'll build it out properly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="min-h-[200vh] flex items-center justify-center px-6 text-center">
        <div className="max-w-xl">
          <span className="px-3 py-1 rounded-full bg-white/70 border border-black/5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 inline-block">
            Coming up
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">App details go here</h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            Placeholder section — tell me what you want here and I'll build it out.
          </p>
        </div>
      </section>

      <footer className="mt-24 pb-8 text-center text-sm text-gray-300">
        <p>© 2026 Finance Fusion. Crafted by Sanjoy.</p>
      </footer>
    </div>
  );
};

export default LandingPage;