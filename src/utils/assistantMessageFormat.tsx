import React, { Fragment } from 'react';

const MAX_LINE_LENGTH = 2000;

/**
 * Renders assistant chat text with basic formatting (lists, bold) without extra deps.
 * Keeps output safe (no raw HTML from user).
 */
export function formatAssistantContent(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1 my-1">
        {listBuffer.map((item, i) => (
          <li key={i}>{formatInline(item.slice(0, MAX_LINE_LENGTH))}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const formatInline = (line: string): React.ReactNode => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isBullet =
      trimmed.startsWith('- ') ||
      trimmed.startsWith('• ') ||
      trimmed.startsWith('* ');

    if (isBullet && trimmed.length > 2) {
      listBuffer.push(trimmed.replace(/^[-•*]\s+/, ''));
    } else {
      flushList();
      if (trimmed === '') {
        out.push(<br key={`br-${out.length}`} />);
      } else {
        out.push(
          <p key={`p-${out.length}`} className="mb-2 last:mb-0">
            {formatInline(trimmed.slice(0, MAX_LINE_LENGTH))}
          </p>
        );
      }
    }
  }
  flushList();

  return <>{out}</>;
}
