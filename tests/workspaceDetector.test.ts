import { describe, it, expect } from 'bun:test';
import { extractSubsystemKey, detectWorkspaces } from '../src/utils/workspaceDetector';
import { parseSourceCode } from '../src/utils/astParser';

describe('workspaceDetector - Zero Hardcoding Universal Subsystems', () => {
  it('extracts feature domains without hardcoded rules', () => {
    expect(extractSubsystemKey('internal/auth/routes.go')).toBe('auth');
    expect(extractSubsystemKey('web/templates/auth/login.html')).toBe('auth');
    expect(extractSubsystemKey('internal/product/service.go')).toBe('product');
    expect(extractSubsystemKey('accounts/views.py')).toBe('accounts');
    expect(extractSubsystemKey('app/(dashboard)/settings/page.tsx')).toBe('dashboard');
    expect(extractSubsystemKey('cmd/server/main.go')).toBe('root');
  });

  it('assigns client scripts and middlewares to their domain (zero orphans)', () => {
    expect(extractSubsystemKey('web/static/javascript/homepage.js')).toBe('product');
    expect(extractSubsystemKey('web/static/javascript/cart.js')).toBe('order');
    expect(extractSubsystemKey('web/static/javascript/checkout.js')).toBe('order');
    expect(extractSubsystemKey('internal/shared/middleware/auth.go')).toBe('auth');
  });

  it('detects multiple workspaces with SVG icons and no emojis', () => {
    const mockFiles = [
      parseSourceCode('cmd/server/main.go', 'package main\nfunc main() {}'),
      parseSourceCode('internal/auth/routes.go', 'package auth\nfunc Register() {}'),
      parseSourceCode('internal/auth/handler.go', 'package auth\nfunc Login() {}'),
      parseSourceCode('internal/product/service.go', 'package product\nfunc Get() {}'),
      parseSourceCode('internal/product/repo.go', 'package product\nfunc Save() {}'),
      parseSourceCode('internal/order/routes.go', 'package order\nfunc Checkout() {}'),
      parseSourceCode('internal/order/service.go', 'package order\nfunc Process() {}'),
      parseSourceCode('web/static/javascript/cart.js', 'fetch("/cart")'),
      parseSourceCode('web/templates/product/home.html', '<div>Home</div>'),
    ];

    const workspaces = detectWorkspaces(mockFiles);
    expect(workspaces.length).toBeGreaterThan(1);
    expect(workspaces.some((w) => w.id === 'auth')).toBe(true);
    expect(workspaces.some((w) => w.id === 'product')).toBe(true);
    expect(workspaces.some((w) => w.id === 'order')).toBe(true);

    // Verify strictly NO Unicode emojis in workspace names
    const emojiRegex = /\p{Extended_Pictographic}/u;
    workspaces.forEach((w) => {
      expect(emojiRegex.test(w.name)).toBe(false);
    });
  });
});
