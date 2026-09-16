import React from 'react';

// Regex to capture URL tokens in plain text
// Matches URLs with http://, https://, www., common web TLDs (including me, be, cc, ly, ai, etc.), or any domain with a path
const URL_SPLIT_REGEX = /((?:https?:\/\/|www\.)[^\s<>"'`]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|edu|gov|mil|io|me|in|co|app|dev|xyz|info|link|site|online|live|tech|club|store|blog|tv|be|cc|gg|ly|gl|ai|pro|top|is|uk|us|ca|de|jp|ru|fr|au|nl|it|es|ch|se|no|br|za|media|space|cloud|work|guru|design|news|agency|world|digital)(?:\/[^\s<>"'`]*)?|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\/[^\s<>"'`]*)/gi;

interface FormattedTextWithLinksProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
}

/**
 * Strips common sentence-ending punctuation from a raw URL candidate
 * while preserving balanced parentheses (e.g. Wikipedia links) and query parameters.
 */
function cleanUrlAndTrailingPunct(raw: string): { url: string; trailing: string } {
  let url = raw;
  let trailing = '';

  while (url.length > 0) {
    const lastChar = url[url.length - 1];
    if (['.', ',', '!', '?', ':', ';', '"', "'", '”', '’'].includes(lastChar)) {
      trailing = lastChar + trailing;
      url = url.slice(0, -1);
      continue;
    }

    if (lastChar === ')') {
      const openCount = (url.match(/\(/g) || []).length;
      const closeCount = (url.match(/\)/g) || []).length;
      if (closeCount > openCount) {
        trailing = lastChar + trailing;
        url = url.slice(0, -1);
        continue;
      }
    }

    if (lastChar === ']') {
      const openCount = (url.match(/\[/g) || []).length;
      const closeCount = (url.match(/\]/g) || []).length;
      if (closeCount > openCount) {
        trailing = lastChar + trailing;
        url = url.slice(0, -1);
        continue;
      }
    }

    break;
  }

  return { url, trailing };
}

/**
 * Validates and normalizes URL to prevent XSS (no javascript:, data:, vbscript: etc.)
 * Strictly allows only http: and https: protocols.
 */
function getSafeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    // Already has standard http/https protocol
  } else if (/^(www\.|[a-zA-Z0-9])/i.test(candidate)) {
    candidate = `https://${candidate}`;
  } else {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    // Explicit security check: allow ONLY http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Reusable component to safely render admin-provided text:
 * - Automatically detects URLs (http, https, t.me, youtube, github, query params, hashes, etc.)
 * - Renders them as clickable <a> tags opening safely in new tabs (target="_blank", rel="noopener noreferrer")
 * - Does NOT use dangerouslySetInnerHTML (100% safe against XSS)
 * - Preserves line breaks, spaces, emojis, and normal text
 * - Does not truncate or alter the displayed URL
 */
export const FormattedTextWithLinks: React.FC<FormattedTextWithLinksProps> = ({
  text,
  className,
  linkClassName,
}) => {
  if (!text) return null;

  const parts = text.split(URL_SPLIT_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Check if this part matches a URL pattern
        if (part.match(/^(https?:\/\/|www\.|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)) {
          const { url, trailing } = cleanUrlAndTrailingPunct(part);
          const safeHref = getSafeHref(url);

          if (safeHref) {
            return (
              <React.Fragment key={index}>
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={
                    linkClassName ||
                    'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2 break-all font-medium transition-colors'
                  }
                >
                  {url}
                </a>
                {trailing}
              </React.Fragment>
            );
          }
        }

        // Normal text segment: preserve emojis, formatting, line breaks
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
