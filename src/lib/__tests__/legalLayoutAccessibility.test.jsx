import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('@/components/layout/PublicFooter', () => ({
  default: () => React.createElement('footer', null, 'Footer'),
}));

import LegalLayout from '../../components/layout/LegalLayout.jsx';

describe('public legal page keyboard navigation', () => {
  it('provides a keyboard-revealed skip link to the focusable main landmark', () => {
    const html = renderToStaticMarkup(
      React.createElement(LegalLayout, { title: 'Privacy', updated: 'Test date' },
        React.createElement('p', null, 'Legal content')),
    );
    expect(html).toMatch(/<a[^>]+href="#legal-content"[^>]*>Skip to legal content<\/a>/);
    expect(html).toMatch(/<main[^>]+id="legal-content"[^>]+tabindex="-1"/);
    expect(html).toContain('focus:not-sr-only');
    expect(html).toContain('Legal content');
    expect(html).toContain('Last updated: Test date');
  });

  it('preserves legal headings and content when the update date is absent', () => {
    const html = renderToStaticMarkup(
      React.createElement(LegalLayout, { title: 'Terms' },
        React.createElement('p', null, 'Terms body')),
    );
    expect(html).toContain('<h1');
    expect(html).toContain('Terms</h1>');
    expect(html).toContain('Terms body');
    expect(html).not.toContain('Last updated:');
  });
});
