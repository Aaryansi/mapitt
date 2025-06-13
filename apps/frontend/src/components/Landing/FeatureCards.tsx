'use client';

// apps/frontend/src/components/Landing/FeatureCards.tsx
import { motion } from 'framer-motion';
import { MapPin, Route, Share2, Globe } from 'lucide-react';
import styles from './FeatureCards.module.scss';

const features = [
  {
    icon: MapPin,
    title: 'Pin Your Locations',
    description: 'Mark every place you visit with precision GPS tracking',
  },
  {
    icon: Route,
    title: 'Trace Your Path',
    description: 'Visualize your journey with beautiful interactive maps',
  },
  {
    icon: Share2,
    title: 'Share Your Story',
    description: 'Export and share your adventures with friends and family',
  },
  {
    icon: Globe,
    title: 'Explore Together',
    description: 'Connect with fellow travelers around the world',
  },
];

export default function FeatureCards() {
  return (
    <section className={styles.featureSection}>
      <motion.div 
        className={styles.featureGrid}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className={styles.featureCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <feature.icon className={styles.featureIcon} size={48} />
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureDescription}>{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}