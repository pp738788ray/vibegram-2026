import { motion } from 'motion/react';

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-[#050505] px-6 py-12 overflow-hidden"
    >
      {/* Ambient Sunset-Neon radial glows */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[90px] opacity-35"
        style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[100px] opacity-35"
        style={{ background: 'radial-gradient(circle, #7B2CBF 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[85px] opacity-25"
        style={{ background: 'radial-gradient(circle, #FF2E93 0%, transparent 70%)' }}
      />

      {/* Top spacer */}
      <div className="h-6" aria-hidden="true" />

      {/* Center Logo, Brand Name, and Tagline */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.78, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          {/* Outer pulsing Sunset-Neon aura */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-3 rounded-[34px] vibe-gradient-bg blur-xl opacity-60"
          />
          <div className="relative w-24 h-24 rounded-[26px] p-[2px] vibe-gradient-bg shadow-[0_14px_45px_rgba(255,46,147,0.42)]">
            <img
              src="/assets/vibegram-icon.png"
              alt="VibeGram"
              className="w-full h-full rounded-[24px] object-cover block"
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[36px] leading-none font-bold tracking-tight text-white"
        >
          VibeGram
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2.5 text-[15px] font-semibold tracking-wide vibe-gradient-text"
        >
          Catch the Desi Vibe
        </motion.p>

        {/* Sleek animated launch progress line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="mt-7 w-28 h-[3px] rounded-full bg-white/[0.08] overflow-hidden"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 1.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full vibe-gradient-bg rounded-full"
          />
        </motion.div>
      </div>

      {/* Proud Made in India Badge at Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.10] backdrop-blur-md"
      >
        <span className="text-[12px] font-medium tracking-wide text-white/85">
          🇮🇳 Made in India • Indian Social Platform
        </span>
      </motion.div>
    </motion.div>
  );
}
