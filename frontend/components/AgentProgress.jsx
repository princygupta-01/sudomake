'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const AGENT_STAGES = [
  { id: 1, name: 'Validating input…' },
  { id: 2, name: 'Extracting content…' },
  { id: 3, name: 'Merging & cleaning data…' },
  { id: 4, name: 'Analyzing key terms…' },
  { id: 5, name: 'Generating notes & Q&A…' },
  { id: 6, name: 'Saving notes…' },
];

export default function AgentProgress({ currentStage = 0, error = null }) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 py-6">
      <AnimatePresence mode="wait">
        {AGENT_STAGES.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isCompleted = currentStage > stage.id;
          const isPending = currentStage < stage.id;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-purple-500/10 border border-purple-500/30'
                  : isCompleted
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-gray-800/30 border border-gray-700/30'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {/* Stage Name */}
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-purple-300'
                    : isCompleted
                    ? 'text-green-300'
                    : 'text-gray-400'
                }`}
              >
                {stage.name}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}
    </div>
  );
}

