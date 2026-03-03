'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import CardSwap, { Card } from '@/components/CardSwap';
import { Layers, Brain, Sparkles } from "lucide-react";

export default function ProjectImpact() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full py-32 md:py-40 overflow-hidden"
      style={{ opacity }}
    >
      {/* Background Effects - Purple Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: '#030303' }}>
        {/* Subtle Purple Glow */}
        <div 
          className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-[600px] h-[400px] opacity-15 blur-[40px]"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
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

      {/* Animated Grid - Subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px] opacity-10"></div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* 2-Column Layout: Left (Static Text) + Right (Animated Cards) */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[600px]">
            {/* LEFT COLUMN - Static Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6 order-2 lg:order-1"
            >
              <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent" style={{ WebkitTextFillColor: 'transparent' }}>
                How LetsStud Actually Helps You Study
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
                From messy inputs to exam-ready clarity — fully automated.
              </p>
            </motion.div>

            {/* RIGHT COLUMN - Animated Cards */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative order-1 lg:order-2"
              style={{ height: '600px', position: 'relative' }}
            >
              <CardSwap
                cardDistance={60}
                verticalDistance={70}
                delay={2500}
                pauseOnHover={false}
                easing="elastic"
              >
                <Card className="relative overflow-hidden">
                  {/* Icon badge */}
                  <div className="absolute top-4 right-4 text-purple-400/80">
                    <Layers size={20} />
                  </div>

                  <span className="text-xs uppercase tracking-wider text-purple-400">
                    Learning Transformation
                  </span>

                  <h3 className="mt-2 text-xl font-semibold">
                    Input Chaos → Organized Knowledge
                  </h3>

                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                    Convert scattered videos, PDFs, and raw notes into clean, structured summaries automatically.
                    No more juggling multiple sources — everything flows into one clear, connected learning system
                    that makes sense instantly.
                  </p>

                  {/* Glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-purple-500/10" />
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-purple-400/80">
                    <Brain size={20} />
                  </div>

                  <span className="text-xs uppercase tracking-wider text-purple-400">
                    Active Recall
                  </span>

                  <h3 className="mt-2 text-xl font-semibold">
                    Passive Watching → Active Learning
                  </h3>

                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                    Stop watching and forgetting. LetsStud generates smart Q&A and revision-ready notes that trigger
                    active recall — helping you actually understand, retain, and revise with confidence.
                  </p>

                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-purple-500/10" />
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-purple-400/80">
                    <Sparkles size={20} />
                  </div>

                  <span className="text-xs uppercase tracking-wider text-purple-400">
                    Exam Readiness
                  </span>

                  <h3 className="mt-2 text-xl font-semibold">
                    Last-Minute Panic → Exam Confidence
                  </h3>

                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                    Replace stress with clarity. Lightning-fast processing delivers distraction-free notes in minutes,
                    turning last-minute panic into exam-ready confidence when it matters most.
                  </p>

                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-purple-500/10" />
                </Card>

              </CardSwap>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}


