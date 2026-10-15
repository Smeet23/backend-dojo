"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** AI replies, styled like lesson prose (raw HTML in the text is not rendered). */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div
      className={`lesson prose prose-sm prose-neutral max-w-none break-words prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-pre:overflow-x-auto prose-headings:mb-2 prose-headings:mt-4 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
