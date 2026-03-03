'use client';
import { Headphones } from "lucide-react";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight, FileUp } from 'lucide-react';

export default function Hero3D({ onUploadClick }) {
  return (
    <section className="relative h-screen w-full overflow-hidden" style={{ backgroundColor: '#030303' }}>
      {/* Background Effects - Purple Theme with Upward Hemisphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Center Purple Glow (Radial Gradient) */}
        <div 
          className="absolute top-[-20%] left-1/2 transform -translate-x-1/2 w-[800px] h-[600px] opacity-25 blur-[40px]"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
          }}
        />
        
        {/* Upward Hemisphere - Smooth curved horizon line */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
          style={{
            top: '40%',
            width: '200vw',
            height: '200vw',
            maxWidth: '3000px',
            maxHeight: '3000px',
            borderTop: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '50%',
            boxShadow: '0px -10px 60px rgba(168, 85, 247, 0.2), 0px -5px 30px rgba(139, 92, 246, 0.15)',
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.03) 0%, rgba(139, 92, 246, 0.01) 10%, transparent 25%)',
            clipPath: 'inset(0 0 50% 0)',
          }}
        />
        
        {/* Additional hemisphere layer for depth */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
          style={{
            top: '42%',
            width: '180vw',
            height: '180vw',
            maxWidth: '2800px',
            maxHeight: '2800px',
            borderTop: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '50%',
            boxShadow: '0px -8px 40px rgba(139, 92, 246, 0.1)',
            background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.02) 0%, transparent 20%)',
            clipPath: 'inset(0 0 50% 0)',
          }}
        />
        
        {/* Subtle noise/grain overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>

      {/* Content - Centered */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="container mx-auto px-4 text-center space-y-10">
          {/* Headline with glow and animation */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-tight">
              <motion.span 
                className="relative inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <span className="bg-gradient-to-b from-white via-gray-300 to-gray-400 bg-clip-text text-transparent relative" style={{ WebkitTextFillColor: 'transparent' }}>
                  Transform Your Study
                </span>
              </motion.span>
              <br />
              <motion.span
                className="relative inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(168,85,247,0.6)] relative" style={{ WebkitTextFillColor: 'transparent' }}>
                  Experience with AI
                </span>
              </motion.span>
            </h1>
            
            {/* Subtext with delayed fade */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl lg:text-3xl text-gray-300/90 max-w-4xl mx-auto leading-relaxed font-light"
            >
              Turn videos, PDFs, and notes into smart summaries and exam-ready content.
            </motion.p>
          </motion.div>

          {/* CTA Buttons with enhanced hover effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6"
          >
            <Button
              size="lg"
              onClick={() => onUploadClick('video')}
              className="text-xl px-10 py-8 text-white transition-all duration-300 hover:scale-[1.03] group rounded-lg relative z-20 overflow-hidden border-none"
              style={{
                background: 'linear-gradient(90deg, #9333ea 0%, #7c3aed 100%)',
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.4)';
              }}
            >
              <span className="relative flex items-center">
                <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
                Upload Video
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

