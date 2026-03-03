'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Zap, Shield, Target } from 'lucide-react';

export default function AnimatedTransition() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [100, 0]);

  const features = [
    {
      icon: Zap,
      title: 'AI-powered notes',
      color: 'from-purple-500 to-fuchsia-500',
    },
    {
      icon: Shield,
      title: 'Privacy-first design',
      color: 'from-fuchsia-500 to-pink-500',
    },
    {
      icon: Target,
      title: 'Lightning-fast processing',
      color: 'from-purple-500 to-violet-500',
    },
  ];

  return (
    <section
      ref={ref}
      className="relative w-full py-32 overflow-hidden"
      style={{ opacity }}
    >
      {/* Parallax Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/30 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>

      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px] opacity-30"></div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          style={{ y }}
          className="max-w-6xl mx-auto text-center space-y-12"
        >
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Built for Students & Hackathons
            </h2>
          </motion.div>

          {/* Floating Cards */}
          <div className="grid md:grid-cols-3 gap-8 pt-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5,
                      ease: 'easeInOut',
                    }}
                    className="bg-gradient-to-br from-purple-950/50 to-black border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

