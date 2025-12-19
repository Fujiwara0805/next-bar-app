'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'logo' | 'loading' | 'morphing' | 'reveal'>('logo');

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    setMounted(true);

    // Animation timeline
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Logo fade in (already happening via initial animation)
    // Phase 2: Show loading text after 800ms
    timers.push(setTimeout(() => setPhase('loading'), 800));

    // Phase 3: Start morphing (logo moves up) after 2000ms
    timers.push(setTimeout(() => setPhase('morphing'), 2000));

    // Phase 4: Reveal (blur clears) after 2800ms
    timers.push(setTimeout(() => setPhase('reveal'), 2800));

    // Complete after 3500ms
    timers.push(setTimeout(() => handleComplete(), 3500));

    return () => timers.forEach(clearTimeout);
  }, [handleComplete]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed inset-0 z-[100] overflow-hidden"
        style={{ backgroundColor: '#050505' }}
      >
        {/* Background: Oita night map with blur */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'blur(20px)' }}
          animate={{
            opacity: phase === 'reveal' ? 0.4 : 0.15,
            filter: phase === 'reveal' ? 'blur(0px)' : 'blur(20px)',
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          {/* Oita map imagery - using a dark map style */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/131.6126,33.2382,13,0/1200x800@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw')`,
              opacity: 0.6,
            }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 0%, #050505 70%)',
            }}
          />
        </motion.div>

        {/* Animated particles/lights effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: i % 2 === 0 ? '#F59E0B' : '#6366F1',
                boxShadow: `0 0 20px 5px ${i % 2 === 0 ? '#F59E0B' : '#6366F1'}`,
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Main content container */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          {/* Logo with glow animation - morphs to header position */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: phase === 'morphing' || phase === 'reveal' ? 0.5 : 1,
              opacity: 1,
              y: phase === 'morphing' || phase === 'reveal' ? '-40vh' : 0,
            }}
            transition={{
              duration: phase === 'morphing' ? 0.8 : 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative"
          >
            {/* Glow effect behind logo */}
            <motion.div
              className="absolute inset-0 -m-8"
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                background:
                  'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            {/* Logo */}
            <motion.img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
              alt="NIKENME+"
              className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 object-contain"
              animate={{
                filter: [
                  'drop-shadow(0 0 20px rgba(245,158,11,0.5))',
                  'drop-shadow(0 0 40px rgba(245,158,11,0.8))',
                  'drop-shadow(0 0 20px rgba(245,158,11,0.5))',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Loading text */}
          <AnimatePresence>
            {(phase === 'loading' || phase === 'morphing') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute"
                style={{ top: '60%' }}
              >
                <motion.p
                  className="text-[10px] sm:text-xs tracking-[0.4em] uppercase"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Loading Night Spots...
                </motion.p>

                {/* Loading dots */}
                <div className="flex justify-center gap-1 mt-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-amber-500"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tagline that appears during reveal */}
          <AnimatePresence>
            {phase === 'reveal' && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute text-white text-lg sm:text-2xl font-bold text-center"
                style={{
                  top: '55%',
                  textShadow: '0 0 30px rgba(245,158,11,0.5)',
                }}
              >
                夜の続きは、ここから
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background:
              'linear-gradient(to top, #050505 0%, transparent 100%)',
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}