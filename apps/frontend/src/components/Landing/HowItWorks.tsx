'use client';

// apps/frontend/src/components/Landing/HowItWorks.tsx
import { motion } from 'framer-motion';
import { Search, Navigation, Download } from 'lucide-react';
import styles from './HowItWorks.module.scss';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Search',
    description: 'Find and pin locations you want to visit or have explored',
  },
  {
    number: '02',
    icon: Navigation,
    title: 'Trace',
    description: 'Track your journey in real-time with live GPS updates',
  },
  {
    number: '03',
    icon: Download,
    title: 'Export',
    description: 'Download your travel data and create beautiful stories',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.howItWorksSection}>
      <motion.h2 
        className={styles.sectionTitle}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        How It Works
      </motion.h2>
      
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            className={styles.stepCard}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <div className={styles.stepNumber}>{step.number}</div>
            <div className={styles.stepContent}>
              <step.icon className={styles.stepIcon} size={32} />
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
            {index < steps.length - 1 && <div className={styles.stepConnector} />}
          </motion.div>
        ))}
      </div>
    </section>
  );
}