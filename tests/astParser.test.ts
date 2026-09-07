import { describe, it, expect } from 'bun:test';
import { parseSourceCode } from '../src/utils/astParser';

describe('astParser - Universal Polyglot Semantic Engine', () => {
  it('extracts Go 1.22 ServeMux routes and middleware guards', () => {
    const goCode = `
package auth
import "net/http"
func RegisterRoutes(mux *http.ServeMux) {
  mux.Handle("GET /profile", middleware.RequireAuth(h.ShowProfile))
  mux.HandleFunc("POST /register", limiter.Limit(h.HandleRegister))
}
`;
    const parsed = parseSourceCode('internal/auth/routes.go', goCode);

    expect(parsed.stack).toBe('go');
    expect(parsed.pipelineRole).toBe('controller');
    expect(parsed.apiCalls.length).toBeGreaterThanOrEqual(2);
    expect(parsed.apiCalls.some((a) => a.endpoint === '/profile' && a.method === 'GET')).toBe(true);
    expect(parsed.apiCalls.some((a) => a.endpoint === '/register' && a.method === 'POST')).toBe(true);
    expect(parsed.guards).toContain('middleware.RequireAuth');
  });

  it('extracts Go HTML template partials and client script bindings', () => {
    const htmlCode = `
{{define "content"}}
<section class="home">
  {{template "product_card" .}}
  {{template "navbar" .}}
  <script src="/static/javascript/homepage.js"></script>
</section>
{{end}}
`;
    const parsed = parseSourceCode('web/templates/product/home.html', htmlCode);

    expect(parsed.pipelineRole).toBe('view');
    expect(parsed.renderedChildren).toContain('product_card');
    expect(parsed.renderedChildren).toContain('navbar');
    expect(parsed.scriptBindings).toContain('homepage.js');
    expect(parsed.flowExplanation?.inbound).toBeDefined();
    expect(parsed.flowExplanation?.outbound).toContain('homepage.js');
  });

  it('extracts client-side fetch calls in JavaScript scripts', () => {
    const jsCode = `
function addToCart(productId) {
  fetch('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId })
  });
}
`;
    const parsed = parseSourceCode('web/static/javascript/cart.js', jsCode);

    expect(parsed.pipelineRole).toBe('script');
    expect(parsed.apiCalls.some((a) => a.endpoint === '/cart/items' && a.method === 'POST')).toBe(true);
    expect(parsed.flowExplanation?.outbound).toContain('/cart/items');
  });

  it('extracts Python FastAPI routes and services', () => {
    const pyCode = `
from fastapi import APIRouter
router = APIRouter()
@router.post("/v1/agent/run")
async def run_agent(query: str):
    return {"status": "ok"}
`;
    const parsed = parseSourceCode('routers/agent.py', pyCode);

    expect(parsed.stack).toBe('python');
    expect(parsed.pipelineRole).toBe('controller');
    expect(parsed.apiCalls.some((a) => a.endpoint === '/v1/agent/run' && a.method === 'POST')).toBe(true);
  });
});
