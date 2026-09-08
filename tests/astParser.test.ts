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

  it('extracts function-level IR: symbols, line ranges, params and call graph', () => {
    const jsCode = `function handleNoteOn(noteName) {
  playNoteSound(noteName);
  setKeyVisualState(noteName, true);
}
function playNoteSound(noteName) {
  initAudioContext();
}`;
    const parsed = parseSourceCode('static/app.js', jsCode);

    expect(parsed.functions).toBeDefined();
    expect(parsed.functions!.length).toBe(2);
    const on = parsed.functions!.find((f) => f.name === 'handleNoteOn')!;
    expect(on.startLine).toBe(1);
    expect(on.endLine).toBe(4);
    expect(on.params).toEqual(['noteName']);
    expect(on.calls.map((c) => c.baseName)).toContain('playNoteSound');
    expect(on.calls.map((c) => c.baseName)).toContain('setKeyVisualState');
    const sound = parsed.functions!.find((f) => f.name === 'playNoteSound')!;
    expect(sound.calledBy).toContain('handleNoteOn');
    // Deterministic ids, never random
    expect(on.id).toBe(`${parsed.id}::handleNoteOn`);
  });

  it('extracts DOM event bindings with handlers and lines', () => {
    const jsCode = `const btn = document.getElementById("go");
btn.addEventListener("click", handleNoteOn);`;
    const parsed = parseSourceCode('static/app.js', jsCode);
    expect(parsed.codeEvents).toBeDefined();
    expect(parsed.codeEvents!.some((e) => e.name === 'click' && e.handler === 'handleNoteOn' && e.line === 2)).toBe(true);
  });

  it('falls back to the generic adapter on unknown languages with low confidence', () => {
    const parsed = parseSourceCode('main.rs', 'fn greet(name: &str) {\n  println!("{}", name);\n}');
    expect(parsed.symbolConfidence).toBe('low');
    expect(parsed.functions!.some((f) => f.name === 'greet')).toBe(true);
  });

  it('extracts Go functions with receivers, params and mux route events', () => {
    const goCode = `package auth
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
  user, err := h.service.Authenticate(email, password)
}`;
    const parsed = parseSourceCode('internal/auth/handler.go', goCode);
    const login = parsed.functions!.find((f) => f.name === 'Login')!;
    expect(login.kind).toBe('method');
    expect(login.calls.map((c) => c.baseName)).toContain('Authenticate');
    expect(login.params).not.toContain('h');
  });

  it('extracts Python functions with decorators as route events', () => {
    const pyCode = `from fastapi import APIRouter
@router.post("/v1/agent/run")
async def run_agent(query: str):
    return {"status": "ok"}`;
    const parsed = parseSourceCode('routers/agent.py', pyCode);
    const fn = parsed.functions!.find((f) => f.name === 'run_agent')!;
    expect(fn.params).toEqual(['query']);
    expect(parsed.codeEvents!.some((e) => e.name === '/v1/agent/run' && e.handler === 'run_agent')).toBe(true);
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

  it('assigns unique file ids to deep paths sharing a long prefix', () => {
    const a = parseSourceCode('template/code/typescript-default/src/components/icons/IconA.vue', '<template><div/></template>');
    const b = parseSourceCode('template/code/typescript-default/src/components/icons/IconB.vue', '<template><div/></template>');
    const c = parseSourceCode('template/code/typescript-default/src/components/icons/IconC.vue', '<template><div/></template>');
    const ids = new Set([a.id, b.id, c.id]);
    expect(ids.size).toBe(3);
  });

  it('extracts const function expressions', () => {
    const code = `const named = function (a, b) { return a + b; }
export const run = async function (id) { return named(id, 1); }`;
    const parsed = parseSourceCode('lib/util.js', code);
    const named = parsed.functions!.find((f) => f.name === 'named')!;
    const run = parsed.functions!.find((f) => f.name === 'run')!;
    expect(named.params).toEqual(['a', 'b']);
    expect(run.calls.map((c) => c.baseName)).toContain('named');
  });

  it('bounds single-expression arrow bodies to the def line', () => {
    const code = `import x from './x'
const openReadmeInEditor = () => fetch('/__open-in-editor?file=README')
export default function main() { openReadmeInEditor(); }`;
    const parsed = parseSourceCode('lib/open.js', code);
    const fn = parsed.functions!.find((f) => f.name === 'openReadmeInEditor')!;
    expect(fn.startLine).toBe(2);
    expect(fn.endLine).toBe(2);
    expect(fn.calls.map((c) => c.baseName)).toContain('fetch');
  });

  it('parses unsupported languages via the generic fallback without crashing', () => {
    const rb = parseSourceCode('app/controllers/users_controller.rb', 'class UsersController < ApplicationController\n  def index\n    @users = User.all\n  end\nend\n');
    const rs = parseSourceCode('src/main.rs', 'fn main() {\n    println!("hi");\n}\n');
    expect(rb.symbolConfidence).toBe('low');
    expect(rs.symbolConfidence).toBe('low');
    expect(rs.functions!.some((f) => f.name === 'main')).toBe(true);
  });
});
