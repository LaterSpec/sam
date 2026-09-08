"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseSamyChart, safeMarkdownHref } from "@/lib/samy/parse";
import { SamyChart } from "./samy-chart";

const components: Components = {
  table: ({ children }) => (
    <div className="samy-table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }) => {
    const safe = safeMarkdownHref(href);
    if (!safe) return <span>{children}</span>;
    return (
      <a href={safe} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  code: ({ className, children, ...props }) => {
    const lang = /language-(\S+)/.exec(className ?? "")?.[1];
    const text = String(children).replace(/\n$/, "");
    if (lang === "sam-chart") {
      const spec = parseSamyChart(text);
      return spec ? <SamyChart spec={spec} /> : <pre className="samy-pre">{text}</pre>;
    }
    const inline = !className && !String(children).includes("\n");
    if (inline) return <code {...props}>{children}</code>;
    return <pre className="samy-pre"><code className={className}>{children}</code></pre>;
  },
  pre: ({ children }) => <>{children}</>,
};

export function SamyMarkdown({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="samy-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
