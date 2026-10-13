import React from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

// Fades each page in on route change so navigation feels smooth instead of popping.
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}