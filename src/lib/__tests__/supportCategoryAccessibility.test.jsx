import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, variant, size, ...props }) => asChild
    ? React.createElement(React.Fragment, null, children)
    : React.createElement('button', { ...props }, children),
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => React.createElement('section', null, children),
  CardContent: ({ children }) => React.createElement('div', null, children),
  CardHeader: ({ children }) => React.createElement('div', null, children),
  CardTitle: ({ children }) => React.createElement('h2', null, children),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props) => React.createElement('input', props),
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props) => React.createElement('textarea', props),
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => React.createElement('label', props, children),
}));
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke: vi.fn() } } }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/layout/PublicFooter', () => ({
  default: () => React.createElement('footer', null, 'Footer'),
}));

import Support from '../../pages/Support.jsx';

describe('public support request category accessibility', () => {
  const html = renderToStaticMarkup(React.createElement(Support));
  it('provides a named category group and one pressed default selection', () => {
    expect(html).toMatch(/role="group"[^>]*aria-label="Support request category"/);
    const buttons = [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>(.*?)<\\/button>/g)];
    expect(buttons).toHaveLength(5);
    expect(buttons.filter(([, pressed]) => pressed === 'true')).toHaveLength(1);
    expect(buttons.find(([, pressed]) => pressed === 'true')?.[2]).toBe('Bug report');
  });
  it('keeps every category available as a real non-submit button', () => {
    for (const label of ['Bug report', 'Billing', 'Account / data', 'Feature idea', 'Other']) {
      expect(html).toContain(label);
    }
    expect((html.match(/type="button"[^>]*aria-pressed=/g) || [])).toHaveLength(5);
    expect(html).toContain('type="submit"');
  });
});
