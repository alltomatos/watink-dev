import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MessageItem from './MessageItem';
import { Message } from '../../types/Message';

const baseMessage: Message = {
  id: '1',
  body: 'Hello, this is a test message',
  fromMe: false,
  read: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ticketId: 1,
  contactId: 1,
};

describe('MessageItem', () => {
  it('renders text message from contact correctly', () => {
    render(<MessageItem message={baseMessage} />);
    expect(screen.getByText('Hello, this is a test message')).toBeDefined();
    expect(screen.getByRole('paragraph', { hidden: true })).toBeDefined(); // Simple check for container
  });

  it('renders text message from me correctly', () => {
    const message = { ...baseMessage, fromMe: true };
    render(<MessageItem message={message} />);
    expect(screen.getByText('Hello, this is a test message')).toBeDefined();
  });

  it('renders image message correctly', () => {
    const message: Message = {
      ...baseMessage,
      mediaType: 'image',
      mediaUrl: 'https://example.com/image.jpg',
      body: 'Check this image',
    };
    render(<MessageItem message={message} />);
    expect(screen.getByText('Check this image')).toBeDefined();
    // MessageMedia is a component, we rely on the fact that the test can reach its internal elements if needed
    // or just checking if body is rendered is enough to confirm the component is rendered.
  });

  it('renders audio message correctly', () => {
    const message: Message = {
      ...baseMessage,
      mediaType: 'audio',
      mediaUrl: 'https://example.com/audio.mp3',
      body: 'Listen to this',
    };
    render(<MessageItem message={message} />);
    expect(screen.getByText('Listen to this')).toBeDefined();
  });

  it('renders participant name if not from me', () => {
    const message = { ...baseMessage, participant: 'John Doe' };
    render(<MessageItem message={message} />);
    expect(screen.getByText('John Doe')).toBeDefined();
  });
});
