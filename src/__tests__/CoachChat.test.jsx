import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { agents } = vi.hoisted(() => ({ agents: {
  listConversations: vi.fn(), getConversation: vi.fn(), createConversation: vi.fn(),
  addMessage: vi.fn(), subscribeToConversation: vi.fn(),
} }));
vi.mock('@/api/base44Client', () => ({ base44: { agents } }));
vi.mock('@/hooks/useCoachMessageLimit', () => ({ useCoachMessageLimit: () => ({ usedThisWeek: 0, limitReached: false, isPro: true }) }));
vi.mock('@/hooks/useKeyboardInset', () => ({ default: () => 0 }));
vi.mock('@/components/coach/MessageBubble', () => ({ default: ({ message }) => <p>{message.content}</p> }));
import CoachChat from '@/pages/CoachChat';
const conversation = { id: 'synthetic-conversation', metadata: { name: 'Coach Chat' }, messages: [{ role: 'assistant', content: 'Your saved coaching conversation' }] };
const mount = () => render(<MemoryRouter><CoachChat /></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  agents.listConversations.mockResolvedValue([conversation]);
  agents.getConversation.mockResolvedValue(conversation);
  agents.subscribeToConversation.mockReturnValue(vi.fn());
  agents.addMessage.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

it.each(['list', 'get'])('offers a usable retry after %s failure without creating a replacement conversation', async stage => {
  if (stage === 'list') agents.listConversations.mockRejectedValueOnce(new Error('offline'));
  else agents.getConversation.mockRejectedValueOnce(new Error('offline'));
  mount();
  const retry = await screen.findByRole('button', { name: 'Retry coach conversation' });
  expect(screen.getByRole('link', { name: 'Back to dashboard' }).getAttribute('href')).toBe('/app');
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(retry);
  await screen.findByText('Your saved coaching conversation');
  expect(agents.createConversation).not.toHaveBeenCalled();
});

it('preserves a failed message, restores focus and supports explicit retry', async () => {
  agents.addMessage.mockRejectedValueOnce(new Error('synthetic transport error'));
  mount();
  const input = await screen.findByRole('textbox', { name: 'Message your coach' });
  fireEvent.change(input, { target: { value: 'How should I adjust my easy run?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await screen.findByRole('alert');
  expect(input.value).toBe('How should I adjust my easy run?');
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(input.getAttribute('aria-describedby')).toBe('coach-send-error');
  expect(screen.queryByText('Coach is thinking…')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(input.value).toBe(''));
  expect(agents.addMessage).toHaveBeenCalledTimes(2);
  expect(agents.addMessage.mock.calls[1][1].content).toBe('How should I adjust my easy run?');
});

it('retains the draft until acknowledged and prevents overlapping submissions', async () => {
  let acknowledge;
  agents.addMessage.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  mount();
  const input = await screen.findByRole('textbox', { name: 'Message your coach' });
  fireEvent.change(input, { target: { value: 'Synthetic draft' } });
  const form = input.closest('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(agents.addMessage).toHaveBeenCalledTimes(1);
  expect(input.value).toBe('Synthetic draft');
  expect(screen.getByRole('button', { name: 'Sending message' }).disabled).toBe(true);
  acknowledge({});
  await waitFor(() => expect(input.value).toBe(''));
});
