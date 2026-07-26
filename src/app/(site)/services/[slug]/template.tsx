'use client';

import { motion, useReducedMotion } from 'framer-motion';

// Next.js re-mounts `template.tsx` on every navigation (unlike layout.tsx),
// so this fires the entrance animation each time you land on a service page —
// including clicking between services from the /services list.
export default function ServiceTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
