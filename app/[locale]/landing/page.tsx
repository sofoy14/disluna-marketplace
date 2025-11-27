"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { 
  ArrowRight, 
  Check, 
  Star, 
  Shield, 
  Zap, 
  Sparkles, 
  FileText, 
  Scale, 
  BookOpen, 
  FolderOpen, 
  ChevronDown,
  Bot,
  Search,
  Gavel,
  Files,
  Activity,
  Lock,
  Globe,
  Mail,
  PenTool,
  Bell
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Layout from "@/components/landing/Layout"
import { ShaderCanvas } from "@/components/shader-canvas"

// --- Animation Variants ---
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1, duration: 0.6, ease: "easeOut" }
  })
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

// --- Components ---

function GlassCard({ children, className = "", hoverEffect = true }: { children: React.ReactNode, className?: string, hoverEffect?: boolean }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl
      ${hoverEffect ? "transition-all duration-300 hover:border-white/20 hover:bg-white/5 hover:shadow-2xl hover:-translate-y-1" : ""}
      ${className}
    `}>
      {/* Top Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      {children}
    </div>
  )
}

// Animated ellipsis component
function TypingEllipsis() {
  return (
    <span className="inline-flex w-4 justify-start">
      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.2, 1] }}>.</motion.span>
      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: 0.2, repeat: Infinity, times: [0, 0.2, 1] }}>.</motion.span>
      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: 0.4, repeat: Infinity, times: [0, 0.2, 1] }}>.</motion.span>
    </span>
  )
}

// === ANIMATED CARD CONTENTS ===

// Animation duration constant - synced with card display time
const CARD_DISPLAY_TIME = 3000; // 3 seconds

// 1. Analizando - Animated progress bar and percentage (synced to 3s)
function AnimatedAnalyzingContent() {
  const [progress, setProgress] = useState(0);
  const [activeDoc, setActiveDoc] = useState(0);
  
  useEffect(() => {
    // Reset on mount
    setProgress(0);
    setActiveDoc(0);
    
    // Animate progress from 0 to 100 in exactly 3 seconds
    // 100 steps / 3000ms = ~30ms per step (using 2% increments = 50 steps, so 60ms each)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100; // Stop at 100, don't reset
        return Math.min(prev + 2, 100);
      });
    }, 56); // 3000ms / ~54 steps ≈ 56ms to reach exactly 100% at 3s
    
    // Cycle through documents (4 docs in 3 seconds = 750ms each)
    const docInterval = setInterval(() => {
      setActiveDoc(prev => (prev + 1) % 4);
    }, 700);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(docInterval);
    };
  }, []);

  return (
    <>
      <div className="text-[9px] text-gray-400 mb-1">
        Escaneando Expediente: <motion.span 
          key={progress}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-amber-400 font-mono"
        >
          {11001 + Math.floor(progress / 25)}...
        </motion.span>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[0, 1, 2, 3].map(i => (
          <motion.div 
            key={i}
            className="h-6 bg-white/5 rounded border flex items-center justify-center relative overflow-hidden"
            animate={{ 
              borderColor: activeDoc === i ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.1)",
              backgroundColor: activeDoc === i ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)"
            }}
            transition={{ duration: 0.3 }}
          >
            <FileText className={`w-2.5 h-2.5 transition-colors duration-300 ${activeDoc === i ? 'text-amber-400' : 'text-gray-500'}`} />
            {activeDoc === i && (
              <motion.div 
                className="absolute inset-0 bg-amber-400/10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5 }}
                style={{ transformOrigin: 'left' }}
              />
            )}
            {i < activeDoc && (
              <motion.div 
                className="absolute top-0.5 right-0.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <Check className="w-1.5 h-1.5 text-amber-400" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[8px] text-gray-400">
          <span>Partes</span>
          <motion.span 
            className="text-amber-400 font-mono tabular-nums"
            key={progress}
          >
            {progress}%
          </motion.span>
        </div>
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full relative"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
      </div>
    </>
  );
}

// 2. Redactando - Typewriter effect (synced to 3s)
function AnimatedRedactingContent() {
  // Shorter text to complete in 3 seconds
  const fullText = "CLÁUSULA 1: EL CONTRATISTA se compromete a prestar servicios profesionales de asesoría legal...";
  const [displayText, setDisplayText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    // Reset on mount
    setDisplayText("");
    
    let index = 0;
    // Type full text in ~2.8 seconds (leaving time to see completed text)
    // ~95 chars / 2800ms = ~30ms per char
    const typeInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1));
        index++;
      }
      // Don't reset - let it stay at full text until card changes
    }, 28);

    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <>
      <div className="text-[9px] text-gray-400 mb-1 flex items-center gap-2">
        <span>Borrador: Contrato</span>
        <motion.div 
          className="flex gap-0.5"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-purple-400" />
          ))}
        </motion.div>
      </div>
      <div className="relative h-16 bg-white/5 rounded border border-white/5 p-2 font-mono text-[7px] text-gray-300 overflow-hidden leading-relaxed shadow-inner">
        <div className="whitespace-pre-wrap">
          {displayText}
          <motion.span 
            className="inline-block w-0.5 h-2.5 bg-purple-400 ml-0.5 align-middle"
            animate={{ opacity: cursorVisible ? 1 : 0 }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      </div>
      <div className="flex gap-1 mt-1.5 flex-wrap items-center">
        {["Confidencial", "Garantías", "Art. 1502"].map((tag, i) => (
          <motion.span 
            key={i} 
            className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[8px] text-purple-300 border border-purple-500/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.3 + 1 }}
          >
            {tag}
          </motion.span>
        ))}
        <motion.span 
          className="text-[8px] text-purple-400/60 ml-auto font-mono"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {displayText.length} caracteres
        </motion.span>
      </div>
    </>
  );
}

// 3. Comunicando - Message sending animation (synced to 3s)
function AnimatedCommunicatingContent() {
  const [sendProgress, setSendProgress] = useState(0);
  const [status, setStatus] = useState<'preparing' | 'sending' | 'sent'>('preparing');

  useEffect(() => {
    // Reset on mount
    setSendProgress(0);
    setStatus('preparing');
    
    let progress = 0;
    // 100% in 2.7 seconds (leaving 0.3s to show "sent" state)
    // 50 steps * 54ms = 2700ms
    const interval = setInterval(() => {
      progress += 2;
      const clampedProgress = Math.min(progress, 100);
      setSendProgress(clampedProgress);
      
      if (clampedProgress < 30) {
        setStatus('preparing');
      } else if (clampedProgress < 95) {
        setStatus('sending');
      } else {
        setStatus('sent');
      }
      
      // Stop at 100, don't reset
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 54);

    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    preparing: { text: 'Preparando adjuntos...', icon: '📎', color: 'text-yellow-400' },
    sending: { text: 'Enviando mensaje...', icon: '📤', color: 'text-blue-400' },
    sent: { text: 'Mensaje enviado', icon: '✓', color: 'text-emerald-400' }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <motion.div
          animate={{ 
            scale: status === 'sending' ? [1, 1.1, 1] : 1,
            borderColor: status === 'sent' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(255,255,255,0.1)'
          }}
          transition={{ duration: 0.5, repeat: status === 'sending' ? Infinity : 0 }}
        >
          <Avatar className="w-6 h-6 border border-white/10 ring-1 ring-emerald-500/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-emerald-900 text-[8px] text-emerald-200">MR</AvatarFallback>
          </Avatar>
        </motion.div>
        <div className="text-[9px] flex-1">
          <div className="text-white font-medium">Para: Martínez & Asoc.</div>
          <div className="text-gray-500 text-[8px]">Asunto: Análisis del caso...</div>
        </div>
      </div>
      
      {/* Message preview with typing indicator */}
      <div className="p-2 bg-white/5 rounded border border-white/5 text-[8px] text-gray-400 italic relative leading-tight">
        <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l border-emerald-500/50" />
        "Estimado Dr., adjunto el análisis detallado..."
        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r border-emerald-500/50" />
      </div>
      
      {/* Upload progress bar */}
      <div className="mt-2 space-y-1">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full transition-colors duration-300 ${
              status === 'sent' ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            }`}
            style={{ width: `${sendProgress}%` }}
          >
            {status === 'sending' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </motion.div>
        </div>
        <motion.div 
          className={`flex items-center justify-between text-[8px] ${statusConfig[status].color}`}
          key={status}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="flex items-center gap-1">
            <span>{statusConfig[status].icon}</span>
            {statusConfig[status].text}
          </span>
          <span className="font-mono tabular-nums">{sendProgress}%</span>
        </motion.div>
      </div>
    </>
  );
}

// 4. Monitoreando - Animated chart bars (synced to 3s)
function AnimatedMonitoringContent() {
  const [bars, setBars] = useState([0, 0, 0, 0, 0, 0, 0]);
  const targetBars = [20, 45, 60, 80, 40, 70, 55];
  const [notificationCount, setNotificationCount] = useState(0);
  const [alerts, setAlerts] = useState<string[]>([]);
  
  const alertMessages = [
    "Movimiento proc. 11001...",
    "Nueva citación judicial",
    "Actualización expediente",
    "Respuesta contraparte"
  ];

  useEffect(() => {
    // Reset on mount
    setBars([0, 0, 0, 0, 0, 0, 0]);
    setNotificationCount(0);
    setAlerts([alertMessages[0]]);
    
    // Animate bars growing - complete in ~2 seconds
    // Max target is 80, so 80/5 = 16 steps, 16 * 125ms = 2000ms
    const barInterval = setInterval(() => {
      setBars(prev => prev.map((val, i) => {
        const target = targetBars[i];
        if (val < target) return Math.min(val + 5, target);
        return val;
      }));
    }, 100);

    // Add second notification after 1.5s
    const alertTimeout = setTimeout(() => {
      setAlerts(prev => [...prev, alertMessages[1]]);
      setNotificationCount(1);
    }, 1500);

    return () => {
      clearInterval(barInterval);
      clearTimeout(alertTimeout);
    };
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] text-gray-400 font-medium">Últimas 24h</span>
        <motion.div
          key={notificationCount}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        >
          <Badge variant="outline" className="text-[8px] border-pink-500/30 text-pink-400 h-4 px-1.5 bg-pink-500/10">
            +{notificationCount + 1}
          </Badge>
        </motion.div>
      </div>
      <div className="space-y-1.5 min-h-[36px]">
        <AnimatePresence mode="popLayout">
          {alerts.slice(-2).map((alert, idx) => (
            <motion.div 
              key={`${alert}-${idx}`}
              className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              initial={{ x: 20, opacity: 0, height: 0 }}
              animate={{ x: 0, opacity: 1, height: 'auto' }}
              exit={{ x: -20, opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(244,114,182,0.8)]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <div className="text-[9px] text-gray-300 font-medium truncate">{alert}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="h-8 mt-2 flex items-end justify-between gap-0.5 px-1">
        {bars.map((h, i) => (
          <motion.div 
            key={i} 
            className="w-full bg-gradient-to-t from-pink-500 to-pink-400 rounded-t-sm relative overflow-hidden"
            style={{ height: `${h}%` }}
            whileHover={{ 
              scaleY: 1.1, 
              backgroundColor: 'rgb(244, 114, 182)',
              transition: { duration: 0.2 }
            }}
          >
            <motion.div 
              className="absolute inset-0 bg-white/20"
              initial={{ y: '100%' }}
              animate={{ y: '-100%' }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
}

// --- Sections ---

function HeroSection() {
  const [activeCardIndex, setActiveCardIndex] = useState(-1); // Start inactive
  const [nextCardIndex, setNextCardIndex] = useState(0); // Track next for vector color
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [isVectorVisible, setIsVectorVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Data for the 5 agent cards - Updated with Action Titles
  const cards = [
    {
      title: "Analizando",
      icon: FileText,
      color: "#FBBF24", // amber-400
      content: <AnimatedAnalyzingContent />
    },
    {
      title: "Buscando",
      icon: Search,
      color: "#60A5FA", // blue-400
      content: (
        <>
          <div className="text-[9px] text-gray-400 mb-1">Filtrando: Resp. Civil</div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div 
              className="h-full bg-blue-400" 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.8, ease: "linear" }}
            />
          </div>
          <div className="space-y-1.5">
            {[1, 2].map((i) => (
              <motion.div 
                key={i}
                className="flex items-center gap-1.5 p-1.5 rounded bg-white/5 border border-white/5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.4 }}
              >
                <div className="w-0.5 h-4 bg-blue-500/50 rounded-full" />
                <div className="space-y-0.5 w-full">
                   <div className="h-1.5 bg-gray-500/50 rounded w-3/4" />
                   <div className="h-1.5 bg-gray-500/30 rounded w-1/2" />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-1.5 text-[8px] text-right text-blue-300 font-mono">128 resultados</div>
        </>
      )
    },
    {
      title: "Redactando",
      icon: PenTool,
      color: "#A78BFA", // purple-400
      content: <AnimatedRedactingContent />
    },
    {
      title: "Comunicando",
      icon: Mail,
      color: "#34D399", // emerald-400
      content: <AnimatedCommunicatingContent />
    },
    {
      title: "Monitoreando",
      icon: Bell,
      color: "#F472B6", // pink-400
      content: <AnimatedMonitoringContent />
    }
  ];

  // State for mobile card position (x, y offsets from center)
  const [mobilePosition, setMobilePosition] = useState({ x: 0, y: 120 });

  // Mobile positions (smaller, more varied)
  const mobilePositions = [
    { x: -60, y: 150 },   // Bottom-left
    { x: 0, y: 160 },     // Bottom-center  
    { x: 60, y: 150 },    // Bottom-right
    { x: -80, y: 50 },    // Left-center
    { x: 80, y: 50 },     // Right-center
    { x: -60, y: -60 },   // Top-left
    { x: 0, y: -80 },     // Top-center
    { x: 60, y: -60 },    // Top-right
  ];

  // Desktop positions around the orb
  const desktopPositions = [
    { x: -160, y: -140 },  // 10 o'clock
    { x: 0, y: -180 },     // 12 o'clock
    { x: 140, y: -140 },   // 2 o'clock
    { x: -200, y: -40 },   // 9 o'clock upper
    { x: -200, y: 40 },    // 9 o'clock lower
    { x: 160, y: -40 },    // 3 o'clock upper
    { x: 160, y: 40 },     // 3 o'clock lower
    { x: -160, y: 140 },   // 8 o'clock
    { x: 0, y: 180 },      // 6 o'clock
    { x: 140, y: 140 },    // 4 o'clock
  ];

  // Track previous position index to avoid repeating
  const [prevPositionIndex, setPrevPositionIndex] = useState(-1);

  // Helper to generate random position within bounds - AVOIDS CENTER (ALI text)
  const getRandomPosition = (forMobile: boolean = false) => {
    const positions = forMobile ? mobilePositions : desktopPositions;
    
    // Get a random index that's different from the previous one
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * positions.length);
    } while (newIndex === prevPositionIndex && positions.length > 1);
    
    setPrevPositionIndex(newIndex);
    const randomPos = positions[newIndex];
    
    if (forMobile) {
      setMobilePosition(randomPos);
    }
    
    return randomPos;
  };

  // State for orb "working" effect
  const [isOrbWorking, setIsOrbWorking] = useState(false);

  // Cycle Logic - Each card displays for exactly 3 seconds
  useEffect(() => {
    let isActive = true;
    let currentIndex = -1; // Start state

    const runSequence = async () => {
      if (!isActive) return;

      // 1. Determine next card index
      const nextIdx = (currentIndex + 1) % cards.length;
      setNextCardIndex(nextIdx); // Set this for vector color

      // 2. Calculate position for NEXT card (pass isMobile flag)
      const nextPos = getRandomPosition(isMobile);
      setCurrentPosition(nextPos);
      
      // 3. Orb starts "working" - energy buildup
      setIsOrbWorking(true);
      
      // 4. Show Vector (anticipation) - only on desktop
      if (!isMobile) {
        setIsVectorVisible(true);
      }
      
      // Wait for vector draw (reduced for faster cycle)
      await new Promise(r => setTimeout(r, 600));
      
      if (!isActive) return;

      // 5. Show Card
      currentIndex = nextIdx;
      setActiveCardIndex(currentIndex);
      setIsVectorVisible(false); // Vector fades as card appears
      setIsOrbWorking(false); // Orb calms down
      
      // Wait for display time - exactly 3 seconds (synced with animations)
      await new Promise(r => setTimeout(r, CARD_DISPLAY_TIME));
      
      if (!isActive) return;

      // 6. Hide Card
      setActiveCardIndex(-1); 
      
      // Short pause before next cycle
      await new Promise(r => setTimeout(r, 400));

      if (!isActive) return;
      
      // Loop
      runSequence();
    };

    const startTimeout = setTimeout(() => {
      runSequence();
    }, 2000);

    return () => {
      isActive = false;
      clearTimeout(startTimeout);
    };
  }, [isMobile]); // Re-run when mobile state changes

  return (
    <section className="relative min-h-[85vh] flex items-center py-4 overflow-hidden -mt-8">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 -z-20 bg-[#030305]" />
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] opacity-40" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-green-900/10 rounded-full blur-[120px] opacity-30" />
      <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] opacity-20" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div 
            className="space-y-8 text-center lg:text-left order-2 lg:order-1 lg:mt-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="relative h-[180px] sm:h-[220px] md:h-[280px]">
              {/* Phase 1: ALI Horizontal Word */}
              <motion.div
                className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight absolute top-0 left-0 lg:left-0 w-full lg:w-auto flex justify-center lg:justify-start"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1, 1, 1]
                }}
                transition={{ 
                  duration: 2,
                  times: [0, 0.2, 0.7, 1],
                  ease: "easeInOut"
                }}
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400">
                  ALI
                </span>
              </motion.div>

              {/* Phase 2 & 3: Letters split vertically then expand */}
              <motion.h1 
                className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-white absolute top-0 left-0 w-full lg:w-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.3 }}
              >
                <div className="flex flex-col items-center lg:items-start">
                  {/* Line 1: A -> Asistente */}
                  <div className="flex items-baseline">
                    <motion.span 
                      className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 inline-block"
                      initial={{ 
                        x: "0.65em",
                        y: "1.1em"
                      }}
                      animate={{ 
                        x: 0,
                        y: 0
                      }}
                      transition={{ 
                        delay: 1.8,
                        duration: 0.6, 
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    >
                      A
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      transition={{ delay: 2.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block overflow-hidden whitespace-nowrap"
                    >
                      sistente
                    </motion.span>
                  </div>
                  
                  {/* Line 2: L -> Legal */}
                  <div className="flex items-baseline">
                    <motion.span 
                      className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 inline-block"
                      initial={{ 
                        x: "0.15em",
                        y: 0
                      }}
                      animate={{ 
                        x: 0,
                        y: 0
                      }}
                      transition={{ 
                        delay: 1.8,
                        duration: 0.6, 
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    >
                      L
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      transition={{ delay: 2.7, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block overflow-hidden whitespace-nowrap"
                    >
                      egal
                    </motion.span>
                  </div>
                  
                  {/* Line 3: I -> Inteligente */}
                  <div className="flex items-baseline">
                    <motion.span 
                      className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 inline-block"
                      initial={{ 
                        x: "-0.35em",
                        y: "-1.1em"
                      }}
                      animate={{ 
                        x: 0,
                        y: 0
                      }}
                      transition={{ 
                        delay: 1.8,
                        duration: 0.6, 
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    >
                      I
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      transition={{ delay: 2.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block overflow-hidden whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400"
                    >
                      nteligente
                    </motion.span>
                  </div>
                </div>
              </motion.h1>
            </div>
            
            <motion.p variants={fadeIn} custom={2} className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Analiza, redacta y gestiona tus casos con una precisión sobrehumana. La plataforma definitiva para el abogado del futuro.
            </motion.p>
            
            <motion.div variants={fadeIn} custom={3} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-white text-black hover:bg-gray-200 transition-colors rounded-full font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)]" asChild>
                <Link href="/login">
                  Comenzar Ahora
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 bg-transparent border-white/20 text-white hover:bg-white/10 rounded-full text-base backdrop-blur-sm" asChild>
                <Link href="#features">
                  Explorar Sistema
                </Link>
              </Button>
            </motion.div>

            <motion.div variants={fadeIn} custom={4} className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5">
               <div>
                 <div className="text-2xl font-bold text-white">10k+</div>
                 <div className="text-xs text-gray-500 uppercase tracking-wider">Docs Analizados</div>
               </div>
               <div>
                 <div className="text-2xl font-bold text-white">99%</div>
                 <div className="text-xs text-gray-500 uppercase tracking-wider">Precisión</div>
               </div>
               <div>
                 <div className="text-2xl font-bold text-white">24/7</div>
                 <div className="text-xs text-gray-500 uppercase tracking-wider">Disponibilidad</div>
               </div>
            </motion.div>
          </motion.div>

          {/* 3D Orb & Agentic UI */}
          <motion.div 
            className="flex justify-center items-center order-1 lg:order-2 relative min-h-[400px] sm:min-h-[550px] lg:min-h-[600px] lg:-mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Central Orb Container */}
            <div className={`relative flex items-center justify-center z-20 ${isMobile ? 'w-[280px] h-[280px]' : 'w-[480px] h-[480px]'}`}>
              {/* Orb "Working" Energy Ring */}
              <AnimatePresence>
                {isOrbWorking && (
                  <>
                    {/* Expanding energy pulse */}
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, ${cards[nextCardIndex]?.color || '#8b5cf6'}20 0%, transparent 70%)`,
                      }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.3, opacity: [0, 0.8, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    {/* Rotating energy ring */}
                    <motion.div
                      className="absolute inset-[-20px] rounded-full pointer-events-none border-2"
                      style={{
                        borderColor: `${cards[nextCardIndex]?.color || '#8b5cf6'}60`,
                        boxShadow: `0 0 30px ${cards[nextCardIndex]?.color || '#8b5cf6'}40, inset 0 0 30px ${cards[nextCardIndex]?.color || '#8b5cf6'}20`,
                      }}
                      initial={{ rotate: 0, scale: 0.9, opacity: 0 }}
                      animate={{ rotate: 180, scale: 1.05, opacity: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    {/* Inner glow intensification */}
                    <motion.div
                      className="absolute inset-[40px] rounded-full pointer-events-none"
                      style={{
                        boxShadow: `0 0 60px ${cards[nextCardIndex]?.color || '#8b5cf6'}60`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.5] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  </>
                )}
              </AnimatePresence>
              
              <ShaderCanvas size={isMobile ? 280 : 480} shaderId={2} />
              
              {/* ALI Text Overlay */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ 
                  duration: 0.8, 
                  delay: 1.5,
                  ease: "easeOut" 
                }}
              >
                <h1 className={`font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent drop-shadow-sm ${isMobile ? 'text-5xl' : 'text-8xl'}`}>
                  ALI
                </h1>
              </motion.div>
            </div>

            {/* Enhanced Connecting Vector (Desktop Only) */}
            <AnimatePresence>
              {isVectorVisible && !isMobile && (
                <svg className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none overflow-visible">
                   <defs>
                     {/* Glow filter for the vector */}
                     <filter id="vectorGlow" x="-50%" y="-50%" width="200%" height="200%">
                       <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                       <feMerge>
                         <feMergeNode in="coloredBlur"/>
                         <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                     </filter>
                     {/* Gradient for energy flow */}
                     <linearGradient id={`vectorGradient-${nextCardIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" stopColor={cards[nextCardIndex].color} stopOpacity="0.3" />
                       <stop offset="50%" stopColor={cards[nextCardIndex].color} stopOpacity="1" />
                       <stop offset="100%" stopColor={cards[nextCardIndex].color} stopOpacity="0.8" />
                     </linearGradient>
                   </defs>
                   
                   {/* Background glow line (wider, more diffuse) */}
                   <motion.line 
                     x1="50%" y1="50%"
                     x2={`calc(50% + ${currentPosition.x}px)`}
                     y2={`calc(50% + ${currentPosition.y}px)`}
                     stroke={cards[nextCardIndex].color}
                     strokeWidth="12"
                     strokeOpacity="0.15"
                     strokeLinecap="round"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                   />
                   
                   {/* Main energy line */}
                   <motion.line 
                     x1="50%" y1="50%"
                     x2={`calc(50% + ${currentPosition.x}px)`}
                     y2={`calc(50% + ${currentPosition.y}px)`}
                     stroke={cards[nextCardIndex].color}
                     strokeWidth="3"
                     strokeLinecap="round"
                     filter="url(#vectorGlow)"
                     initial={{ pathLength: 0, opacity: 0 }}
                     animate={{ pathLength: 1, opacity: 1 }}
                     exit={{ opacity: 0, transition: { duration: 0.2 } }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                   />
                   
                   {/* Animated energy particles along the line */}
                   {[0, 1, 2].map((i) => (
                     <motion.circle
                       key={i}
                       r="3"
                       fill={cards[nextCardIndex].color}
                       filter="url(#vectorGlow)"
                       initial={{ 
                         cx: "50%", 
                         cy: "50%",
                         opacity: 0,
                         scale: 0
                       }}
                       animate={{ 
                         cx: `calc(50% + ${currentPosition.x}px)`,
                         cy: `calc(50% + ${currentPosition.y}px)`,
                         opacity: [0, 1, 1, 0],
                         scale: [0.5, 1.2, 1, 0.5]
                       }}
                       transition={{ 
                         duration: 0.4,
                         delay: i * 0.1,
                         ease: "easeOut"
                       }}
                     />
                   ))}
                   
                   {/* Pulsing endpoint glow */}
                   <motion.circle
                      cx={`calc(50% + ${currentPosition.x}px)`}
                      cy={`calc(50% + ${currentPosition.y}px)`}
                      r="20"
                      fill={cards[nextCardIndex].color}
                      fillOpacity="0.2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.5, 1], opacity: [0, 0.4, 0.2] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                   />
                   
                   {/* Main endpoint dot */}
                   <motion.circle
                      cx={`calc(50% + ${currentPosition.x}px)`}
                      cy={`calc(50% + ${currentPosition.y}px)`}
                      r="6"
                      fill={cards[nextCardIndex].color}
                      filter="url(#vectorGlow)"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: [0, 1.3, 1] }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }} 
                   />
                   
                   {/* Inner bright core */}
                   <motion.circle
                      cx={`calc(50% + ${currentPosition.x}px)`}
                      cy={`calc(50% + ${currentPosition.y}px)`}
                      r="3"
                      fill="white"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0.8], scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.45 }} 
                   />
                </svg>
              )}
            </AnimatePresence>

            {/* --- Agentic Cards (Sequential Random Display) --- */}
            <AnimatePresence mode="wait">
              {activeCardIndex >= 0 && !isVectorVisible && (
                <motion.div 
                  key={`${activeCardIndex}-${isMobile ? `${mobilePosition.x}-${mobilePosition.y}` : currentPosition.x}`}
                  className={`absolute z-30 ${isMobile ? 'w-40' : 'w-52'}`}
                  style={isMobile ? {
                    // Mobile: Position around orb using x,y coordinates
                    top: `calc(50% + ${mobilePosition.y}px)`,
                    left: `calc(50% + ${mobilePosition.x}px)`,
                    transform: "translate(-50%, -50%) scale(0.85)"
                  } : {
                    // Desktop: Position based on calculated coordinates
                    top: `calc(50% + ${currentPosition.y}px)`,
                    left: `calc(50% + ${currentPosition.x}px)`,
                    transform: "translate(-50%, -50%)"
                  }}
                  initial={{ 
                    opacity: 0, 
                    scale: 0.8, 
                    filter: "blur(8px)"
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    filter: "blur(0px)"
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.9, 
                    filter: "blur(8px)", 
                    transition: { duration: 0.3 } 
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <GlassCard className="!bg-black/90 !border-white/20 p-0 ring-1 ring-white/10 shadow-2xl" hoverEffect={false}>
                    {/* Header - Reduced padding and size */}
                    <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                      <div className={`p-1 rounded-md bg-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                         {(() => {
                            const Icon = cards[activeCardIndex].icon;
                            return <Icon className="w-3.5 h-3.5" style={{ color: cards[activeCardIndex].color }} />;
                         })()}
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white truncate mr-0.5">
                          {cards[activeCardIndex].title}
                        </span>
                        <TypingEllipsis />
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                      </div>
                    </div>
                    {/* Content - Reduced padding */}
                    <div className="p-3 space-y-2">
                      {cards[activeCardIndex].content}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function FeaturesGrid() {
  const features = [
    {
      icon: FileText,
      title: "Análisis Profundo",
      desc: "Motor NLP entrenado con millones de sentencias colombianas para extraer insights imposibles de ver a simple vista."
    },
    {
      icon: Bot,
      title: "Redacción Generativa",
      desc: "Crea borradores de contratos y tutelas en segundos, adaptados al contexto específico de tu cliente."
    },
    {
      icon: Search,
      title: "Búsqueda Semántica",
      desc: "Encuentra precedentes por significado y hechos fácticos, no solo por palabras clave coincidentes."
    },
    {
      icon: Lock,
      title: "Seguridad Militar",
      desc: "Encriptación de extremo a extremo y procesamiento en silos aislados para máxima confidencialidad."
    },
    {
      icon: Activity,
      title: "Monitoreo de Casos",
      desc: "Dashboard en tiempo real del estado de tus procesos con alertas predictivas de vencimientos."
    },
    {
      icon: Globe,
      title: "Acceso Global",
      desc: "Tu firma digital disponible en cualquier dispositivo, sincronizada en la nube de forma segura."
    }
  ]

  return (
    <section id="features" className="py-32 relative bg-[#030305]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Capacidades del Futuro</h2>
          <p className="text-gray-400 text-lg">
            Herramientas de vanguardia diseñadas para la élite legal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <GlassCard key={idx} className="p-8 group">
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                <item.icon className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {item.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function VisualDashboard() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#030305]">
      {/* Background Light Splash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Tu Centro de Comando <br />
              <span className="text-blue-400">Legal Inteligente</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Visualiza métricas clave, gestiona cargas de trabajo y toma decisiones basadas en datos reales. Una interfaz diseñada para la eficiencia y la claridad absoluta.
            </p>
            
            <div className="space-y-4">
              {[
                "Dashboard personalizable con widgets",
                "Analíticas de rendimiento del equipo",
                "Predicción de resultados basada en IA"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-white font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full perspective-1000">
            <motion.div 
              className="relative transform rotate-y-[-10deg] rotate-x-[5deg]"
              initial={{ rotateY: -10, rotateX: 5 }}
              whileHover={{ rotateY: 0, rotateX: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="p-6 aspect-video w-full flex flex-col !bg-black/80 border-white/10">
                {/* Mock Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500/20" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>

                {/* Mock Content - Grid */}
                <div className="grid grid-cols-3 gap-4 flex-1">
                   {/* Main Chart Area */}
                   <div className="col-span-2 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col justify-between">
                      <div className="flex justify-between mb-4">
                        <div className="h-3 w-16 bg-white/10 rounded" />
                        <div className="h-3 w-8 bg-green-500/20 rounded" />
                      </div>
                      <div className="flex items-end gap-2 h-24">
                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/50 rounded-t-sm hover:bg-blue-400 transition-colors" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                   </div>
                   
                   {/* Side Widgets */}
                   <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5 h-1/2">
                        <div className="w-8 h-8 rounded-full border-2 border-purple-500/50 mb-2" />
                        <div className="h-2 w-full bg-white/10 rounded" />
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5 h-[45%]">
                         <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <div className="h-2 w-10 bg-white/10 rounded" />
                         </div>
                         <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
                            <div className="h-full w-2/3 bg-green-400" />
                         </div>
                      </div>
                   </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsGrid() {
  const testimonials = [
    {
      text: "La interfaz es simplemente futurista. Me hace sentir que estoy operando tecnología de la NASA, pero aplicada al derecho.",
      author: "Carlos Ruiz",
      role: "Socio Director"
    },
    {
      text: "Increíblemente rápido y visual. La forma en que presenta la jurisprudencia como nodos de datos interconectados es brillante.",
      author: "Ana María V.",
      role: "Abogada Senior"
    },
    {
      text: "Lo mejor es el modo oscuro y lo descansada que es la vista para trabajar largas horas. Un 10 en UX/UI.",
      author: "David L.",
      role: "Litigante"
    }
  ]

  return (
    <section id="testimonials" className="py-32 relative bg-[#030305]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-3xl font-bold text-center text-white mb-16">Lo que dicen los expertos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <GlassCard key={i} className="p-8 flex flex-col justify-between">
              <div className="mb-6">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-white text-white" />)}
                </div>
                <p className="text-gray-300 italic leading-relaxed">"{t.text}"</p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {t.author[0]}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.author}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingDark() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const plans = {
    monthly: {
      name: "Plan Mensual",
      regularPrice: "$58.000",
      promoPrice: "$4.000",
      promoLabel: "Primer mes",
      period: "/mes",
      features: [
        "Chat ilimitado con IA legal",
        "Análisis de documentos",
        "Consultas legales colombianas",
        "Soporte prioritario"
      ],
      highlight: true
    },
    yearly: {
      name: "Plan Anual",
      regularPrice: "$696.000",
      promoPrice: "$626.400",
      promoLabel: "Ahorra 10%",
      period: "/año",
      features: [
        "Todo lo del plan mensual",
        "10% de descuento",
        "Ahorro de $69.600",
        "Sin preocupaciones mensuales"
      ],
      highlight: false
    }
  }

  const currentPlan = plans[billingPeriod]

  return (
    <section id="pricing" className="py-32 relative overflow-hidden bg-[#030305]">
       {/* Radial gradient background */}
       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-t from-blue-900/20 to-transparent opacity-50 pointer-events-none" />

       <div className="container mx-auto px-4 relative z-10">
         <div className="text-center mb-12">
           <h2 className="text-3xl font-bold text-white mb-4">Un Solo Plan, Todo Incluido</h2>
           <p className="text-gray-400 mb-8">Acceso completo a todas las funcionalidades del asistente legal</p>
           
           {/* Toggle Mensual/Anual */}
           <div className="inline-flex bg-white/5 p-1 rounded-full border border-white/10">
             <button
               onClick={() => setBillingPeriod('monthly')}
               className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                 billingPeriod === 'monthly'
                   ? 'bg-white text-black'
                   : 'text-gray-400 hover:text-white'
               }`}
             >
               Mensual
             </button>
             <button
               onClick={() => setBillingPeriod('yearly')}
               className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                 billingPeriod === 'yearly'
                   ? 'bg-white text-black'
                   : 'text-gray-400 hover:text-white'
               }`}
             >
               Anual
               <span className="absolute -top-2 -right-2 bg-green-500 text-[10px] text-white px-1.5 py-0.5 rounded-full">
                 -10%
               </span>
             </button>
           </div>
         </div>

         <div className="max-w-lg mx-auto">
           <GlassCard className="p-8 flex flex-col border-blue-500/50 bg-blue-900/10 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
             {/* Badge */}
             <div className="flex justify-center mb-6">
               <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
                 <Sparkles className="w-4 h-4" />
                 {billingPeriod === 'monthly' ? '⭐ Oferta Primer Mes' : '💰 Mejor Valor'}
               </span>
             </div>

             <div className="text-center mb-8">
               <h3 className="text-2xl font-bold text-white mb-2">{currentPlan.name}</h3>
               
               {/* Pricing */}
               <div className="mt-4">
                 {billingPeriod === 'monthly' && (
                   <div className="flex items-center justify-center gap-2 mb-2">
                     <span className="text-gray-500 line-through text-lg">{currentPlan.regularPrice}</span>
                     <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                       {currentPlan.promoLabel}
                     </span>
                   </div>
                 )}
                 <div className="flex items-baseline justify-center gap-1">
                   <span className="text-5xl font-bold text-white">{currentPlan.promoPrice}</span>
                   <span className="text-gray-400">COP{currentPlan.period}</span>
                 </div>
                 {billingPeriod === 'monthly' && (
                   <p className="text-sm text-gray-500 mt-2">Luego {currentPlan.regularPrice}/mes</p>
                 )}
                 {billingPeriod === 'yearly' && (
                   <p className="text-sm text-green-400 mt-2">Equivale a $52.200/mes</p>
                 )}
               </div>
             </div>

             <ul className="space-y-4 mb-8 flex-1">
               {currentPlan.features.map((f, i) => (
                 <li key={i} className="flex items-center gap-3 text-gray-300">
                   <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                     <Check className="w-3 h-3 text-green-400" />
                   </div>
                   {f}
                 </li>
               ))}
             </ul>

             <Button 
               className="w-full h-14 rounded-full bg-white text-black hover:bg-gray-200 text-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
               asChild
             >
               <Link href={`/login?plan=${billingPeriod}`}>
                 {billingPeriod === 'monthly' ? 'Comenzar por $4.000' : 'Suscribirse Anualmente'}
               </Link>
             </Button>

             <p className="text-center text-gray-500 text-sm mt-4">
               Cancela cuando quieras · Sin compromisos
             </p>
           </GlassCard>
         </div>

         {/* Trust badges */}
         <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-gray-500">
           <div className="flex items-center gap-2">
             <Shield className="w-4 h-4" />
             Pago seguro con Wompi
           </div>
           <div className="flex items-center gap-2">
             <Check className="w-4 h-4 text-green-500" />
             Soporte en español
           </div>
           <div className="flex items-center gap-2">
             <Zap className="w-4 h-4 text-yellow-500" />
             Activación inmediata
           </div>
         </div>
       </div>
    </section>
  )
}

function FinalCTADark() {
  return (
    <section className="py-24 relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50"></div>
      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            El futuro no espera.
          </h2>
          <p className="text-xl text-gray-400">
            Únete hoy a la revolución legal tecnológica.
          </p>
          <div className="flex justify-center pt-4">
            <Button size="lg" className="h-16 px-12 rounded-full text-lg bg-white text-black hover:scale-105 transition-transform font-bold" asChild>
               <Link href="/login">Comenzar Gratis</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Main ---

export default function LandingPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-[#030305] text-white font-sans selection:bg-blue-500/30">
        <HeroSection />
        <FeaturesGrid />
        <VisualDashboard />
        <TestimonialsGrid />
        <PricingDark />
        <FinalCTADark />
      </div>
    </Layout>
  )
}
