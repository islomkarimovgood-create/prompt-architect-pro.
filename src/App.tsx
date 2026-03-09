/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Sparkles, 
  Camera, 
  Palette, 
  Cloud, 
  Copy, 
  Check, 
  Loader2, 
  ArrowRight,
  Info,
  Maximize2,
  RefreshCcw,
  History as HistoryIcon,
  Trash2,
  Search,
  Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PromptVariant {
  id?: string;
  type: 'Photo-Realistic' | 'Digital Art' | 'Abstract/Concept';
  prompt: string;
  negative: string;
  aspect: string;
  user_input?: string;
  created_at?: string;
}

const SYSTEM_INSTRUCTION = `You are a Senior Prompt Engineer specialized in image generation (Midjourney, Stable Diffusion, DALL-E).
Your task is to take a short user request and expand it into 3 professional variants:

1. Photo-Realistic: Include specific camera settings (e.g., 85mm lens, f/1.8, ISO 100), lighting conditions (golden hour, softbox), and high-fidelity details.
2. Digital Art: Specify artist styles (e.g., Loish, Greg Rutkowski, WLOP), rendering engines (Octane Render, Unreal Engine 5), and artistic techniques (cel shading, volumetric lighting).
3. Abstract/Concept: Use metaphors, symbolic lighting, and conceptual descriptions to evoke mood and meaning.

For each variant, provide:
- The expanded prompt (in English).
- A negative prompt (what to avoid).
- Recommended aspect ratio (e.g., 16:9, 9:16, 1:1).

Return the response in a structured JSON format.`;

type Tab = 'generator' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [history, setHistory] = useState<PromptVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | number | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('prompt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (newVariants: PromptVariant[], originalInput: string) => {
    const historyItems: PromptVariant[] = newVariants.map(v => ({
      ...v,
      id: Math.random().toString(36).substr(2, 9),
      user_input: originalInput,
      created_at: new Date().toISOString()
    }));

    const updatedHistory = [...historyItems, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('prompt_history', JSON.stringify(updatedHistory));
  };

  const generatePrompts = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setVariants([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Expand this prompt: "${input}"`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    negative: { type: Type.STRING },
                    aspect: { type: Type.STRING },
                  },
                  required: ["type", "prompt", "negative", "aspect"]
                }
              }
            },
            required: ["variants"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.variants) {
        setVariants(data.variants);
        saveToHistory(data.variants, input);
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate prompts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrompt = (id: string) => {
    const updatedHistory = history.filter(p => p.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('prompt_history', JSON.stringify(updatedHistory));
  };

  const copyToClipboard = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Photo-Realistic': return <Camera className="w-5 h-5" />;
      case 'Digital Art': return <Palette className="w-5 h-5" />;
      case 'Abstract/Concept': return <Cloud className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <Sparkles className="w-6 h-6 text-black" />
            </motion.div>
            <h1 className="text-xl font-bold tracking-tight">Prompt Architect <span className="text-emerald-500">Pro</span></h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('generator')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                activeTab === 'generator' ? "bg-emerald-500 text-black shadow-lg" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Zap className="w-4 h-4" />
              Generator
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                activeTab === 'history' ? "bg-emerald-500 text-black shadow-lg" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <HistoryIcon className="w-4 h-4" />
              History
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-300">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Public Access
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'generator' ? (
            <motion.div 
              key="generator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center space-y-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold tracking-widest uppercase"
                >
                  Next-Gen Prompt Engineering
                </motion.div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">
                  ENGINEER THE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">PERFECT VISION</span>
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto text-xl font-medium">
                  Transform simple thoughts into high-fidelity blueprints for any AI model.
                </p>
              </div>

              {/* Input Area */}
              <div className="max-w-4xl mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2rem] p-3 flex flex-col md:flex-row gap-3 shadow-2xl">
                    <div className="flex-1 flex items-center px-4">
                      <Search className="w-6 h-6 text-zinc-600 mr-4" />
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && generatePrompts()}
                        placeholder="Describe your vision (e.g., 'A futuristic oasis in Mars')"
                        className="w-full bg-transparent py-4 outline-none text-zinc-100 text-lg placeholder:text-zinc-600"
                      />
                    </div>
                    <button
                      onClick={generatePrompts}
                      disabled={isLoading || !input.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black px-10 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl active:scale-95"
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          ARCHITECT
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-red-400 text-sm mt-4 text-center flex items-center justify-center gap-2">
                    <Info className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6 animate-pulse">
                      <div className="h-8 w-40 bg-zinc-800 rounded-xl" />
                      <div className="space-y-3">
                        <div className="h-4 w-full bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-full bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-2/3 bg-zinc-800 rounded-lg" />
                      </div>
                      <div className="pt-6 space-y-3 border-t border-zinc-800">
                        <div className="h-3 w-24 bg-zinc-800 rounded-lg" />
                        <div className="h-3 w-full bg-zinc-800 rounded-lg" />
                      </div>
                    </div>
                  ))
                ) : (
                  variants.map((variant, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group relative bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-500 flex flex-col h-full shadow-xl hover:shadow-emerald-500/5"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-zinc-800 rounded-2xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500">
                            {getIcon(variant.type)}
                          </div>
                          <span className="font-black text-zinc-400 tracking-widest uppercase text-xs">{variant.type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800">
                          <Maximize2 className="w-3 h-3" />
                          {variant.aspect}
                        </div>
                      </div>

                      <div className="flex-1 space-y-8">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Master Script</label>
                            <button 
                              onClick={() => copyToClipboard(variant.prompt, idx)}
                              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-emerald-400"
                            >
                              {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="bg-black/60 border border-zinc-800/50 rounded-2xl p-5 text-sm leading-relaxed text-zinc-300 font-medium italic group-hover:text-white transition-colors">
                            "{variant.prompt}"
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Negative Space</label>
                          <div className="bg-zinc-800/20 rounded-2xl p-4 text-xs text-zinc-500 font-mono leading-relaxed">
                            {variant.negative}
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Optimized</span>
                        </div>
                        <button className="text-[10px] text-emerald-500 font-black hover:tracking-widest transition-all flex items-center gap-2">
                          ANALYZE <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Empty State */}
              {!isLoading && variants.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 opacity-40">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-zinc-800"
                  >
                    <Sparkles className="w-12 h-12 text-zinc-700" />
                  </motion.div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-zinc-300">Awaiting your vision</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto">Enter a concept above to begin the architectural process.</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-white">Generation History</h2>
                  <p className="text-zinc-500">Your past architectural blueprints.</p>
                </div>
                <button 
                  onClick={() => {
                    const savedHistory = localStorage.getItem('prompt_history');
                    if (savedHistory) setHistory(JSON.parse(savedHistory));
                  }}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 opacity-40">
                  <HistoryIcon className="w-16 h-16 text-zinc-700" />
                  <p className="text-zinc-500">No history found yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {history.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800 rounded-xl text-emerald-400">
                            {getIcon(item.type)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">{item.type}</p>
                            <p className="text-sm font-bold text-zinc-300 line-clamp-1">{item.user_input}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => copyToClipboard(item.prompt, item.id!)}
                            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-400 transition-colors"
                          >
                            {copiedIndex === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => deletePrompt(item.id!)}
                            className="p-2 hover:bg-red-500/10 rounded-xl text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-2xl p-4 text-sm text-zinc-400 italic line-clamp-3">
                        "{item.prompt}"
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                        <span>{new Date(item.created_at!).toLocaleDateString()}</span>
                        <span>{item.aspect}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-16 mt-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-bold">Prompt Architect Pro</h3>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              The world's most advanced prompt engineering platform. Built for visionaries, artists, and architects of the digital age.
            </p>
          </div>
          <div className="space-y-6">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Community</a></li>
            </ul>
          </div>
          <div className="space-y-6 text-right md:text-left">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Connect</h4>
            <div className="flex items-center justify-end gap-6 text-zinc-500">
              <a href="#" className="hover:text-emerald-500 transition-colors">Twitter</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">Discord</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">GitHub</a>
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-right">
              © 2026 ARCHITECT PRO. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
