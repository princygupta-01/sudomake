'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <section className="container mx-auto px-4 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            LetsStud Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            Upload content and generate study notes instantly.
          </p>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <Card className="bg-gradient-to-br from-purple-950/50 to-black border-purple-500/30 backdrop-blur-xl max-w-3xl mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-300">No login is required. Start from the home page and download your notes.</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
