import fs from "node:fs/promises";
import path from "node:path";

export const DEVELOPER_DOCS = [
  {
    slug: "overview",
    title: "Overview",
    file: "docs/integrations/OVERVIEW.md",
    summary: "Hybrid marketplace model, trust and review.",
  },
  {
    slug: "manifest",
    title: "Manifest",
    file: "docs/integrations/MANIFEST.md",
    summary: "JSON schema, scopes, auth types and versioning.",
  },
  {
    slug: "author-guide",
    title: "Author guide",
    file: "docs/integrations/AUTHOR-GUIDE.md",
    summary: "How to submit an integration and what review checks.",
  },
  {
    slug: "runtime",
    title: "Runtime",
    file: "docs/integrations/RUNTIME.md",
    summary: "Install, connect, webhooks, sync and secrets.",
  },
  {
    slug: "phase-2-workers",
    title: "Phase 2 Workers",
    file: "docs/integrations/PHASE-2-WORKERS.md",
    summary: "Workers for Platforms roadmap for sandboxed authors.",
  },
] as const;

export type DeveloperDocSlug = (typeof DEVELOPER_DOCS)[number]["slug"];

export function isDeveloperDocSlug(value: string): value is DeveloperDocSlug {
  return DEVELOPER_DOCS.some((doc) => doc.slug === value);
}

export async function readDeveloperDoc(slug: DeveloperDocSlug): Promise<string> {
  const entry = DEVELOPER_DOCS.find((doc) => doc.slug === slug);
  if (!entry) throw new Error("unknown doc");
  const fullPath = path.join(process.cwd(), entry.file);
  return fs.readFile(fullPath, "utf8");
}

/** Minimal markdown → HTML for docs pages (headings, code, lists, paragraphs, links). */
export function renderDocsMarkdown(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withCode = escaped.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, lang: string, body: string) => {
    return `<pre class="dev-code" data-lang="${lang}"><code>${body.trimEnd()}</code></pre>`;
  });

  const withInline = withCode
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const lines = withInline.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("<pre")) {
      closeList();
      html.push(line);
      continue;
    }
    if (/^### /.test(line)) {
      closeList();
      html.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (/^## /.test(line)) {
      closeList();
      html.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (/^# /.test(line)) {
      closeList();
      html.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }
    if (/^\| /.test(line)) {
      closeList();
      html.push(`<pre class="dev-table">${line}</pre>`);
      continue;
    }
    if (/^- /.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${line.slice(2)}</li>`);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p>${line}</p>`);
  }
  closeList();
  return html.join("\n");
}
