import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders a consistent themed empty state and the supplied action', () => {
    const onClick = vi.fn();
    const markup = renderToStaticMarkup(createElement(EmptyState, {
      title: 'No transactions yet',
      description: 'Your transactions will appear here.',
      action: { label: 'Go to dashboard', onClick },
    }));

    expect(markup).toContain('No transactions yet');
    expect(markup).toContain('Your transactions will appear here.');
    expect(markup).toContain('Go to dashboard');
    expect(markup).toContain('dark:bg-gray-800');
  });

  it('omits action controls when no actions are supplied', () => {
    const markup = renderToStaticMarkup(createElement(EmptyState, {
      title: 'No contacts',
      description: 'Add a contact to get started.',
    }));

    expect(markup).not.toContain('<button');
    expect(markup).toContain('Add a contact to get started.');
  });
});
