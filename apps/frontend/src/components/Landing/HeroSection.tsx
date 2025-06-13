'use client';

// apps/frontend/src/components/Landing/HeroSection.tsx
import { motion } from 'framer-motion';
import styles from './HeroSection.module.scss';

export default function HeroSection() {
  return (
    <motion.section 
      className={styles.heroContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className={styles.glassPanel}>
        <motion.h1 
          className={styles.headline}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Your Journey, Live on Earth
        </motion.h1>
        
        <motion.p 
          className={styles.subline}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Track your adventures in real-time, share your story with the world
        </motion.p>
        
        <motion.div 
          className={styles.ctaContainer}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button className={`${styles.ctaButton} ${styles.primary}`}>
            Get Started
          </button>
          <button className={`${styles.ctaButton} ${styles.secondary}`}>
            View Demo
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
}