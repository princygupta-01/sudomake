'use client'; 
import { Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import html2pdf from "html2pdf.js";

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as htmlToImage from 'html-to-image';
import ReactFlow, { Background, Controls, Handle, MarkerType, MiniMap, Position } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { 
  Upload, 
  FileAudio, 
  FileVideo, 
  FileText, 
  Youtube, 
  Loader2, 
  Sparkles,
  Trash2,
  Search,
  Brain,
  ListChecks,
  Lightbulb,
  MessageSquareQuote,
  MessageSquare,
  Zap,
  Shield,
  Target,
  ArrowRight,
  Play,
  FileUp,
  Edit3,
  RefreshCw,
  Twitter,
  Github,
  Mail,
  HelpCircle,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Hero3D from '@/components/Hero3D';
import ProjectImpact from '@/components/ProjectImpact';
import AgentProgress from '@/components/AgentProgress';

// Configuration for video and step images
// Configuration for landing page assets
// Images should be placed in /public/images/steps/ and referenced as /images/steps/filename.jpg
// Videos should be placed in /public/videos/ and referenced as /videos/filename.mp4
const landingConfig = {
  howToVideo: {
    type: 'youtube', // 'youtube' | 'local'
    src: '', // YouTube ID (for type: 'youtube') or local video path (for type: 'local', e.g., '/videos/demo.mp4')
    // Example YouTube: src: 'dQw4w9WgXcQ'
    // Example Local: src: '/videos/demo.mp4'
  },
  steps: [
    {
      id: 1,
      title: 'Upload Your Content',
      description: 'Upload audio, video, PDF files, or paste text directly. You can also process YouTube videos by pasting the URL.',
      images: [
        // Multiple images supported: 1=centered, 2=side-by-side, 3+=auto grid
        // Images should be in /public/images/steps/ and referenced as /images/steps/filename.jpg
        { src: '/images/steps/upload-1.jpg', alt: 'Upload interface' },
        { src: '/images/steps/upload-2.jpg', alt: 'File selection' }
      ],
      color: 'purple'
    },
    {
      id: 2,
      title: 'AI Processing',
      description: 'Our AI transcribes your content using OpenAI Whisper, then generates comprehensive summaries with Gemini 2.0 Flash.',
      images: [
        { src: '/images/steps/processing.jpg', alt: 'AI processing' }
      ],
      color: 'fuchsia'
    },
    {
      id: 3,
      title: 'Review & Edit',
      description: 'Review the full transcript, make edits if needed, and regenerate summaries to perfect your notes.',
      images: [
        { src: '/images/steps/edit.jpg', alt: 'Edit interface' }
      ],
      color: 'purple'
    },
    {
      id: 4,
      title: 'Get Smart Notes',
      description: 'Receive 4 formats: bullet points, topic structure, key takeaways, and Q&A pairs. Save and organize all your notes.',
      images: [
        { src: '/images/steps/notes.jpg', alt: 'Smart notes' }
      ],
      color: 'fuchsia'
    }
  ]
};

const NODE_SIZES = {
  main: { width: 220, height: 64 },
  sub: { width: 190, height: 52 },
  default: { width: 190, height: 52 },
};

const sanitizeNodeId = (value, fallback = '') => {
  const id = String(value || '').trim();
  return id || fallback;
};

const normalizeMindmap = (mindmap, sections = []) => {
  const rawNodes = Array.isArray(mindmap?.nodes) ? mindmap.nodes : [];
  const rawEdges = Array.isArray(mindmap?.edges) ? mindmap.edges : [];

  const fallbackNodes = Array.isArray(sections)
    ? sections.map((section, index) => {
        const id = sanitizeNodeId(section?.id, `sec_${index + 1}`);
        return {
          id,
          label: section?.title || `Section ${index + 1}`,
          type: section?.related_to ? 'sub' : 'main',
        };
      })
    : [];

  const fallbackEdges = Array.isArray(sections)
    ? sections
        .map((section, index) => {
          const target = sanitizeNodeId(section?.id, `sec_${index + 1}`);
          const source = sanitizeNodeId(section?.related_to);
          if (!source) return null;
          return { source, target };
        })
        .filter(Boolean)
    : [];

  const sourceNodes = rawNodes.length > 0 ? rawNodes : fallbackNodes;
  const sourceEdges = rawEdges.length > 0 ? rawEdges : fallbackEdges;

  const nodeSet = new Set();
  const nodes = sourceNodes
    .map((node, index) => {
      const id = sanitizeNodeId(node?.id, `node_${index + 1}`);
      if (!id || nodeSet.has(id)) return null;
      nodeSet.add(id);
      const type = node?.type === 'main' ? 'main' : 'sub';
      return {
        id,
        type,
        data: { label: node?.label || id },
        position: { x: 0, y: 0 },
      };
    })
    .filter(Boolean);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = sourceEdges
    .map((edge, index) => {
      const source = sanitizeNodeId(edge?.source);
      const target = sanitizeNodeId(edge?.target);
      if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) return null;
      return {
        id: sanitizeNodeId(edge?.id, `edge_${index + 1}`),
        source,
        target,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
        animated: false,
      };
    })
    .filter(Boolean);

  return { nodes, edges };
};

const getLayoutedMindmap = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 90,
    ranksep: 220,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    const size = NODE_SIZES[node.type] || NODE_SIZES.default;
    dagreGraph.setNode(node.id, size);
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const size = NODE_SIZES[node.type] || NODE_SIZES.default;
    const position = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - size.width / 2,
        y: position.y - size.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function MainMindMapNode({ data }) {
  return (
    <div className="rounded-full border border-indigo-500/40 bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className="mr-2">{data.label}</span>
      <span className="text-[10px] opacity-80">{data.expanded ? '−' : '+'}</span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

function SubMindMapNode({ data }) {
  return (
    <div className="rounded-full border border-indigo-400 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className="mr-2">{data.label}</span>
      <span className="text-[10px] text-slate-500">{data.expanded ? '−' : '+'}</span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const mindMapNodeTypes = {
  main: MainMindMapNode,
  sub: SubMindMapNode,
};

// Animated Step Component
function StepItem({ step, index, isEven }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-100px' });
  const colorClass = step.color === 'purple' ? 'purple' : 'fuchsia';
  const borderColor = step.color === 'purple' ? 'border-purple-600' : 'border-fuchsia-600';
  const bgColor = step.color === 'purple' ? 'bg-purple-950/50' : 'bg-fuchsia-950/50';
  const textColor = step.color === 'purple' ? 'text-purple-300' : 'text-fuchsia-300';
  const gradientFrom = step.color === 'purple' ? 'from-purple-950/50' : 'from-fuchsia-950/50';
  const shadowColor = step.color === 'purple' ? 'shadow-purple-500/50' : 'shadow-fuchsia-500/50';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`relative flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-start gap-6 md:gap-12`}
    >
      {/* Animated Circle Marker */}
      <motion.div
        className={`absolute left-8 md:left-1/2 w-5 h-5 rounded-full bg-white ${borderColor} border-4 shadow-lg ${shadowColor} transform md:-translate-x-1/2 z-10`}
        animate={isInView ? {
          scale: [1, 1.3, 1.2],
          boxShadow: [
            `0 0 0 0 rgba(${step.color === 'purple' ? '168, 85, 247' : '236, 72, 153'}, 0.4)`,
            `0 0 0 10px rgba(${step.color === 'purple' ? '168, 85, 247' : '236, 72, 153'}, 0)`,
            `0 0 0 0 rgba(${step.color === 'purple' ? '168, 85, 247' : '236, 72, 153'}, 0)`
          ],
          y: [0, 4, 0]
        } : { scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Content */}
      <motion.div
        className={`md:w-1/2 ${isEven ? 'md:pl-12 md:text-left' : 'md:pr-12 md:text-right'} pl-20 md:pl-0`}
        initial={{ opacity: 0, x: isEven ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? 30 : -30 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      >
        <div className="space-y-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${bgColor} border ${borderColor}/30`}>
            <span className={`text-sm font-semibold ${textColor}`}>Step {step.id}</span>
          </div>
          <h4 className="text-2xl md:text-3xl font-bold text-white">{step.title}</h4>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed">
            {step.description}
          </p>
        </div>
      </motion.div>

      {/* Images - Config-Driven with Multiple Layout Support */}
      <motion.div
        className={`md:w-1/2 ${isEven ? 'md:pr-12' : 'md:pl-12'} pl-20 md:pl-0 w-full`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      >
        {/* 1 Image: Centered */}
        {step.images.length === 1 ? (
          <motion.div
            className="w-full h-48 md:h-64 rounded-xl bg-gradient-to-br from-purple-950/50 to-black border border-purple-500/30 overflow-hidden shadow-lg relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            whileInView={{ boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)' }}
          >
            {step.images[0]?.src ? (
              <motion.img
                src={step.images[0].src}
                alt={step.images[0].alt || 'Step image'}
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                onError={(e) => {
                  // Image failed to load - show placeholder
                  e.target.style.display = 'none';
                  e.target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {/* Empty placeholder if no image or image failed to load */}
            <div className={`absolute inset-0 flex items-center justify-center ${step.images[0]?.src ? 'hidden' : ''}`}>
              <div className="text-center space-y-2">
                <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto rounded-lg bg-gradient-to-br ${bgColor} border ${borderColor}/30 flex items-center justify-center opacity-50`}></div>
                <p className={`text-xs ${textColor} opacity-50`}>Image placeholder</p>
              </div>
            </div>
          </motion.div>
        ) : step.images.length === 2 ? (
          /* 2 Images: Side-by-side */
          <div className="grid grid-cols-2 gap-4">
            {step.images.map((img, imgIndex) => (
              <motion.div
                key={imgIndex}
                className="w-full h-48 md:h-64 rounded-xl bg-gradient-to-br from-purple-950/50 to-black border border-purple-500/30 overflow-hidden shadow-lg relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, delay: 0.3 + (imgIndex * 0.1), ease: 'easeOut' }}
                whileInView={{ boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)' }}
              >
                {img?.src ? (
                  <motion.img
                    src={img.src}
                    alt={img.alt || `Step image ${imgIndex + 1}`}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6, delay: 0.4 + (imgIndex * 0.1), ease: 'easeOut' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${img?.src ? 'hidden' : ''}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${bgColor} border ${borderColor}/30 opacity-50`}></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : step.images.length > 2 ? (
          /* 3+ Images: Auto Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {step.images.map((img, imgIndex) => (
              <motion.div
                key={imgIndex}
                className="w-full h-40 md:h-48 rounded-xl bg-gradient-to-br from-purple-950/50 to-black border border-purple-500/30 overflow-hidden shadow-lg relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, delay: 0.3 + (imgIndex * 0.1), ease: 'easeOut' }}
                whileInView={{ boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)' }}
              >
                {img?.src ? (
                  <motion.img
                    src={img.src}
                    alt={img.alt || `Step image ${imgIndex + 1}`}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6, delay: 0.4 + (imgIndex * 0.1), ease: 'easeOut' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${img?.src ? 'hidden' : ''}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${bgColor} border ${borderColor}/30 opacity-50`}></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* No images: Empty placeholder */
          <div className="w-full h-48 md:h-64 rounded-xl bg-gradient-to-br from-purple-950/50 to-black border border-purple-500/30 flex items-center justify-center shadow-lg">
            <div className="text-center space-y-2">
              <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto rounded-lg bg-gradient-to-br ${bgColor} border ${borderColor}/30 opacity-50`}></div>
              <p className={`text-xs ${textColor} opacity-50`}>No images configured</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Features Section Component with Scroll Animations
function FeaturesSection() {
  const featuresRef = useRef(null);
  const features = [
    {
      icon: Brain,
      title: 'AI Transcription',
      description: 'OpenAI Whisper converts audio/video to accurate text transcripts in seconds',
      gradient: 'from-purple-600 to-fuchsia-600',
      shadow: 'shadow-purple-500/30',
    },
    {
      icon: ListChecks,
      title: 'Smart Summaries',
      description: '4 AI-generated formats: bullet points, topics, takeaways, and Q&A',
      gradient: 'from-fuchsia-600 to-pink-600',
      shadow: 'shadow-fuchsia-500/30',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Process hours of content in minutes with Gemini 2.0 Flash',
      gradient: 'from-violet-600 to-purple-600',
      shadow: 'shadow-violet-500/30',
    },
    {
      icon: FileText,
      title: 'Multi-Format',
      description: 'Support for audio, video, PDF, and text files - all in one place',
      gradient: 'from-pink-600 to-rose-600',
      shadow: 'shadow-pink-500/30',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Files processed in-memory only, deleted immediately after transcription',
      gradient: 'from-indigo-600 to-blue-600',
      shadow: 'shadow-indigo-500/30',
    },
    {
      icon: Target,
      title: 'Study Ready',
      description: 'Generate Q&A pairs perfect for exam preparation and revision',
      gradient: 'from-cyan-600 to-teal-600',
      shadow: 'shadow-cyan-500/30',
    },
  ];

  return (
    <section ref={featuresRef} className="container mx-auto px-4 pb-40">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Section Header with Animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <h3 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            Powerful Features
          </h3>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Everything you need to transform content into actionable insights
          </p>
        </motion.div>

        {/* Feature Cards with Staggered Animation */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-purple-950/50 to-black border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 backdrop-blur-sm group h-full">
                  <CardHeader className="pb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <CardTitle className="text-white text-2xl mb-3">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-300 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Step Roadmap Section Component
function StepRoadmapSection() {
  const timelineRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start end', 'end start']
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section className="container mx-auto px-4 pb-40">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Section Header */}
        <div className="text-center space-y-6">
          <h3 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            How It Works
          </h3>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transform your content into smart notes in just a few simple steps
          </p>
        </div>

        {/* Timeline */}
        <div className="relative" ref={timelineRef}>
          {/* Animated Vertical Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-800 transform -translate-x-1/2 overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-purple-600 via-fuchsia-600 to-purple-600"
              style={{ height: lineHeight }}
            />
          </div>
          <div className="md:hidden absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600 via-fuchsia-600 to-purple-600"></div>

          {/* Steps - Config Driven */}
          <div className="space-y-20 md:space-y-24">
            {landingConfig.steps.map((step, index) => (
              <StepItem
                key={step.id}
                step={step}
                index={index}
                isEven={index % 2 === 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LetsStudApp() {
  const router = useRouter();
  const [pdfFile, setPdfFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [textInput, setTextInput] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [textLoading, setTextLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeView, setActiveView] = useState('landing'); // landing, upload, result, notes
  const [uploadMode, setUploadMode] = useState('video'); // video or notes
  const [activeTab, setActiveTab] = useState('upload'); // for tabs when not on landing
  const [resultTab, setResultTab] = useState('summary'); // single Notes tab (summary view)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const mindmapContainerRef = useRef(null);

  const isAnyLoading = youtubeLoading || fileLoading || textLoading;
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const getBackendBaseUrl = () => backendBaseUrl.trim();

  const callBackend = async (payload, isFormData = false) => {
    console.log('Calling backend:', backendBaseUrl + '/analyze');

    return await fetch(`${backendBaseUrl}/analyze`, {
      method: 'POST',
      headers: isFormData ? undefined : {
        'Content-Type': 'application/json',
      },
      body: isFormData ? payload : JSON.stringify(payload),
    });
  };

  const normalizeNotes = (notes) => (notes || '').replace(/\r\n/g, '\n').trim();

  const extractSectionBody = (notes, headingPattern) => {
    const normalized = normalizeNotes(notes);
    const regex = new RegExp(`^#{1,6}\\s*${headingPattern}\\s*$`, 'im');
    const match = normalized.match(regex);
    if (!match || match.index === undefined) return '';
    const from = normalized.slice(match.index + match[0].length).trimStart();
    const untilNextHeading = from.search(/^#{1,6}\s+/m);
    return (untilNextHeading === -1 ? from : from.slice(0, untilNextHeading)).trim();
  };

  const extractBulletPoints = (notes) => {
    const normalized = normalizeNotes(notes);
    const section = extractSectionBody(normalized, '(bullet\\s*notes?|summary)');
    const source = section || normalized;
    const bullets = source
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^([-*•]|\d+\.)\s+/.test(line))
      .map((line) => line.replace(/^([-*•]|\d+\.)\s+/, '').trim())
      .filter(Boolean);
    if (bullets.length > 0) return bullets;
    return source
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  };

  const extractTopics = (notes) => {
    const normalized = normalizeNotes(notes);
    const headings = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
      .filter((line) => !/^(summary|key takeaways?|bullet notes?)$/i.test(line));
    if (headings.length > 0) return headings;
    const section = extractSectionBody(normalized, 'topics?|topic[-\\s]*wise');
    if (section) {
      return section
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    return normalized
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 6);
  };

  const extractTakeaways = (notes) => {
    const normalized = normalizeNotes(notes);
    const section = extractSectionBody(normalized, 'key\\s*takeaways?');
    const source = section || normalized;
    const takeaways = source
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^([-*•]|\d+\.)\s+/.test(line))
      .map((line) => line.replace(/^([-*•]|\d+\.)\s+/, '').trim())
      .filter(Boolean);
    if (takeaways.length > 0) return takeaways.slice(0, 8);
    return source
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  };

  const extractSummaryText = (notes) => {
    const normalized = normalizeNotes(notes);
    const summarySection = extractSectionBody(normalized, 'summary');
    return summarySection || normalized;
  };

  const buildSummaryFormats = (notes) => ({
    bulletNotes: extractBulletPoints(notes),
    topicWise: extractTopics(notes),
    keyTakeaways: extractTakeaways(notes),
  });

  const buildResultFromResponse = ({ data, title, sourceType, source, youtubeUrl }) => {
    const structured = data && typeof data === 'object' && data.notes && typeof data.notes === 'object'
      ? data.notes
      : null;

    const transcript = typeof data?.transcript === 'string'
      ? data.transcript
      : typeof structured?.transcript === 'string'
        ? structured.transcript
        : typeof data?.notes === 'string'
          ? data.notes
          : '';

    const summary = typeof data?.summary === 'string'
      ? data.summary
      : typeof structured?.summary === 'string'
        ? structured.summary
        : extractSummaryText(transcript);

    const rawSections = Array.isArray(data?.sections)
      ? data.sections
      : Array.isArray(structured?.sections)
        ? structured.sections
        : [];

    const sections = rawSections.map((section, index) => ({
      ...section,
      id: sanitizeNodeId(section?.id, `sec_${index + 1}`),
      title: section?.title || `Section ${index + 1}`,
      description: section?.description || '',
      keywords: Array.isArray(section?.keywords) ? section.keywords : [],
      related_to: sanitizeNodeId(section?.related_to) || null,
    }));

    const mindmap = normalizeMindmap(
      data?.mindmap || structured?.mindmap || null,
      sections
    );

    return {
      title,
      transcript,
      summary,
      source,
      sourceType,
      youtubeUrl,
      sections,
      mindmap,
      summaryFormats: buildSummaryFormats(transcript || summary),
    };
  };

  const layoutedMindmap = useMemo(() => {
    if (!currentResult?.mindmap?.nodes?.length) return { nodes: [], edges: [] };
    return getLayoutedMindmap(currentResult.mindmap.nodes, currentResult.mindmap.edges || []);
  }, [currentResult?.mindmap]);

  const rootNodeIds = useMemo(() => {
    if (!layoutedMindmap.nodes.length) return [];

    const incomingCount = new Map(layoutedMindmap.nodes.map((node) => [node.id, 0]));
    layoutedMindmap.edges.forEach((edge) => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    });

    return layoutedMindmap.nodes
      .map((node) => node.id)
      .filter((nodeId) => (incomingCount.get(nodeId) || 0) === 0);
  }, [layoutedMindmap]);

  const visibleMindmap = useMemo(() => {
    if (!layoutedMindmap.nodes.length) return { nodes: [], edges: [] };

    const incomingCount = new Map();
    const childrenMap = new Map();
    layoutedMindmap.nodes.forEach((node) => {
      incomingCount.set(node.id, 0);
      childrenMap.set(node.id, []);
    });

    layoutedMindmap.edges.forEach((edge) => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
      const children = childrenMap.get(edge.source) || [];
      children.push(edge.target);
      childrenMap.set(edge.source, children);
    });

    const rootIds = layoutedMindmap.nodes
      .map((node) => node.id)
      .filter((id) => (incomingCount.get(id) || 0) === 0);

    const visibleNodeIds = new Set(rootIds);
    const queue = [...rootIds];

    while (queue.length > 0) {
      const parentId = queue.shift();
      if (!expandedNodes.has(parentId)) continue;
      const children = childrenMap.get(parentId) || [];
      children.forEach((childId) => {
        if (visibleNodeIds.has(childId)) return;
        visibleNodeIds.add(childId);
        queue.push(childId);
      });
    }

    const visibleNodes = layoutedMindmap.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        expanded: expandedNodes.has(node.id),
      },
      hidden: !visibleNodeIds.has(node.id),
    }));

    const visibleEdges = layoutedMindmap.edges.map((edge) => {
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);
      return {
        ...edge,
        animated: true,
        hidden: !(sourceVisible && targetVisible),
      };
    });

    return { nodes: visibleNodes, edges: visibleEdges };
  }, [layoutedMindmap, expandedNodes]);

  useEffect(() => {
    if (!currentResult?.mindmap?.nodes?.length) {
      setExpandedNodes(new Set());
      return;
    }
    setExpandedNodes(new Set());
  }, [currentResult?.mindmap]);

  const expandAllMindmap = () => {
    const allNodeIds = layoutedMindmap.nodes.map((node) => node.id);
    setExpandedNodes(new Set(allNodeIds));
  };

  const collapseAllMindmap = () => {
    setExpandedNodes(new Set());
  };

  const handleMindMapNodeClick = (_, node) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });

    const section = (currentResult?.sections || []).find((entry) => entry?.id === node.id);
    if (section) {
      setSelectedSection(section);
      setSectionDialogOpen(true);
      setTimeout(() => {
        document
          .getElementById(`section-${section.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const exportMindMap = async () => {
    if (!mindmapContainerRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(mindmapContainerRef.current, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = 'letsstud_mindmap.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      toast.error('Failed to export mind map image');
    }
  };

  const LOCAL_NOTES_KEY = 'letsstud_notes';

  const readLocalNotes = () => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_NOTES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeLocalNotes = (items) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(items));
  };

  // Fetch all notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async (search = '') => {
    try {
      setLoadingNotes(true);
      const allNotes = readLocalNotes();
      const query = search.trim().toLowerCase();
      const filtered = !query
        ? allNotes
        : allNotes.filter((note) =>
            `${note.title || ''} ${note.transcript || ''}`.toLowerCase().includes(query)
          );
      setNotes(filtered);
    } catch (error) {
      toast.error('Failed to fetch notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleMediaFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setMediaFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  const handlePdfFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setPdfFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  const processFile = async () => {
    if (!mediaFile) {
      toast.error('Please select an audio or video file');
      return;
    }

    setFileLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('summary_type', 'detailed');

      const response = await callBackend(formData, true);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Media analysis failed');
      }

      const sourceType = mediaFile.type.startsWith('audio/') ? 'audio' : 'video';
      const nextResult = buildResultFromResponse({
        data,
        title: mediaFile.name || 'Media Analysis',
        source: sourceType,
        sourceType,
      });
      setCurrentResult(nextResult);
      setEditedTranscript(nextResult.transcript || '');
      setResultTab('summary');
      setActiveView('result');
      toast.success('Media analysis completed');
    } catch (error) {
      toast.error(error.message || 'Failed to analyze media file');
    } finally {
      setFileLoading(false);
    }
  };

  const processPDF = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }

    setFileLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('summary_type', 'detailed');

      const response = await callBackend(formData, true);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'PDF analysis failed');
      }

      const nextResult = buildResultFromResponse({
        data,
        title: pdfFile.name || 'PDF Analysis',
        source: 'pdf',
        sourceType: 'pdf',
      });
      setCurrentResult(nextResult);
      setEditedTranscript(nextResult.transcript || '');
      setResultTab('summary');
      setActiveView('result');
      toast.success('PDF analysis completed');
    } catch (error) {
      toast.error(error.message || 'Failed to analyze PDF');
    } finally {
      setFileLoading(false);
    }
  };

  const processText = async () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setTextLoading(true);
    try {
      const response = await callBackend({
        text_input: textInput,
        summary_type: 'detailed',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Text analysis failed');
      }

      const nextResult = buildResultFromResponse({
        data,
        title: 'Text Analysis',
        source: 'text',
        sourceType: 'text',
      });
      setCurrentResult(nextResult);
      setEditedTranscript(nextResult.transcript || '');
      setResultTab('summary');
      setActiveView('result');
      toast.success('Text analysis completed');
    } catch (error) {
      toast.error(error.message || 'Failed to analyze text');
    } finally {
      setTextLoading(false);
    }
  };

  const processYouTube = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setYoutubeLoading(true);
    try {
      const response = await callBackend({
        youtube_url: youtubeUrl.trim(),
        enable_ocr: true,
        enable_subtitles: true,
        summary_type: 'detailed',
        use_scene_detection: true,
        use_streaming: false,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'YouTube analysis failed');
      }

      const nextResult = buildResultFromResponse({
        data,
        title: 'YouTube Analysis',
        source: 'youtube',
        sourceType: 'youtube',
        youtubeUrl: youtubeUrl.trim(),
      });
      setCurrentResult(nextResult);
      setEditedTranscript(nextResult.transcript || '');
      setResultTab('summary');
      setActiveView('result');
      toast.success('YouTube analysis completed');
    } catch (error) {
      toast.error(error.message || 'Failed to analyze YouTube video');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const regenerateNotes = async () => {
    if (!editedTranscript.trim()) {
      toast.error('Transcript is empty');
      return;
    }

    if (currentResult) {
      setCurrentResult({
        ...currentResult,
        transcript: editedTranscript,
        summary: extractSummaryText(editedTranscript),
        sections: currentResult.sections || [],
        mindmap: normalizeMindmap(currentResult.mindmap, currentResult.sections || []),
        summaryFormats: buildSummaryFormats(editedTranscript),
      });
      toast.success('Notes regenerated from edited transcript');
    }
  };

  const saveNote = async () => {
    if (!currentResult) return;

    try {
      const allNotes = readLocalNotes();
      const id = crypto.randomUUID();
      const note = {
        ...currentResult,
        id,
        firestoreId: id,
        createdAt: new Date().toISOString(),
      };
      writeLocalNotes([note, ...allNotes]);
      toast.success('Note saved successfully!');
      fetchNotes();
      setCurrentResult(null);
      setPdfFile(null);
      setMediaFile(null);
      setTextInput('');
      setYoutubeUrl('');
      setActiveView('notes');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const deleteNote = async (firestoreId) => {
    try {
      const remaining = readLocalNotes().filter(
        (note) => note.firestoreId !== firestoreId && note.id !== firestoreId
      );
      writeLocalNotes(remaining);
      toast.success('Note deleted');
      fetchNotes(searchQuery);
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleSearch = () => {
    fetchNotes(searchQuery);
  };

  const handleUploadClick = () => {
    setUploadMode('video');
    setActiveView('upload');
  };

  

const downloadNotesFile = (type = "txt") => {
  const element = document.getElementById("notes-content");

  if (type === "txt") {
    const text = currentResult?.summary || "";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "letsstud_notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (type === "pdf") {
    const opt = {
      margin: 0.5,
      filename: "letsstud_notes.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opt).from(element).save();
  }
};

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !currentResult) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(`${getBackendBaseUrl()}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: currentResult?.transcript || currentResult?.summary || '',
          question: userMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Chat request failed');
      }

      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data?.answer || 'No answer returned.' },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to get AI response right now.' },
      ]);
      toast.error(error.message || 'Failed to get AI response');
    } finally {
      setChatLoading(false);
    }
  };

  // Landing Page View
  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Gradient Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-950 to-black opacity-90"></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"></div>
        
        {/* Animated Grid */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        <div className="relative z-10">
          {/* Header with Glassmorphism */}
          <header className="border-b border-purple-900/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
            <div className="container mx-auto px-4 py-5">
              <div className="flex items-center justify-between">
                {/* Left: Logo + Navigation */}
                <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300">
                    <div className="p-2.5 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-xl shadow-lg shadow-purple-500/50">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                        LetsStud
                      </h1>
                    </div>
                  </Link>
                  
                  {/* Center Navigation */}
                  <nav className="hidden md:flex items-center gap-4 ml-6">
                  </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveView('upload')}
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.03]"
                  >
                    Start Creating
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* 3D Hero Section */}
          <Hero3D onUploadClick={handleUploadClick} />

          {/* Project Impact Section */}
          <ProjectImpact />

          {/* Features Section - Enhanced with Animations */}
          <FeaturesSection />

          {/* How to Use Video Section - Fade-in on scroll only */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="container mx-auto px-4 pb-40"
          >
            <div className="max-w-5xl mx-auto space-y-12 text-center">
              <div className="space-y-6">
                <h3 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                  How to Use LetsStud
                </h3>
                <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Watch how easy it is to transform your content into smart notes
                </p>
              </div>
              
              {/* Video - Fully Config-Driven */}
              <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-black backdrop-blur-sm">
                {landingConfig.howToVideo.type === 'youtube' && landingConfig.howToVideo.src ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${landingConfig.howToVideo.src}`}
                    title="How to Use LetsStud"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : landingConfig.howToVideo.type === 'local' && landingConfig.howToVideo.src ? (
                  <video
                    src={landingConfig.howToVideo.src}
                    controls
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Video failed to load - show fallback
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : null}
                {/* Fallback container - shown if video src is invalid or not configured */}
                {(!landingConfig.howToVideo.src || 
                  (landingConfig.howToVideo.type === 'local' && !landingConfig.howToVideo.src?.startsWith('/'))) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                        <Play className="w-10 h-10 text-white ml-1" />
                      </div>
                      <p className="text-gray-400 text-lg">Video coming soon</p>
                      <p className="text-gray-500 text-sm">Configure video in landingConfig.howToVideo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Step-by-Step Roadmap */}
          <StepRoadmapSection />

          {/* Footer CTA */}
          <section className="container mx-auto px-4 pb-32">
            <div className="max-w-5xl mx-auto">
              <Card className="bg-gradient-to-br from-purple-900/60 via-fuchsia-900/60 to-purple-900/60 border-purple-500/50 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(168,85,247,0.4),rgba(236,72,153,0.2),rgba(168,85,247,0))]"></div>
                <CardContent className="pt-20 pb-20 px-8 relative z-10">
                  <div className="text-center space-y-8">
                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                      Ready to Transform Your Content?
                    </h3>
                    <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
                      Start creating smart notes with AI-powered transcription and summarization
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                      <Button 
                        size="lg"
                        onClick={() => handleUploadClick('video')}
                        className="text-xl px-12 py-8 bg-white text-purple-900 hover:bg-purple-50 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 rounded-xl font-semibold"
                      >
                        Get Started Free
                        <ArrowRight className="w-6 h-6 ml-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-purple-900/20 bg-black/40 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-16">
              <div className="max-w-7xl mx-auto space-y-12">
                {/* Main Footer Content - 4 Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                  {/* Column 1: Brand */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-xl shadow-lg shadow-purple-500/50">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                          LetsStud
                        </h4>
                        <p className="text-sm text-gray-400">Powered by Whisper + Gemini</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Transform your content into smart notes with AI-powered transcription and summarization.
                    </p>
                    {/* Social Icons */}
                    <div className="flex items-center gap-3 pt-2">
                      <a 
                        href="https://twitter.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-purple-950/50 border border-purple-500/30 flex items-center justify-center hover:bg-purple-900/50 hover:border-purple-400/50 transition-all duration-300 hover:scale-110"
                        aria-label="Twitter"
                      >
                        <Twitter className="w-5 h-5 text-purple-300" />
                      </a>
                      <a 
                        href="https://youtube.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-purple-950/50 border border-purple-500/30 flex items-center justify-center hover:bg-purple-900/50 hover:border-purple-400/50 transition-all duration-300 hover:scale-110"
                        aria-label="YouTube"
                      >
                        <Youtube className="w-5 h-5 text-purple-300" />
                      </a>
                      <a 
                        href="https://github.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-purple-950/50 border border-purple-500/30 flex items-center justify-center hover:bg-purple-900/50 hover:border-purple-400/50 transition-all duration-300 hover:scale-110"
                        aria-label="GitHub"
                      >
                        <Github className="w-5 h-5 text-purple-300" />
                      </a>
                    </div>
                  </div>

                  {/* Column 2: Product */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-white">Product</h5>
                    <ul className="space-y-3 text-sm text-gray-400">
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Features</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Pricing</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">How It Works</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Use Cases</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">API</a>
                      </li>
                    </ul>
                  </div>

                  {/* Column 3: Resources */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-white">Resources</h5>
                    <ul className="space-y-3 text-sm text-gray-400">
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Documentation
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          Help Center
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Blog</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Tutorials</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Community</a>
                      </li>
                    </ul>
                  </div>

                  {/* Column 4: Company */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-white">Company</h5>
                    <ul className="space-y-3 text-sm text-gray-400">
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">About</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Contact
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Privacy Policy</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Terms of Service</a>
                      </li>
                      <li>
                        <a href="#" className="hover:text-purple-300 transition-colors cursor-pointer">Security</a>
                      </li>
                    </ul>
                    {/* Features Badge */}
                    <div className="pt-4 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs text-purple-300">Privacy First</span>
                        <span className="px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs text-purple-300">No Storage Costs</span>
                        <span className="px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs text-purple-300">AI Powered</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-purple-900/20">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                      © 2025 LetsStud. All rights reserved.
                    </p>
                    <p className="text-xs text-gray-600">
                      Built with ❤️ using Next.js, Whisper, and Gemini
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Rest of the app (upload, results, notes views)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Navigation */}
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveView('landing')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    LetsStud
                  </h1>
                  <p className="text-sm text-muted-foreground">AI-Powered Note Generation</p>
                </div>
              </button>
              
              {/* Center Navigation */}
              <nav className="hidden md:flex items-center gap-3 ml-6">
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs hidden lg:block">
                
              </Badge>
              <Button
                size="sm"
                onClick={() => setActiveView('upload')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                New Upload
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeView === 'upload' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Process YouTube Lecture
              </CardTitle>
              <CardDescription>
                Paste a YouTube URL to generate multimodal AI notes. PDF, text, and direct file uploads are no longer supported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAnyLoading && (
                <div className="py-6">
                  <AgentProgress currentStage={1} />
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="youtube">YouTube Video URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-3 top-3 w-5 h-5 text-red-500" />
                    <Input
                      id="youtube"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </div>
                <Button
                  onClick={processYouTube}
                  disabled={youtubeLoading || !youtubeUrl.trim()}
                  className="w-full"
                >
                  {youtubeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4 mr-2" />
                      Process YouTube Video
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setActiveView('landing')}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        )}

        {activeView === 'result' && (
          <div className="space-y-6">
            {currentResult ? (
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Download Buttons */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{currentResult.title}</h3>
                        <p className="text-sm text-muted-foreground">Source: {currentResult.sourceType}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setActiveView('upload')}>
                          New Upload
                        </Button>
                        <Button onClick={() => downloadNotesFile('txt')}>
                          Download Notes
                        </Button>
                        <Button variant="outline" onClick={() => downloadNotesFile('pdf')}>
                          Download as PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabbed Interface - simplified to a single Notes tab */}
                <Tabs value={resultTab} onValueChange={setResultTab} className="w-full">
                  <TabsList className="w-full flex justify-center">
                    <TabsTrigger value="summary" disabled={!currentResult.summary}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  {/* Notes Tab (formerly Summary) */}
                  {/* Notes Tab (formerly Summary) */}
<TabsContent value="summary" className="space-y-4">
  <div className="max-w-[900px] mx-auto w-full">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-600" />
          Detailed Notes
        </CardTitle>
        <CardDescription>
          Handwritten-style summary of your analyzed content.
        </CardDescription>
      </CardHeader>

      <CardContent>
  <div
    id="notes-content"
    className="max-w-none"
    style={{
      fontFamily: '"Comic Sans MS", cursive',
      fontSize: "18px",
      lineHeight: "1.9",
      letterSpacing: "0.3px",
      padding: "20px",
      backgroundColor: "#ffffff",
      borderRadius: "12px"
    }}
  >
    <ReactMarkdown>
      {currentResult.summary}
    </ReactMarkdown>
  </div>
</CardContent>

    </Card>
  </div>
</TabsContent>
                </Tabs>

                <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedSection?.title || 'Section Details'}</DialogTitle>
                      <DialogDescription>
                        Detailed notes for the selected node.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedSection?.description || 'No description available.'}
                      </p>
                      {Array.isArray(selectedSection?.keywords) && selectedSection.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSection.keywords.map((keyword, index) => (
                            <Badge key={`dialog-keyword-${index}`} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No results yet. Process a file or text to see summaries.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'notes' && (
          <div className="space-y-6">
            {/* Search */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loadingNotes}>
                    {loadingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes List */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {notes.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No notes yet. Create your first note!</p>
                  </CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card key={note.firestoreId} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">{note.title}</CardTitle>
                          <CardDescription>
                            {new Date(note.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNote(note.firestoreId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge variant="outline" className="w-fit">
                        {note.sourceType}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32 w-full">
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {note.transcript?.substring(0, 200)}...
                        </p>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

