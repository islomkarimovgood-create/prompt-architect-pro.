/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  History
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PromptVariant {
  type: 'Photo-Realistic' | 'Digital Art' | 'Abstract/Concept';
  prompt: string;
  negative: string;
  aspect: string;
  technicalDetails?: string;
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

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
        
        // Save to Supabase
        try {
          if (supabase) {
            const { error: supabaseError } = await supabase
              .from('prompts')
              .insert(
                data.variants.map((v: any) => ({
                  user_input: input,
                  type: v.type,
                  prompt: v.prompt,
                  negative: v.negative,
                  aspect: v.aspect,
                  created_at: new Date().toISOString()
                }))
              );
            
            if (supabaseError) console.error('Supabase save error:', supabaseError);
          } else {
            console.warn('Supabase credentials missing. Skipping save.');
          }
        } catch (dbErr) {
          console.error('Database connection error:', dbErr);
        }
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

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
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
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Prompt Architect <span className="text-emerald-500">Pro</span></h1>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            <span className="hover:text-zinc-200 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-zinc-200 cursor-pointer transition-colors">Showcase</span>
            <div className="h-4 w-px bg-zinc-800" />
            <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors text-zinc-200">
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Engineer the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Perfect Vision</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Transform simple ideas into high-fidelity prompts for Midjourney, Stable Diffusion, and DALL-E.
          </p>
        </div>

        {/* Input Area */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generatePrompts()}
                placeholder="Describe your idea (e.g., 'A cyberpunk cat in Tokyo')"
                className="flex-1 bg-transparent px-4 py-3 outline-none text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                onClick={generatePrompts}
                disabled={isLoading || !input.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Architect
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-3 text-center flex items-center justify-center gap-1.5">
              <Info className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-6 w-32 bg-zinc-800 rounded-md" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-zinc-800 rounded-md" />
                  <div className="h-4 w-full bg-zinc-800 rounded-md" />
                  <div className="h-4 w-2/3 bg-zinc-800 rounded-md" />
                </div>
                <div className="pt-4 space-y-2">
                  <div className="h-3 w-24 bg-zinc-800 rounded-md" />
                  <div className="h-3 w-full bg-zinc-800 rounded-md" />
                </div>
              </div>
            ))
          ) : (
            variants.map((variant, idx) => (
              <div 
                key={idx}
                className="group relative bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                      {getIcon(variant.type)}
                    </div>
                    <span className="font-bold text-zinc-200 tracking-wide uppercase text-xs">{variant.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700">
                    <Maximize2 className="w-3 h-3" />
                    {variant.aspect}
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Master Prompt</label>
                      <button 
                        onClick={() => copyToClipboard(variant.prompt, idx)}
                        className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-emerald-400"
                        title="Copy Prompt"
                      >
                        {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-4 text-sm leading-relaxed text-zinc-300 font-medium italic">
                      "{variant.prompt}"
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Negative Constraints</label>
                    <div className="bg-zinc-800/30 rounded-xl p-3 text-xs text-zinc-400 font-mono">
                      {variant.negative}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-medium">READY FOR GENERATION</span>
                  <button className="text-[10px] text-emerald-500 font-bold hover:underline flex items-center gap-1">
                    VIEW DETAILS <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Empty State */}
        {!isLoading && variants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-50">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <Sparkles className="w-10 h-10 text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-zinc-300">No blueprints generated yet</h3>
              <p className="text-zinc-500 max-w-sm">Enter a concept above to see professional prompt engineering in action.</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>© 2026 Prompt Architect Pro. Built for creators.</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">API Access</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
