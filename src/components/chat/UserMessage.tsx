'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/types';
import { Copy, Check, Edit2, Check as CheckIcon, X } from 'lucide-react';
import HighlightedText from '@/components/chat/HighlightedText';
import { findMatches } from '@/hooks/useChatSearch';

interface UserMessageProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  /** Current search query string. Empty string disables highlighting. */
  searchQuery?: string;
  /** 0-based global index of the currently active match. -1 for none. */
  searchActiveIndex?: number;
  /**
   * The global match index of the first match that falls inside this message.
   * Used to compute the correct per-segment active index.
   */
  searchMatchOffset?: number;
}

export default function UserMessage({
  message,
  onCopy,
  onEdit,
  searchQuery = '',
  searchActiveIndex = -1,
  searchMatchOffset = 0,
}: UserMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(
    typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
  );

  const handleCopy = async () => {
    const content =
      typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (onCopy) onCopy(content);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    );
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Track a running offset so each text node in the markdown gets the right
  // global match index. We accumulate it across node renders using a ref-like
  // mutable object that is re-created on each component render (but stable
  // within the single ReactMarkdown render pass).
  const offsetTracker = useMemo(() => ({ current: searchMatchOffset }), [searchMatchOffset]);

  /**
   * Wrap a child string (text node inside a ReactMarkdown component) with
   * HighlightedText, advancing the running offset by the number of matches.
   */
  const wrapChildren = (children: React.ReactNode): React.ReactNode => {
    if (!searchQuery) return children;
    if (typeof children === 'string') {
      const matchCount = findMatches(children, searchQuery).length;
      const offset = offsetTracker.current;
      offsetTracker.current += matchCount;
      return (
        <HighlightedText
          text={children}
          query={searchQuery}
          activeIndex={searchActiveIndex}
          matchOffset={offset}
        />
      );
    }
    // React.Children are already nodes – pass through.
    return children;
  };

  const markdownContent =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content, null, 2);

  return (
    <div className="max-w-3xl bg-[#7C3AED] text-white rounded-2xl px-6 py-4 group relative">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white placeholder:text-gray-300 focus:outline-none resize-none"
            rows={Math.max(1, editContent.split('\n').length)}
            autoFocus
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
              title="Save changes"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="prose prose-invert prose-lg max-w-none leading-relaxed pr-12">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children, ...props }: any) => (
                  <p className="mb-2 last:mb-0" {...props}>{wrapChildren(children)}</p>
                ),
                strong: ({ children, ...props }: any) => (
                  <strong className="font-semibold text-white" {...props}>{wrapChildren(children)}</strong>
                ),
                em: ({ children, ...props }: any) => (
                  <em className="italic text-gray-200" {...props}>{wrapChildren(children)}</em>
                ),
                code: ({ children, ...props }: any) => (
                  <code className="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-sm" {...props}>
                    {wrapChildren(children)}
                  </code>
                ),
                pre: ({ children, ...props }: any) => (
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2" {...props}>{children}</pre>
                ),
                ul: ({ children, ...props }: any) => (
                  <ul className="list-disc list-inside mb-2 space-y-1" {...props}>{children}</ul>
                ),
                ol: ({ children, ...props }: any) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>{children}</ol>
                ),
                li: ({ children, ...props }: any) => (
                  <li className="text-gray-200" {...props}>{wrapChildren(children)}</li>
                ),
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-300 hover:text-white transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleEdit}
              className="p-1 text-gray-300 hover:text-white transition-colors"
              title="Edit message"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
