import { describe, it, expect } from 'bun:test';
import { synthesizeUserJourneys } from '../src/utils/storySynthesizer';
import { parseSourceCode } from '../src/utils/astParser';

describe('storySynthesizer - Authentic Human Journeys', () => {
  it('generates real causality chapters instead of robotic filler', () => {
    const files = [
      parseSourceCode('web/templates/auth/register.html', '<form action="/register"></form>'),
      parseSourceCode('internal/auth/handler.go', 'func HandleRegister() {}'),
      parseSourceCode('internal/auth/service.go', 'func Register() {}'),
      parseSourceCode('internal/auth/repository.go', 'func InsertUser() {}'),
      parseSourceCode('internal/shared/middleware/auth.go', 'func GuestOnly() {}'),
    ];

    const traces = synthesizeUserJourneys(files);
    expect(traces.length).toBeGreaterThanOrEqual(1);

    const regTrace = traces.find((t) => t.id === 'trace-auth-register');
    expect(regTrace).toBeDefined();
    expect(regTrace?.steps.length).toBeGreaterThanOrEqual(4);

    // Verify stories contain human causality and real chapters
    regTrace?.steps.forEach((step) => {
      expect(step.storybook).toBeDefined();
      expect(step.storybook?.chapterTitle).not.toContain('Stage');
      expect(step.storybook?.story).not.toContain('Application executes');
      expect(step.storybook?.humanCausality.length).toBeGreaterThan(10);
    });
  });
});
