import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DEVELOPER_DOCS,
  isDeveloperDocSlug,
  readDeveloperDoc,
  renderDocsMarkdown,
} from "@/lib/docs/developer-docs";
import "../developers.css";

export function generateStaticParams() {
  return DEVELOPER_DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DEVELOPER_DOCS.find((item) => item.slug === slug);
  return {
    title: doc ? `${doc.title} · SAM for Developers` : "SAM for Developers",
    description: doc?.summary,
  };
}

export default async function DeveloperDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isDeveloperDocSlug(slug)) notFound();
  const doc = DEVELOPER_DOCS.find((item) => item.slug === slug)!;
  const markdown = await readDeveloperDoc(slug);
  const html = renderDocsMarkdown(markdown);

  return (
    <div className="dev-shell">
      <header className="dev-top">
        <Link href="/developers" className="dev-brand">
          <span>S</span>
          <strong>SAM for Developers</strong>
        </Link>
        <nav>
          {DEVELOPER_DOCS.map((item) => (
            <Link key={item.slug} href={`/developers/${item.slug}`} className={item.slug === slug ? "is-active" : ""}>
              {item.title}
            </Link>
          ))}
        </nav>
      </header>
      <div className="dev-layout">
        <aside className="dev-side">
          <p>Guides</p>
          <ul>
            {DEVELOPER_DOCS.map((item) => (
              <li key={item.slug}>
                <Link href={`/developers/${item.slug}`} className={item.slug === slug ? "is-active" : ""}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link className="dev-primary dev-side-cta" href="/app/settings">
            Open marketplace
          </Link>
        </aside>
        <article className="dev-article">
          <p className="dev-eyebrow">{doc.file}</p>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </div>
  );
}
