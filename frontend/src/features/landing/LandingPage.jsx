import React, { Suspense, lazy, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import MagneticButton from '../../components/ui/MagneticButton';

const HeroCanvas = lazy(() => import('./scene/HeroCanvas'));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Hero = ({ navigate }) => {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
  });

  return (
    <section ref={sectionRef} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-canvas">

        <Suspense fallback={<div className="absolute inset-0" />}>
          <HeroCanvas className="absolute inset-0 z-0" progress={progressRef} />
        </Suspense>

        <div className="absolute inset-0 z-[5] bg-gradient-to-r from-canvas via-canvas/85 md:via-canvas/80 to-transparent w-full md:w-3/5 pointer-events-none" />

        <motion.nav
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-5 md:px-10 py-6"
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

        <div className="relative z-10 h-full flex items-center px-5 md:px-10">
          <div className="max-w-lg">
            <motion.span
              custom={0.1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="px-3 py-1 rounded-full bg-white/70 border border-black/5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-6 inline-block"
            >
              Privacy-first · v1.0
            </motion.span>

            <motion.h1
              custom={0.2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95] mb-6"
            >
              Finance Fusion<span className="text-accent">.</span>
            </motion.h1>

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
          </div>
        </div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-accent selection:text-white">

      <Hero navigate={navigate} />

      <footer className="mt-24 pb-8 text-center text-sm text-gray-300">
        <p>© 2026 Finance Fusion. Crafted by Sanjoy.</p>
      </footer>
    </div>
  );
};

export default LandingPage;