import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
      <motion.button
        id="floating-add-btn"
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 transition-all cursor-pointer"
        aria-label="Add New Web App"
        title="Add New Web App"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
        
        {/* Tooltip on hover for desktop */}
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
          Add Web App
        </span>
      </motion.button>
    </div>
  );
};
