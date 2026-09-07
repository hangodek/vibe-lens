import type { VibeProject } from '../types/ast';

export const PRESET_PROJECTS: VibeProject[] = [
  {
    id: 'ai-studio',
    name: 'DreamCanvas AI Studio',
    framework: 'Next.js 15 (App Router) + Tailwind',
    tagline: 'Text-to-Image generation workspace with live SSE streaming',
    description: 'A vibe-coded generation tool with prompt enhancement, model selectors, streaming image canvas, and generation history.',
    files: [
      {
        id: 'page-studio',
        path: 'app/page.tsx',
        name: 'page.tsx',
        type: 'page',
        lineCount: 84,
        previewType: 'canvas',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          zoneLabel: 'Root Studio Layout Grid'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'High Blast Radius',
          description: 'Orchestrates the entire studio workspace. Changing layout containers or imports affects every child view.',
          impactedFiles: ['PromptBar.tsx', 'CanvasViewer.tsx', 'GalleryFeed.tsx'],
          safeInvariants: [
            'Preserve grid-cols structure so Canvas and Gallery remain aligned',
            'Keep useImageGeneration hook invocation active on root'
          ]
        },
        description: 'The root application dashboard. Arranges the prompt bar, model picker, live canvas, and recent generation gallery in a responsive grid.',
        whyAiMadeThis: 'Cursor created this root page to tie together the input controls, preview canvas, and generation feed without scattering state across separate pages.',
        imports: ['PromptBar', 'ModelSelector', 'CanvasViewer', 'GalleryFeed', 'useImageGeneration'],
        exports: ['StudioPage'],
        components: ['StudioPage'],
        states: [
          {
            name: 'selectedAspect',
            setter: 'setSelectedAspect',
            initialValue: "'1:1'",
            purpose: 'Stores the desired image aspect ratio (1:1, 16:9, or 9:16).',
            modifiedBy: ['CanvasViewer', 'PromptBar']
          }
        ],
        props: [],
        hooks: ['useImageGeneration', 'useState'],
        apiCalls: [],
        renderedChildren: ['PromptBar', 'ModelSelector', 'CanvasViewer', 'GalleryFeed'],
        events: [
          { name: 'onGenerate', handler: 'handleGenerate', targetAction: 'Invokes useImageGeneration().generate()' }
        ],
        code: `import React, { useState } from 'react';
import { PromptBar } from '@/components/PromptBar';
import { ModelSelector } from '@/components/ModelSelector';
import { CanvasViewer } from '@/components/CanvasViewer';
import { GalleryFeed } from '@/components/GalleryFeed';
import { useImageGeneration } from '@/hooks/useImageGeneration';

export default function StudioPage() {
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const { currentJob, isGenerating, history, generate, cancel } = useImageGeneration();

  return (
    <main className="min-h-screen bg-[#010102] text-white flex flex-col">
      <header className="h-14 border-b border-[#23252a] px-6 flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight">DreamCanvas Studio</h1>
        <ModelSelector />
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        <section className="lg:col-span-8 flex flex-col gap-4">
          <CanvasViewer 
            currentJob={currentJob} 
            isGenerating={isGenerating} 
            aspect={aspect} 
            onCancel={cancel} 
          />
          <PromptBar 
            onGenerate={generate} 
            isGenerating={isGenerating} 
            aspect={aspect} 
            setAspect={setAspect} 
          />
        </section>

        <aside className="lg:col-span-4 border border-[#23252a] rounded-xl bg-[#08090a] p-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#8a8f98] mb-4">
            Recent Artifacts ({history.length})
          </h2>
          <GalleryFeed items={history} />
        </aside>
      </div>
    </main>
  );
}`
      },
      {
        id: 'comp-promptbar',
        path: 'components/PromptBar.tsx',
        name: 'PromptBar.tsx',
        type: 'component',
        lineCount: 92,
        previewType: 'prompt-bar',
        screenLocation: {
          xPercent: 5,
          yPercent: 66,
          widthPercent: 60,
          heightPercent: 28,
          zoneLabel: 'Prompt Command Bar (Bottom Left)'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Moderate Impact',
          description: 'Fires onGenerate callback up to the page. Styling, placeholder text, and icon colors are 100% safe to customize.',
          impactedFiles: ['page.tsx', 'useImageGeneration.ts'],
          safeInvariants: [
            'Do NOT remove or rename props onGenerate and isGenerating',
            'Preserve textarea onChange event binding to prompt state',
            'Keep disabled={isGenerating} guard on the generate button'
          ]
        },
        description: 'User input bar with prompt textarea, negative prompt accordion, style presets, and generate button.',
        whyAiMadeThis: 'Lovable isolated the prompt controls here so you can tweak parameters without causing the canvas viewer to re-render constantly.',
        imports: ['useState', 'Sparkles', 'SlidersHorizontal', 'Send'],
        exports: ['PromptBar'],
        components: ['PromptBar'],
        states: [
          {
            name: 'promptText',
            setter: 'setPromptText',
            initialValue: "''",
            purpose: 'Stores the raw text prompt typed by the vibe coder.',
            modifiedBy: ['onChange handler', 'LLM prompt enhancer button']
          },
          {
            name: 'isEnhancing',
            setter: 'setIsEnhancing',
            initialValue: 'false',
            purpose: 'Shows loading spinner while calling LLM prompt expansion.',
            modifiedBy: ['enhancePrompt()']
          }
        ],
        props: [
          { name: 'onGenerate', type: '(prompt: string, options: object) => void', required: true },
          { name: 'isGenerating', type: 'boolean', required: true }
        ],
        hooks: ['useState'],
        apiCalls: [
          { endpoint: '/api/enhance-prompt', method: 'POST', triggeredBy: 'Enhance button click', purpose: 'Expands prompt using GPT-4o mini' }
        ],
        renderedChildren: [],
        events: [
          { name: 'click', handler: 'handleSubmit', targetAction: 'Triggers onGenerate prop with prompt string' },
          { name: 'click', handler: 'handleEnhance', targetAction: 'Calls /api/enhance-prompt' }
        ],
        code: `import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface PromptBarProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  aspect: string;
  setAspect: (a: '1:1' | '16:9' | '9:16') => void;
}

export function PromptBar({ onGenerate, isGenerating }: PromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  async function handleEnhance() {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } finally {
      setIsEnhancing(false);
    }
  }

  return (
    <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-3 flex flex-col gap-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="A cinematic neon-lit alley in Neo Tokyo, 35mm lens, atmospheric fog..."
        className="w-full bg-transparent text-sm resize-none outline-none text-[#f7f8f8] placeholder-[#62666d] h-20"
      />
      <div className="flex items-center justify-between border-t border-[#1c1d22] pt-2">
        <button
          onClick={handleEnhance}
          disabled={isEnhancing || !prompt}
          className="flex items-center gap-1.5 text-xs text-[#5e6ad2] hover:text-[#828fff] disabled:opacity-40"
        >
          {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Vibe Enhance
        </button>

        <button
          onClick={() => onGenerate(prompt)}
          disabled={isGenerating || !prompt}
          className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Generate
        </button>
      </div>
    </div>
  );
}`
      },
      {
        id: 'comp-canvas',
        path: 'components/CanvasViewer.tsx',
        name: 'CanvasViewer.tsx',
        type: 'component',
        lineCount: 78,
        previewType: 'canvas',
        screenLocation: {
          xPercent: 5,
          yPercent: 12,
          widthPercent: 60,
          heightPercent: 50,
          zoneLabel: 'Synthesizer Image Canvas'
        },
        blastRadius: {
          score: 'low',
          riskLabel: 'Low Impact (Leaf View)',
          description: 'Pure display view. 0% risk of breaking application data flow. Safe to modify loading skeletons, aspect ratio borders, or placeholder graphics.',
          impactedFiles: [],
          safeInvariants: [
            'Maintain currentJob null check condition',
            'Keep onCancel prop trigger for streaming aborts'
          ]
        },
        description: 'Displays the active viewport: loading skeleton shimmer, live streaming progress, and high-res rendered output.',
        whyAiMadeThis: 'Separates visual rendering mechanics from input state, preventing UI freezing during heavy image decode.',
        imports: ['Image', 'Download', 'XCircle'],
        exports: ['CanvasViewer'],
        components: ['CanvasViewer'],
        states: [
          {
            name: 'zoomLevel',
            setter: 'setZoomLevel',
            initialValue: '1',
            purpose: 'Controls canvas pan and zoom scale factor.',
            modifiedBy: ['Wheel scroll', 'Zoom buttons']
          }
        ],
        props: [
          { name: 'currentJob', type: 'Job | null', required: true },
          { name: 'isGenerating', type: 'boolean', required: true },
          { name: 'onCancel', type: '() => void', required: true }
        ],
        hooks: ['useState'],
        apiCalls: [],
        renderedChildren: [],
        events: [
          { name: 'click', handler: 'onCancel', targetAction: 'Cancels the active SSE stream' }
        ],
        code: `import React from 'react';
import { Loader2, Download, AlertCircle } from 'lucide-react';

export function CanvasViewer({ currentJob, isGenerating, onCancel }: any) {
  if (isGenerating) {
    return (
      <div className="h-[420px] bg-[#08090a] border border-[#23252a] rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5e6ad2]/10 to-transparent animate-pulse" />
        <Loader2 className="w-8 h-8 text-[#5e6ad2] animate-spin mb-3" />
        <p className="text-sm font-medium text-[#f7f8f8]">Synthesizing diffusion latent space...</p>
        <p className="text-xs text-[#8a8f98] mt-1 font-mono">{currentJob?.progress || 'Step 14/28 (50%)'}</p>
        <button onClick={onCancel} className="mt-4 text-xs text-[#ef4444] hover:underline">
          Cancel Job
        </button>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="h-[420px] bg-[#08090a] border border-[#23252a] rounded-xl flex flex-col items-center justify-center text-center p-6">
        <p className="text-sm text-[#8a8f98]">Canvas Idle</p>
        <p className="text-xs text-[#62666d] mt-1">Enter a prompt below or pick a preset to synthesize an image</p>
      </div>
    );
  }

  return (
    <div className="h-[420px] bg-[#08090a] border border-[#23252a] rounded-xl relative overflow-hidden flex items-center justify-center">
      <img src={currentJob.url} alt="Generated output" className="max-h-full max-w-full object-contain rounded-lg" />
    </div>
  );
}`
      },
      {
        id: 'comp-gallery',
        path: 'components/GalleryFeed.tsx',
        name: 'GalleryFeed.tsx',
        type: 'component',
        lineCount: 65,
        previewType: 'gallery',
        screenLocation: {
          xPercent: 68,
          yPercent: 12,
          widthPercent: 28,
          heightPercent: 82,
          zoneLabel: 'Recent Creations Shelf (Right Sidebar)'
        },
        blastRadius: {
          score: 'low',
          riskLabel: 'Low Impact (Leaf View)',
          description: 'Pure display list. Safe to reformat cards, add download icons, or adjust thumbnail sizing without breaking generation.',
          impactedFiles: [],
          safeInvariants: [
            'Component must accept items array prop',
            'Preserve item.id as the React key in map loop'
          ]
        },
        description: 'Scrollable list of past generated images with copyable prompts, download links, and seed parameters.',
        whyAiMadeThis: 'Maintains user session memory so vibe coders can quickly review iterations without losing past creative work.',
        imports: ['Copy', 'Check'],
        exports: ['GalleryFeed'],
        components: ['GalleryFeed'],
        states: [
          {
            name: 'copiedIndex',
            setter: 'setCopiedIndex',
            initialValue: 'null',
            purpose: 'Shows temporary green checkmark when prompt is copied to clipboard.',
            modifiedBy: ['copyToClipboard()']
          }
        ],
        props: [{ name: 'items', type: 'GeneratedItem[]', required: true }],
        hooks: ['useState'],
        apiCalls: [],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'handleCopy', targetAction: 'Copies prompt to clipboard' }],
        code: `import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function GalleryFeed({ items }: { items: any[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  return (
    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
      {items.map((item) => (
        <div key={item.id} className="p-2.5 rounded-lg bg-[#121316] border border-[#23252a] flex gap-3 items-center">
          <img src={item.url} className="w-14 h-14 rounded object-cover" alt="thumbnail" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#f7f8f8] truncate">{item.prompt}</p>
            <p className="text-[10px] text-[#8a8f98] font-mono mt-0.5">{item.model} · {item.aspect}</p>
          </div>
        </div>
      ))}
    </div>
  );
}`
      },
      {
        id: 'hook-generator',
        path: 'hooks/useImageGeneration.ts',
        name: 'useImageGeneration.ts',
        type: 'hook',
        lineCount: 104,
        previewType: 'generic',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Background Logic Engine (Non-Visual)'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Critical Core Engine',
          description: 'Manages generation state, network requests, and history array. 4 components depend on its return signature.',
          impactedFiles: ['page.tsx', 'PromptBar.tsx', 'CanvasViewer.tsx', 'GalleryFeed.tsx'],
          safeInvariants: [
            'Do NOT change the generate(prompt) function signature',
            'Keep isGenerating boolean and currentJob object reactive',
            'Preserve history array state formatting'
          ]
        },
        description: 'Custom React hook orchestrating API calls, Server-Sent Events (SSE) streaming updates, and state persistence.',
        whyAiMadeThis: 'Cursor extracted the networking logic out of the UI components to avoid duplicate state and race conditions across components.',
        imports: ['useState', 'useCallback', 'useRef'],
        exports: ['useImageGeneration'],
        components: [],
        states: [
          {
            name: 'isGenerating',
            setter: 'setIsGenerating',
            initialValue: 'false',
            purpose: 'Signals whether a network request or streaming job is currently running.',
            modifiedBy: ['generate()', 'stream completion', 'cancel()']
          },
          {
            name: 'currentJob',
            setter: 'setCurrentJob',
            initialValue: 'null',
            purpose: 'Contains the active generation metadata (progress percentage, status, partial previews).',
            modifiedBy: ['SSE event stream chunk listener']
          },
          {
            name: 'history',
            setter: 'setHistory',
            initialValue: '[]',
            purpose: 'Array of completed generation objects stored locally in memory.',
            modifiedBy: ['generate.onSuccess']
          }
        ],
        props: [],
        hooks: ['useState', 'useCallback', 'useRef'],
        apiCalls: [
          { endpoint: '/api/generate', method: 'POST', triggeredBy: 'generate()', purpose: 'Starts backend inference job' }
        ],
        renderedChildren: [],
        events: [],
        code: `import { useState, useCallback, useRef } from 'react';

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([
    {
      id: 'gen-1',
      prompt: 'Cyberpunk rainy market street with hologram koi fish',
      model: 'Flux-Dev',
      aspect: '16:9',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60'
    }
  ]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal
      });

      const result = await res.json();
      setCurrentJob(result);
      setHistory(prev => [result, ...prev]);
    } catch (err) {
      console.error('Generation error', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  return { currentJob, isGenerating, history, generate, cancel };
}`
      },
      {
        id: 'api-generate',
        path: 'app/api/generate/route.ts',
        name: 'route.ts',
        type: 'api',
        lineCount: 46,
        previewType: 'api-terminal',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Serverless Endpoint (/api/generate)'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Server Endpoint',
          description: 'Serverless route communicating with AI GPU models. Modifying return JSON keys breaks the frontend hook.',
          impactedFiles: ['useImageGeneration.ts'],
          safeInvariants: [
            'Return JSON must include url string property',
            'Handle POST request with valid prompt verification'
          ]
        },
        description: 'Next.js API route proxying prompts to external GPU inference endpoints (Fal.ai / Replicate / Together AI).',
        whyAiMadeThis: 'Protects secret API keys on the server side so they are never leaked to client-side browser bundles.',
        imports: ['NextResponse', 'NextRequest'],
        exports: ['POST'],
        components: [],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  // Simulated AI inference latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const artifact = {
    id: 'gen-' + Date.now(),
    prompt,
    model: 'Flux Schnell 1.0',
    aspect: '1:1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  };

  return NextResponse.json(artifact);
}`
      }
    ],
    traces: [
      {
        id: 'trace-generate',
        title: 'Generate Image Journey',
        triggerLabel: "User clicks 'Generate' in PromptBar",
        description: 'A visual human story of how a user prompt transforms into a rendered artwork on screen.',
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            title: 'User fires Click Event in PromptBar',
            description: 'User enters text and clicks Generate. PromptBar validates input and triggers onGenerate prop callback.',
            activeNodeId: 'comp-promptbar',
            targetNodeId: 'page-studio',
            lineHighlight: 45,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'The Trigger',
              story: 'The user finishes typing their prompt and clicks Generate in the command bar.',
              humanCausality: 'PromptBar verifies text is not empty and calls onGenerate to notify the studio page.'
            }
          },
          {
            id: 'step-2',
            stepNumber: 2,
            title: 'useImageGeneration sets isGenerating = true',
            description: 'Hook toggles boolean state, immediately disabling inputs and triggering loading skeleton on the canvas.',
            activeNodeId: 'hook-generator',
            targetNodeId: 'comp-canvas',
            lineHighlight: 16,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'The Instant Reaction',
              story: 'The app locks the buttons and turns CanvasViewer into a glowing purple loading screen.',
              humanCausality: 'isGenerating flips to true, preventing double-clicks and reassuring the user that work started.'
            }
          },
          {
            id: 'step-3',
            stepNumber: 3,
            title: 'POST request dispatched to /api/generate',
            description: 'Browser sends JSON payload with prompt string and aspect ratio to secure serverless route.',
            activeNodeId: 'hook-generator',
            targetNodeId: 'api-generate',
            lineHighlight: 20,
            storybook: {
              chapterNumber: 3,
              chapterTitle: 'The Secret Dispatch',
              story: 'useImageGeneration sends the prompt behind the scenes to /api/generate.',
              humanCausality: 'A background HTTP request travels to the server route where private keys are kept secure.'
            }
          },
          {
            id: 'step-4',
            stepNumber: 4,
            title: 'Server synthesizes and returns artifact JSON',
            description: 'Backend contacts inference cluster, receives image CDN URL, and returns structured response.',
            activeNodeId: 'api-generate',
            targetNodeId: 'hook-generator',
            lineHighlight: 24,
            storybook: {
              chapterNumber: 4,
              chapterTitle: 'The AI Synthesis',
              story: 'The server contacts the AI model cluster and receives the finished image CDN link.',
              humanCausality: 'The server route bundles the image link with creation metadata and sends it back to the browser.'
            }
          },
          {
            id: 'step-5',
            stepNumber: 5,
            title: 'CanvasViewer and GalleryFeed update',
            description: 'Hook appends item to history and updates currentJob. Canvas displays final image and Gallery adds card.',
            activeNodeId: 'hook-generator',
            targetNodeId: 'comp-canvas',
            lineHighlight: 28,
            storybook: {
              chapterNumber: 5,
              chapterTitle: 'The Grand Reveal',
              story: 'The canvas displays high-res artwork, and GalleryFeed slides a new card onto the shelf.',
              humanCausality: 'State updates trigger screen repaints: the canvas renders the image and the recent feed updates.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'saas-billing',
    name: 'OpsMetric SaaS & Billing',
    framework: 'React 19 + Tailwind + Stripe',
    tagline: 'Multi-tenant subscription meter with automatic usage caps & upgrade triggers',
    description: 'A developer metrics SaaS showing how usage telemetry triggers billing upgrade dialogs and checkout flows.',
    files: [
      {
        id: 'page-dashboard',
        path: 'app/dashboard/page.tsx',
        name: 'page.tsx',
        type: 'page',
        lineCount: 76,
        previewType: 'meter',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          zoneLabel: 'Workspace Telemetry Hub'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'High Blast Radius',
          description: 'Orchestrates the telemetry dashboard and controls billing modal open state.',
          impactedFiles: ['UsageMeter.tsx', 'BillingModal.tsx'],
          safeInvariants: [
            'Maintain isUpgradeOpen boolean state',
            'Keep useSubscription hook integration'
          ]
        },
        description: 'Main monitoring view displaying telemetry charts, API keys, and plan tier limits.',
        whyAiMadeThis: 'Serves as the operational hub where users monitor quota consumption.',
        imports: ['UsageMeter', 'BillingModal', 'useSubscription'],
        exports: ['DashboardPage'],
        components: ['DashboardPage'],
        states: [
          {
            name: 'isUpgradeOpen',
            setter: 'setIsUpgradeOpen',
            initialValue: 'false',
            purpose: 'Controls visibility of the Stripe upgrade dialog.',
            modifiedBy: ['UsageMeter CTA click', 'Header Upgrade button']
          }
        ],
        props: [],
        hooks: ['useSubscription', 'useState'],
        apiCalls: [],
        renderedChildren: ['UsageMeter', 'BillingModal'],
        events: [{ name: 'click', handler: 'openUpgrade', targetAction: 'Sets isUpgradeOpen(true)' }],
        code: `import React, { useState } from 'react';
import { UsageMeter } from '@/components/UsageMeter';
import { BillingModal } from '@/components/BillingModal';
import { useSubscription } from '@/hooks/useSubscription';

export default function DashboardPage() {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const { plan, usage, limit, isOverLimit } = useSubscription();

  return (
    <div className="min-h-screen bg-[#010102] text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-[#23252a] pb-4">
        <div>
          <h1 className="text-xl font-bold">Workspace Telemetry</h1>
          <p className="text-xs text-[#8a8f98]">Current tier: <span className="text-[#5e6ad2] font-mono">{plan.toUpperCase()}</span></p>
        </div>
        <button 
          onClick={() => setIsUpgradeOpen(true)}
          className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium rounded-lg"
        >
          Change Plan
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UsageMeter usage={usage} limit={limit} onUpgrade={() => setIsUpgradeOpen(true)} />
      </div>

      <BillingModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} currentPlan={plan} />
    </div>
  );
}`
      },
      {
        id: 'comp-meter',
        path: 'components/UsageMeter.tsx',
        name: 'UsageMeter.tsx',
        type: 'component',
        lineCount: 58,
        previewType: 'meter',
        screenLocation: {
          xPercent: 8,
          yPercent: 22,
          widthPercent: 44,
          heightPercent: 50,
          zoneLabel: 'Usage Quota Gauge'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Moderate Impact',
          description: 'Triggers upgrade modal when clicked. Safe to restyle progress bars and colors.',
          impactedFiles: ['page.tsx'],
          safeInvariants: [
            'Keep onUpgrade prop function',
            'Preserve percent calculation logic'
          ]
        },
        description: 'Visual progress gauge showing monthly event counts against free tier quotas with warning alerts.',
        whyAiMadeThis: 'Encourages conversion by showing when the user is approaching hard account limits.',
        imports: ['AlertTriangle', 'Zap'],
        exports: ['UsageMeter'],
        components: ['UsageMeter'],
        states: [],
        props: [
          { name: 'usage', type: 'number', required: true },
          { name: 'limit', type: 'number', required: true },
          { name: 'onUpgrade', type: '() => void', required: true }
        ],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'onUpgrade', targetAction: 'Triggers upgrade modal callback' }],
        code: `import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';

export function UsageMeter({ usage, limit, onUpgrade }: any) {
  const percent = Math.min(100, Math.round((usage / limit) * 100));
  const isNearLimit = percent >= 80;

  return (
    <div className="bg-[#08090a] border border-[#23252a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-[#8a8f98] uppercase">Monthly Ingested Events</span>
        {isNearLimit && (
          <span className="flex items-center gap-1 text-[11px] text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Approaching Quota
          </span>
        )}
      </div>

      <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
        {usage.toLocaleString()} <span className="text-sm text-[#8a8f98] font-normal">/ {limit.toLocaleString()}</span>
      </div>

      <div className="w-full bg-[#1c1d22] h-2 rounded-full mt-4 overflow-hidden">
        <div className="bg-[#5e6ad2] h-full transition-all duration-500" style={{ width: \`\${percent}%\` }} />
      </div>

      {isNearLimit && (
        <button onClick={onUpgrade} className="mt-4 w-full py-2 bg-[#121316] hover:bg-[#1c1d22] border border-[#23252a] text-xs text-[#f7f8f8] rounded-lg">
          Upgrade to Unlimited Pro
        </button>
      )}
    </div>
  );
}`
      },
      {
        id: 'comp-billing-modal',
        path: 'components/BillingModal.tsx',
        name: 'BillingModal.tsx',
        type: 'component',
        lineCount: 88,
        previewType: 'billing-modal',
        screenLocation: {
          xPercent: 26,
          yPercent: 18,
          widthPercent: 48,
          heightPercent: 64,
          zoneLabel: 'Tier Selection Dialog Overlay'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Moderate Impact',
          description: 'Dispatches Stripe checkout request. Safe to tweak plan features and price badges.',
          impactedFiles: ['page.tsx', 'route.ts'],
          safeInvariants: [
            'Keep onClose prop handler intact',
            'Preserve handleCheckout(tier) call'
          ]
        },
        description: 'Modal overlay with tier pricing cards (Free, Pro $29/mo, Enterprise) connected to Stripe checkout API.',
        whyAiMadeThis: 'Isolates the Stripe session creation flow to prevent cluttering the main dashboard controller.',
        imports: ['Check', 'X', 'Loader2'],
        exports: ['BillingModal'],
        components: ['BillingModal'],
        states: [
          {
            name: 'loadingTier',
            setter: 'setLoadingTier',
            initialValue: 'null',
            purpose: 'Shows loading spinner on the selected checkout button.',
            modifiedBy: ['checkout()']
          }
        ],
        props: [
          { name: 'isOpen', type: 'boolean', required: true },
          { name: 'onClose', type: '() => void', required: true },
          { name: 'currentPlan', type: 'string', required: true }
        ],
        hooks: ['useState'],
        apiCalls: [
          { endpoint: '/api/checkout', method: 'POST', triggeredBy: 'Tier card CTA click', purpose: 'Creates Stripe checkout session' }
        ],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'handleCheckout', targetAction: 'Redirects browser to Stripe' }],
        code: `import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

export function BillingModal({ isOpen, onClose, currentPlan }: any) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCheckout(tier: string) {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#08090a] border border-[#23252a] rounded-xl max-w-xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8a8f98] hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold">Select Subscription Tier</h2>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="border border-[#23252a] rounded-lg p-4 bg-[#121316]">
            <h3 className="text-sm font-semibold">Developer Starter</h3>
            <p className="text-2xl font-bold font-mono mt-2">$0 <span className="text-xs text-[#8a8f98]">/mo</span></p>
          </div>
          <div className="border border-[#5e6ad2] rounded-lg p-4 bg-[#121316] relative">
            <span className="absolute -top-2.5 right-3 bg-[#5e6ad2] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">Recommended</span>
            <h3 className="text-sm font-semibold">Pro Scale</h3>
            <p className="text-2xl font-bold font-mono mt-2">$29 <span className="text-xs text-[#8a8f98]">/mo</span></p>
            <button 
              onClick={() => handleCheckout('pro')}
              disabled={!!loadingTier}
              className="mt-4 w-full py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs rounded-lg flex items-center justify-center gap-2"
            >
              {loadingTier === 'pro' && <Loader2 className="w-3 h-3 animate-spin" />}
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`
      },
      {
        id: 'hook-subscription',
        path: 'hooks/useSubscription.ts',
        name: 'useSubscription.ts',
        type: 'hook',
        lineCount: 45,
        previewType: 'generic',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Subscription Context (Non-Visual)'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Critical Core Engine',
          description: 'Supplies billing status and monthly usage counters across all views.',
          impactedFiles: ['page.tsx', 'UsageMeter.tsx'],
          safeInvariants: [
            'Preserve plan, usage, and limit return properties',
            'Keep isOverLimit calculated boolean'
          ]
        },
        description: 'Supplies subscription context, current billing cycles, and live usage numbers to child views.',
        whyAiMadeThis: 'Provides a single source of truth for billing across multiple views.',
        imports: ['useState', 'useEffect'],
        exports: ['useSubscription'],
        components: [],
        states: [
          {
            name: 'subscriptionData',
            setter: 'setSubscriptionData',
            initialValue: "{ plan: 'free', usage: 84200, limit: 100000 }",
            purpose: 'Holds billing cache and usage counters.',
            modifiedBy: ['Initial load fetch', 'Stripe webhook refetch']
          }
        ],
        props: [],
        hooks: ['useState', 'useEffect'],
        apiCalls: [{ endpoint: '/api/usage', method: 'GET', triggeredBy: 'Mount', purpose: 'Fetches active quota' }],
        renderedChildren: [],
        events: [],
        code: `import { useState, useEffect } from 'react';

export function useSubscription() {
  const [data, setData] = useState({
    plan: 'free',
    usage: 84200,
    limit: 100000,
  });

  const isOverLimit = data.usage >= data.limit;

  return {
    plan: data.plan,
    usage: data.usage,
    limit: data.limit,
    isOverLimit,
    reload: () => {}
  };
}`
      },
      {
        id: 'api-checkout',
        path: 'app/api/checkout/route.ts',
        name: 'route.ts',
        type: 'api',
        lineCount: 38,
        previewType: 'api-terminal',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Server Endpoint (/api/checkout)'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Payment Gateway',
          description: 'Generates Stripe Checkout sessions. Modifying response keys causes redirect failures.',
          impactedFiles: ['BillingModal.tsx'],
          safeInvariants: [
            'Must return JSON containing url key for redirect'
          ]
        },
        description: 'Creates a Stripe Checkout session and returns the hosted payment URL.',
        whyAiMadeThis: 'Handles server-side Stripe secret key authorization and metadata passing.',
        imports: ['NextResponse', 'NextRequest'],
        exports: ['POST'],
        components: [],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { tier } = await req.json();

  // Simulated Stripe Checkout URL creation
  return NextResponse.json({
    sessionId: 'cs_test_' + Math.random().toString(36).substring(7),
    url: 'https://checkout.stripe.com/c/pay/cs_test_sample_session'
  });
}`
      }
    ],
    traces: [
      {
        id: 'trace-upgrade',
        title: 'Subscription Upgrade Journey',
        triggerLabel: "User clicks 'Upgrade to Unlimited Pro'",
        description: 'Follows how an approaching quota warning leads into a secure Stripe checkout session.',
        steps: [
          {
            id: 'step-u1',
            stepNumber: 1,
            title: 'User clicks Upgrade in UsageMeter',
            description: 'UsageMeter triggers onUpgrade prop which signals the parent DashboardPage.',
            activeNodeId: 'comp-meter',
            targetNodeId: 'page-dashboard',
            lineHighlight: 28,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'The Quota Alert',
              story: 'The user notices their monthly quota is 84% full and clicks Upgrade in UsageMeter.',
              humanCausality: 'UsageMeter fires onUpgrade to inform the dashboard that the user wants to upgrade.'
            }
          },
          {
            id: 'step-u2',
            stepNumber: 2,
            title: 'DashboardPage opens BillingModal',
            description: 'State isUpgradeOpen becomes true, mounting the modal dialog overlay.',
            activeNodeId: 'page-dashboard',
            targetNodeId: 'comp-billing-modal',
            lineHighlight: 9,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'Opening the Options',
              story: 'The dashboard opens the plan selection modal over the screen.',
              humanCausality: 'isUpgradeOpen becomes true, mounting the tier cards with pricing details.'
            }
          },
          {
            id: 'step-u3',
            stepNumber: 3,
            title: 'User clicks Pro Scale checkout',
            description: 'BillingModal dispatches POST request to /api/checkout with tier: pro.',
            activeNodeId: 'comp-billing-modal',
            targetNodeId: 'api-checkout',
            lineHighlight: 16,
            storybook: {
              chapterNumber: 3,
              chapterTitle: 'The Stripe Handshake',
              story: 'The user selects Pro Scale ($29/mo), triggering a checkout creation request.',
              humanCausality: 'BillingModal calls /api/checkout to generate a secure Stripe session URL.'
            }
          },
          {
            id: 'step-u4',
            stepNumber: 4,
            title: 'Server returns Stripe checkout redirect URL',
            description: 'Browser navigates customer to Stripe secure payment portal.',
            activeNodeId: 'api-checkout',
            targetNodeId: 'comp-billing-modal',
            lineHighlight: 7,
            storybook: {
              chapterNumber: 4,
              chapterTitle: 'The Secure Redirect',
              story: 'The server returns the Stripe payment link and the browser navigates the user.',
              humanCausality: 'window.location.href updates with the checkout URL to complete credit card payment.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'ecommerce-cart',
    name: 'KicksDrop E-Commerce & Cart',
    framework: 'React 19 + Zustand + Tailwind',
    tagline: 'Sneaker drop storefront with slide-out cart and coupon discount engine',
    description: 'A hype sneaker drop store demonstrating global Zustand state, cart drawers, and price discount calculations.',
    files: [
      {
        id: 'page-store',
        path: 'app/shop/page.tsx',
        name: 'page.tsx',
        type: 'page',
        lineCount: 68,
        previewType: 'product-card',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          zoneLabel: 'Storefront Product Grid'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'High Blast Radius',
          description: 'Renders the product catalog and mounts the global cart drawer.',
          impactedFiles: ['ProductCard.tsx', 'CartDrawer.tsx'],
          safeInvariants: [
            'Maintain PRODUCTS array data format',
            'Keep useCartStore subscription active'
          ]
        },
        description: 'Catalog listing page displaying sneaker releases, filter chips, and cart launch button.',
        whyAiMadeThis: 'Central grid coordinator displaying merchandise items.',
        imports: ['ProductCard', 'CartDrawer', 'useCartStore'],
        exports: ['ShopPage'],
        components: ['ShopPage'],
        states: [],
        props: [],
        hooks: ['useCartStore'],
        apiCalls: [],
        renderedChildren: ['ProductCard', 'CartDrawer'],
        events: [],
        code: `import React from 'react';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { useCartStore } from '@/stores/useCartStore';

const PRODUCTS = [
  { id: 'shoe-1', title: 'Retro High OG Neon', price: 180, image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60' },
  { id: 'shoe-2', title: 'Cyber Runner 3000', price: 210, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60' }
];

export default function ShopPage() {
  const { isDrawerOpen, toggleDrawer, totalItems } = useCartStore();

  return (
    <div className="min-h-screen bg-[#010102] text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-[#23252a] pb-4">
        <h1 className="text-xl font-bold tracking-tight">KICKS DROP</h1>
        <button onClick={toggleDrawer} className="px-4 py-2 bg-[#121316] border border-[#23252a] rounded-lg text-xs">
          Cart ({totalItems()})
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS.map(p => <ProductCard key={p.id} product={p} />)}
      </div>

      <CartDrawer isOpen={isDrawerOpen} />
    </div>
  );
}`
      },
      {
        id: 'comp-prodcard',
        path: 'components/ProductCard.tsx',
        name: 'ProductCard.tsx',
        type: 'component',
        lineCount: 54,
        previewType: 'product-card',
        screenLocation: {
          xPercent: 8,
          yPercent: 18,
          widthPercent: 28,
          heightPercent: 68,
          zoneLabel: 'Product Listing Card'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Moderate Impact',
          description: 'Pushes items into the Zustand store. Safe to adjust photo borders, badges, or price typography.',
          impactedFiles: ['useCartStore.ts'],
          safeInvariants: [
            'Maintain addItem({ ...product, size }) call',
            'Keep size selection state'
          ]
        },
        description: 'Sneaker card displaying photo, size picker chips, and quick-add button.',
        whyAiMadeThis: 'Encapsulates localized size selection before pushing to the global cart store.',
        imports: ['useState', 'useCartStore'],
        exports: ['ProductCard'],
        components: ['ProductCard'],
        states: [
          {
            name: 'selectedSize',
            setter: 'setSelectedSize',
            initialValue: "'10'",
            purpose: 'Stores shoe size picked by customer before adding to cart.',
            modifiedBy: ['Size chip click']
          }
        ],
        props: [{ name: 'product', type: 'Product', required: true }],
        hooks: ['useState', 'useCartStore'],
        apiCalls: [],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'handleAdd', targetAction: 'Invokes addItem() on Zustand store' }],
        code: `import React, { useState } from 'react';
import { useCartStore } from '@/stores/useCartStore';

export function ProductCard({ product }: any) {
  const [size, setSize] = useState('10');
  const addItem = useCartStore(s => s.addItem);

  return (
    <div className="bg-[#08090a] border border-[#23252a] rounded-xl overflow-hidden p-4">
      <img src={product.image} className="w-full h-48 object-cover rounded-lg mb-3" alt={product.title} />
      <h3 className="text-sm font-semibold">{product.title}</h3>
      <p className="text-xs text-[#8a8f98] font-mono mt-1">\${product.price}</p>
      
      <div className="flex gap-2 my-3">
        {['9', '10', '11'].map(s => (
          <button key={s} onClick={() => setSize(s)} className={\`px-2 py-1 text-xs rounded \${size === s ? 'bg-[#5e6ad2] text-white' : 'bg-[#121316] text-[#8a8f98]'}\`}>
            {s}
          </button>
        ))}
      </div>

      <button onClick={() => addItem({ ...product, size })} className="w-full py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs rounded-lg">
        Add to Cart
      </button>
    </div>
  );
}`
      },
      {
        id: 'comp-cartdrawer',
        path: 'components/CartDrawer.tsx',
        name: 'CartDrawer.tsx',
        type: 'component',
        lineCount: 82,
        previewType: 'cart-drawer',
        screenLocation: {
          xPercent: 68,
          yPercent: 0,
          widthPercent: 32,
          heightPercent: 100,
          zoneLabel: 'Slideout Cart Drawer'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Moderate Impact',
          description: 'Renders cart items and checkout total. Safe to restyle item rows and trash icons.',
          impactedFiles: ['useCartStore.ts'],
          safeInvariants: [
            'Keep isOpen conditional check',
            'Preserve removeItem and subtotal calls'
          ]
        },
        description: 'Slide-over drawer showing selected sneakers, quantity adjusters, and subtotal calculation.',
        whyAiMadeThis: 'Provides instant cart access from any screen without full page reloads.',
        imports: ['useCartStore', 'X', 'Trash2'],
        exports: ['CartDrawer'],
        components: ['CartDrawer'],
        states: [],
        props: [{ name: 'isOpen', type: 'boolean', required: true }],
        hooks: ['useCartStore'],
        apiCalls: [],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'removeItem', targetAction: 'Deletes item from cart store' }],
        code: `import React from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { X, Trash2 } from 'lucide-react';

export function CartDrawer({ isOpen }: { isOpen: boolean }) {
  const { items, removeItem, toggleDrawer, subtotal } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-end">
      <div className="w-full max-w-md bg-[#08090a] border-l border-[#23252a] h-full p-6 flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
          <h2 className="text-sm font-semibold">Your Cart ({items.length})</h2>
          <button onClick={toggleDrawer} className="text-[#8a8f98] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-center bg-[#121316] p-3 rounded-lg border border-[#23252a]">
              <img src={item.image} className="w-12 h-12 rounded object-cover" alt="" />
              <div className="flex-1">
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="text-[11px] text-[#8a8f98]">Size {item.size} · \${item.price}</p>
              </div>
              <button onClick={() => removeItem(idx)} className="text-[#ef4444]"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <div className="border-t border-[#23252a] pt-4">
          <div className="flex justify-between text-sm font-mono mb-4">
            <span>Subtotal</span>
            <span>\${subtotal()}</span>
          </div>
          <button className="w-full py-2.5 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}`
      },
      {
        id: 'store-cart',
        path: 'stores/useCartStore.ts',
        name: 'useCartStore.ts',
        type: 'store',
        lineCount: 48,
        previewType: 'generic',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Zustand Memory Bank (Non-Visual)'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Critical Core Engine',
          description: 'Global state holding cart items and drawer visibility. Multiple components rely on its methods.',
          impactedFiles: ['page.tsx', 'ProductCard.tsx', 'CartDrawer.tsx'],
          safeInvariants: [
            'Do NOT delete addItem, removeItem, or toggleDrawer actions',
            'Keep subtotal computation formula intact'
          ]
        },
        description: 'Global Zustand state store managing item lists, drawer toggle flags, and order total formulas.',
        whyAiMadeThis: 'Avoids prop drilling cart items across unrelated component branches.',
        imports: ['create'],
        exports: ['useCartStore'],
        components: [],
        states: [
          {
            name: 'items',
            setter: 'addItem, removeItem',
            initialValue: '[]',
            purpose: 'Array of shoe items currently placed in cart.',
            modifiedBy: ['ProductCard add', 'CartDrawer delete']
          },
          {
            name: 'isDrawerOpen',
            setter: 'toggleDrawer',
            initialValue: 'false',
            purpose: 'Controls open/close state of the slideout cart drawer.',
            modifiedBy: ['Header cart button', 'Product add']
          }
        ],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `import { create } from 'zustand';

interface CartState {
  items: any[];
  isDrawerOpen: boolean;
  addItem: (item: any) => void;
  removeItem: (index: number) => void;
  toggleDrawer: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [
    { title: 'Retro High OG Neon', price: 180, size: '10', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60' }
  ],
  isDrawerOpen: false,
  addItem: (item) => set((s) => ({ items: [...s.items, item], isDrawerOpen: true })),
  removeItem: (idx) => set((s) => ({ items: s.items.filter((_, i) => i !== idx) })),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
  totalItems: () => get().items.length,
  subtotal: () => get().items.reduce((acc, item) => acc + item.price, 0)
}));`
      }
    ],
    traces: [
      {
        id: 'trace-add-cart',
        title: 'Add Sneaker to Cart Journey',
        triggerLabel: "User clicks 'Add to Cart'",
        description: 'Visualizes how picking a sneaker size mutates global cart memory and slides out the drawer.',
        steps: [
          {
            id: 'step-c1',
            stepNumber: 1,
            title: 'User picks Size 10 and clicks Add to Cart',
            description: 'ProductCard packages size and product ID and calls addItem action.',
            activeNodeId: 'comp-prodcard',
            targetNodeId: 'store-cart',
            lineHighlight: 22,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'The Size Selection',
              story: 'The customer picks size 10 on the sneaker card and taps Add to Cart.',
              humanCausality: 'ProductCard gathers the shoe title, price, and chosen size, then calls the store.'
            }
          },
          {
            id: 'step-c2',
            stepNumber: 2,
            title: 'useCartStore mutates items and sets isDrawerOpen = true',
            description: 'Zustand emits reactive notification to all subscriber components.',
            activeNodeId: 'store-cart',
            targetNodeId: 'comp-cartdrawer',
            lineHighlight: 19,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'Store Mutation',
              story: 'The central cart memory appends the sneaker and switches the drawer open flag to true.',
              humanCausality: 'Zustand updates reactive subscribers across the app without full page reloads.'
            }
          },
          {
            id: 'step-c3',
            stepNumber: 3,
            title: 'CartDrawer slides out and recalculates subtotal',
            description: 'The cart drawer receives new item count and animates into viewport.',
            activeNodeId: 'comp-cartdrawer',
            targetNodeId: 'page-store',
            lineHighlight: 34,
            storybook: {
              chapterNumber: 3,
              chapterTitle: 'The Drawer Slides In',
              story: 'The right drawer animates in with the sneaker thumbnail, recalculating the total order price.',
              humanCausality: 'CartDrawer re-renders with the new array of items, ready for checkout.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'vue-pulse',
    name: 'NuxtPulse Telemetry',
    framework: 'Vue 3 + Nuxt 3 + Pinia',
    tagline: 'Real-time telemetry monitor with Vue SFCs and Pinia reactive stores',
    description: 'A modern Vue 3 application demonstrating Single File Components (<template> & <script setup>), Pinia stores, and Nuxt server handlers.',
    files: [
      {
        id: 'vue-page-index',
        path: 'pages/index.vue',
        name: 'index.vue',
        type: 'page',
        lineCount: 56,
        stack: 'vue',
        previewType: 'meter',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          zoneLabel: 'Vue 3 Live Dashboard'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Root Vue Template',
          description: 'Orchestrates child Vue components and hooks into Pinia telemetry store.',
          impactedFiles: ['MetricGauge.vue', 'useTelemetry.ts'],
          safeInvariants: ['Keep storeToRefs or reactive pinia bindings', 'Preserve template grid layout']
        },
        description: 'Main Vue 3 route rendering telemetry cards and reactive stream meters.',
        whyAiMadeThis: 'Cursor scaffolded this Vue Single File Component to cleanly separate markup from script logic.',
        imports: ['MetricGauge', 'useTelemetryStore', 'storeToRefs'],
        exports: ['IndexPage'],
        components: ['IndexPage'],
        states: [
          {
            name: 'refreshInterval',
            setter: 'setInterval',
            initialValue: '3000',
            purpose: 'Controls polling frequency for new telemetry events.',
            modifiedBy: ['mounted hook']
          }
        ],
        props: [],
        hooks: ['useTelemetryStore'],
        apiCalls: [],
        renderedChildren: ['MetricGauge'],
        events: [{ name: 'refresh', handler: 'store.refreshData', targetAction: 'Triggers Pinia store action' }],
        code: `<template>
  <div class="min-h-screen bg-[#010102] text-white p-8">
    <header class="flex justify-between items-center mb-8 border-b border-[#23252a] pb-4">
      <div>
        <h1 class="text-xl font-bold font-mono">NuxtPulse Telemetry</h1>
        <p class="text-xs text-[#8a8f98]">Vue 3 Reactive Dashboard</p>
      </div>
      <button @click="store.refreshData" class="px-4 py-2 bg-[#5e6ad2] text-white text-xs rounded-lg">
        Poll Now
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <MetricGauge :metrics="store.metrics" @refresh="store.refreshData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MetricGauge from '~/components/MetricGauge.vue';
import { useTelemetryStore } from '~/stores/useTelemetry';

const store = useTelemetryStore();
</script>`
      },
      {
        id: 'vue-comp-gauge',
        path: 'components/MetricGauge.vue',
        name: 'MetricGauge.vue',
        type: 'component',
        lineCount: 48,
        stack: 'vue',
        previewType: 'meter',
        screenLocation: {
          xPercent: 10,
          yPercent: 20,
          widthPercent: 40,
          heightPercent: 45,
          zoneLabel: 'Vue Metric Gauge Tile'
        },
        blastRadius: {
          score: 'low',
          riskLabel: 'Low Impact (Leaf Vue SFC)',
          description: 'Renders incoming metrics. Safe to modify CSS styling or SVG gauge charts.',
          impactedFiles: [],
          safeInvariants: ['Preserve defineProps<{ metrics: object }>()']
        },
        description: 'Single File Component rendering circular telemetry gauge with Vue scoped CSS.',
        whyAiMadeThis: 'Encapsulates data visualization styling so parent templates remain concise.',
        imports: ['defineProps', 'defineEmits'],
        exports: ['MetricGauge'],
        components: ['MetricGauge'],
        states: [],
        props: [{ name: 'metrics', type: 'object', required: true }],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [{ name: 'click', handler: 'emit("refresh")', targetAction: 'Emits refresh event to parent' }],
        code: `<template>
  <div class="bg-[#08090a] border border-[#23252a] rounded-xl p-6">
    <div class="flex justify-between items-center mb-4">
      <span class="text-xs font-mono text-[#8a8f98]">EVENT INGESTION RATE</span>
      <span class="text-[10px] text-[#34d399] font-mono">Vue 3 Reactive</span>
    </div>
    <div class="text-3xl font-bold font-mono text-white">4,812 req/s</div>
    <button @click="$emit('refresh')" class="mt-4 text-xs text-[#5e6ad2] hover:underline">
      Force Health Check
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ metrics?: Record<string, unknown> }>();
defineEmits<{ (e: 'refresh'): void }>();
</script>`
      },
      {
        id: 'vue-store-pinia',
        path: 'stores/useTelemetry.ts',
        name: 'useTelemetry.ts',
        type: 'store',
        lineCount: 42,
        stack: 'vue',
        previewType: 'generic',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Pinia Reactive State Store'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Critical Pinia Store',
          description: 'Global Pinia store managing telemetry cache and polling requests.',
          impactedFiles: ['index.vue', 'MetricGauge.vue'],
          safeInvariants: ['Do NOT remove refreshData action', 'Keep metrics reactive ref']
        },
        description: 'Pinia state management module providing reactive telemetry data across Vue components.',
        whyAiMadeThis: 'Decouples HTTP fetch cycles from Vue presentation templates.',
        imports: ['defineStore', 'ref'],
        exports: ['useTelemetryStore'],
        components: [],
        states: [
          {
            name: 'metrics',
            setter: 'metrics.value = ...',
            initialValue: '{ rate: 4812, status: "healthy" }',
            purpose: 'Holds current telemetry readings.',
            modifiedBy: ['refreshData()']
          }
        ],
        props: [],
        hooks: [],
        apiCalls: [{ endpoint: '/api/stats', method: 'GET', triggeredBy: 'refreshData()', purpose: 'Fetches cluster metrics' }],
        renderedChildren: [],
        events: [],
        code: `import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTelemetryStore = defineStore('telemetry', () => {
  const metrics = ref({ rate: 4812, latencyMs: 24, status: 'healthy' });

  async function refreshData() {
    const res = await fetch('/api/stats');
    const data = await res.json();
    metrics.value = data;
  }

  return { metrics, refreshData };
});`
      },
      {
        id: 'vue-api-stats',
        path: 'server/api/stats.ts',
        name: 'stats.ts',
        type: 'api',
        lineCount: 32,
        stack: 'vue',
        previewType: 'api-schema',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Nuxt 3 Server Handler'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Server API Handler',
          description: 'Nuxt 3 Nitro server route responding with JSON telemetry statistics.',
          impactedFiles: ['useTelemetry.ts'],
          safeInvariants: ['Return JSON must contain rate and latencyMs keys']
        },
        description: 'Nitro server event handler computing real-time server cluster metrics.',
        whyAiMadeThis: 'Runs on serverless Nitro engine to access server infrastructure safely.',
        imports: ['defineEventHandler'],
        exports: ['default'],
        components: [],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `export default defineEventHandler((event) => {
  return {
    rate: Math.floor(4500 + Math.random() * 800),
    latencyMs: 22,
    status: 'healthy',
    timestamp: Date.now()
  };
});`
      }
    ],
    traces: [
      {
        id: 'trace-vue-poll',
        title: 'Vue 3 Reactive Poll Flow',
        triggerLabel: "User clicks 'Poll Now'",
        description: 'Demonstrates Vue template @click event, Pinia action execution, and reactive DOM patch.',
        steps: [
          {
            id: 'step-v1',
            stepNumber: 1,
            title: 'User fires @click in index.vue',
            description: 'Vue event listener triggers store.refreshData() action.',
            activeNodeId: 'vue-page-index',
            targetNodeId: 'vue-store-pinia',
            lineHighlight: 10,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'Vue Event Trigger',
              story: 'The visitor clicks Poll Now on the Vue 3 header.',
              humanCausality: 'Vue binds the @click directive to the Pinia action.'
            }
          },
          {
            id: 'step-v2',
            stepNumber: 2,
            title: 'Pinia dispatches GET to /api/stats',
            description: 'The store action queries the Nuxt Nitro server endpoint.',
            activeNodeId: 'vue-store-pinia',
            targetNodeId: 'vue-api-stats',
            lineHighlight: 8,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'Nitro Server Query',
              story: 'The Pinia store dispatches an asynchronous fetch to the backend server.',
              humanCausality: 'Server computes cluster telemetry and responds with fresh JSON.'
            }
          },
          {
            id: 'step-v3',
            stepNumber: 3,
            title: 'Pinia ref updates & MetricGauge re-renders',
            description: 'metrics.value mutates, automatically updating subscriber components via Vue reactivity.',
            activeNodeId: 'vue-store-pinia',
            targetNodeId: 'vue-comp-gauge',
            lineHighlight: 10,
            storybook: {
              chapterNumber: 3,
              chapterTitle: 'Reactive DOM Patch',
              story: 'The Vue reactive ref updates, and the metric gauge repaints automatically.',
              humanCausality: 'Vue 3 fine-grained reactivity patches only the changed number in the DOM.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'fastapi-agent',
    name: 'AgentCore Python AI Service',
    framework: 'Python 3.12 + FastAPI + Pydantic',
    tagline: 'Asynchronous Python microservice for AI agents, vector search, and tool execution',
    description: 'A pure Python backend service demonstrating FastAPI routes, Pydantic schemas, and vector retrieval without any frontend HTML.',
    files: [
      {
        id: 'py-main',
        path: 'main.py',
        name: 'main.py',
        type: 'api',
        lineCount: 52,
        stack: 'python',
        previewType: 'api-schema',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'FastAPI Gateway Application'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'FastAPI Application Root',
          description: 'Initializes the FastAPI application, mounts CORS middleware, and registers sub-routers.',
          impactedFiles: ['agent.py', 'schemas.py'],
          safeInvariants: ['Preserve app = FastAPI() instance', 'Keep include_router(agent_router)']
        },
        description: 'FastAPI application entrypoint exposing healthcheck and mounting agent workflows.',
        whyAiMadeThis: 'Serves as the ASGI HTTP server root for Uvicorn.',
        imports: ['FastAPI', 'CORSMiddleware', 'agent_router'],
        exports: ['app'],
        components: ['app'],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [{ endpoint: '/v1/agent/run', method: 'POST', triggeredBy: 'Client API call', purpose: 'Executes autonomous agent' }],
        renderedChildren: [],
        events: [],
        code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.agent import router as agent_router

app = FastAPI(title="AgentCore AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router, prefix="/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "agentcore"}`
      },
      {
        id: 'py-router-agent',
        path: 'routers/agent.py',
        name: 'agent.py',
        type: 'api',
        lineCount: 48,
        stack: 'python',
        previewType: 'api-schema',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Agent Router Controller'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Core Agent Execution Route',
          description: 'Handles POST /v1/agent/run, validates Pydantic request models, and coordinates retrieval.',
          impactedFiles: ['retriever.py', 'schemas.py'],
          safeInvariants: ['Maintain response_model=AgentResponse contract']
        },
        description: 'FastAPI APIRouter coordinating user queries, RAG document retrieval, and LLM inference.',
        whyAiMadeThis: 'Isolates AI routing logic from main server startup configuration.',
        imports: ['APIRouter', 'AgentQuery', 'AgentResponse', 'query_vector_store'],
        exports: ['router'],
        components: ['run_agent'],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `from fastapi import APIRouter, HTTPException
from models.schemas import AgentQuery, AgentResponse
from services.retriever import query_vector_store

router = APIRouter(tags=["Agents"])

@router.post("/agent/run", response_model=AgentResponse)
async def run_agent(query: AgentQuery):
    if not query.prompt:
        raise HTTPException(status_code=400, detail="Prompt required")

    docs = await query_vector_store(query.prompt, top_k=3)
    return AgentResponse(
        answer="Synthesized plan from retrieved knowledge",
        sources=docs,
        tokens_used=342
    )`
      },
      {
        id: 'py-service-retriever',
        path: 'services/retriever.py',
        name: 'retriever.py',
        type: 'hook',
        lineCount: 38,
        stack: 'python',
        previewType: 'python-service',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'ChromaDB Vector Retriever'
        },
        blastRadius: {
          score: 'moderate',
          riskLabel: 'Database Retrieval Engine',
          description: 'Performs semantic cosine similarity search against local embedding indices.',
          impactedFiles: ['agent.py'],
          safeInvariants: ['Must return list of string documents']
        },
        description: 'Vector store similarity engine retrieving relevant context chunks for the agent.',
        whyAiMadeThis: 'Isolates embedding calculations from web controllers.',
        imports: ['asyncio'],
        exports: ['query_vector_store'],
        components: ['query_vector_store'],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `import asyncio

async def query_vector_store(query: str, top_k: int = 3) -> list[str]:
    # Simulated vector cosine similarity search
    await asyncio.sleep(0.18)
    return [
        f"Doc chunk matching '{query[:16]}...'",
        "Architecture specification: Section 4",
        "API rate limit policies"
    ]`
      },
      {
        id: 'py-models-schemas',
        path: 'models/schemas.py',
        name: 'schemas.py',
        type: 'store',
        lineCount: 28,
        stack: 'python',
        previewType: 'api-schema',
        screenLocation: {
          xPercent: 0,
          yPercent: 0,
          widthPercent: 0,
          heightPercent: 0,
          zoneLabel: 'Pydantic Contract Definitions'
        },
        blastRadius: {
          score: 'high',
          riskLabel: 'Data Contract Models',
          description: 'Defines runtime type validation schemas for API inputs and outputs.',
          impactedFiles: ['agent.py'],
          safeInvariants: ['Keep AgentQuery.prompt and AgentResponse.answer fields']
        },
        description: 'Pydantic BaseModel declarations establishing OpenAPI documentation contracts.',
        whyAiMadeThis: 'Guarantees type-safety and JSON payload validation for API consumers.',
        imports: ['BaseModel', 'Field'],
        exports: ['AgentQuery', 'AgentResponse'],
        components: ['AgentQuery', 'AgentResponse'],
        states: [],
        props: [],
        hooks: [],
        apiCalls: [],
        renderedChildren: [],
        events: [],
        code: `from pydantic import BaseModel, Field

class AgentQuery(BaseModel):
    prompt: str = Field(..., description="User instruction for the agent")
    max_tokens: int = Field(1024, ge=1)

class AgentResponse(BaseModel):
    answer: str
    sources: list[str]
    tokens_used: int`
      }
    ],
    traces: [
      {
        id: 'trace-py-agent',
        title: 'Python Agent Query Execution',
        triggerLabel: "POST /v1/agent/run received",
        description: 'Follows an incoming JSON payload through Pydantic validation, vector retrieval, and output synthesis.',
        steps: [
          {
            id: 'step-p1',
            stepNumber: 1,
            title: 'FastAPI receives HTTP POST in main.py',
            description: 'Uvicorn ASGI server receives incoming request and routes to agent router.',
            activeNodeId: 'py-main',
            targetNodeId: 'py-router-agent',
            lineHighlight: 16,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'Request Ingestion',
              story: 'A client sends a query to the Python microservice gateway.',
              humanCausality: 'FastAPI matches the route and passes the payload to the agent router.'
            }
          },
          {
            id: 'step-p2',
            stepNumber: 2,
            title: 'Pydantic validates AgentQuery model',
            description: 'Schema validates prompt string and sets default token thresholds.',
            activeNodeId: 'py-router-agent',
            targetNodeId: 'py-models-schemas',
            lineHighlight: 9,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'Schema Validation',
              story: 'Pydantic inspects the request to make sure required keys exist.',
              humanCausality: 'Invalid JSON is rejected immediately with HTTP 422 before running expensive code.'
            }
          },
          {
            id: 'step-p3',
            stepNumber: 3,
            title: 'Vector Store executes semantic search',
            description: 'retriever.py executes cosine similarity across vector embeddings.',
            activeNodeId: 'py-router-agent',
            targetNodeId: 'py-service-retriever',
            lineHighlight: 13,
            storybook: {
              chapterNumber: 3,
              chapterTitle: 'Vector RAG Search',
              story: 'The service retrieves the top 3 most relevant documentation chunks.',
              humanCausality: 'The agent grounds its answer in real context rather than hallucinating.'
            }
          },
          {
            id: 'step-p4',
            stepNumber: 4,
            title: 'Synthesizes AgentResponse output',
            description: 'FastAPI serializes the response model to JSON and returns 200 OK.',
            activeNodeId: 'py-router-agent',
            targetNodeId: 'py-main',
            lineHighlight: 14,
            storybook: {
              chapterNumber: 4,
              chapterTitle: 'JSON Response Delivery',
              story: 'The service packages the answer and token counts and sends it back to the client.',
              humanCausality: 'The HTTP connection completes with 200 OK.'
            }
          }
        ]
      }
    ]
  }
];
