import type { StackType } from '../types/ast';

export function detectStack(path: string, code: string): {
  stack: StackType;
  frameworkName: string;
  isBackend: boolean;
} {
  const lowerPath = path.toLowerCase();

  // Vue 3 / Nuxt 3
  if (lowerPath.endsWith('.vue') || code.includes('<template>') || code.includes('<script setup') || code.includes('defineStore(')) {
    return { stack: 'vue', frameworkName: 'Vue 3 / Nuxt', isBackend: false };
  }

  // Svelte 5 / SvelteKit
  if (lowerPath.endsWith('.svelte') || code.includes('$state(') || code.includes('+page.svelte')) {
    return { stack: 'svelte', frameworkName: 'Svelte 5 / SvelteKit', isBackend: false };
  }

  // Python / FastAPI / Django / Flask
  if (lowerPath.endsWith('.py') || code.includes('def ') && (code.includes('import ') || code.includes('from '))) {
    const isFastAPI = code.includes('FastAPI') || code.includes('@app.') || code.includes('@router.');
    const isDjango = code.includes('models.Model') || code.includes('django.');
    return {
      stack: 'python',
      frameworkName: isFastAPI ? 'Python (FastAPI)' : isDjango ? 'Python (Django)' : 'Python Backend',
      isBackend: true,
    };
  }

  // Go / Gin
  if (lowerPath.endsWith('.go') || code.includes('package ') && code.includes('func ')) {
    const isGin = code.includes('gin.Context') || code.includes('gin.Default');
    return {
      stack: 'go',
      frameworkName: isGin ? 'Go (Gin Engine)' : 'Go Backend',
      isBackend: true,
    };
  }

  // HTML5 / Vanilla / HTMX
  if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
    const isHtmx = code.includes('hx-get') || code.includes('hx-post');
    return {
      stack: 'html',
      frameworkName: isHtmx ? 'HTML5 + HTMX' : 'Static HTML5',
      isBackend: false,
    };
  }

  // React / Next.js
  if (
    lowerPath.endsWith('.tsx') ||
    lowerPath.endsWith('.jsx') ||
    code.includes('useState(') ||
    code.includes('import React') ||
    code.includes('from "react"') ||
    code.includes("from 'react'")
  ) {
    return { stack: 'react', frameworkName: 'React / Next.js', isBackend: false };
  }

  // Generic / Unfamiliar
  return { stack: 'generic', frameworkName: 'Polyglot Module', isBackend: false };
}
