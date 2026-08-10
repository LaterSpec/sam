import Link from "next/link";
import { DEVELOPER_DOCS } from "@/lib/docs/developer-docs";
import "./developers.css";

export const metadata = {
  title: "SAM for Developers",
  description: "Build and publish SAM integrations with manifests, scopes, webhooks and review.",
};

export default function DevelopersIndexPage() {
  return (
    <div className="dev-shell">
      <header className="dev-top">
        <Link href="/" className="dev-brand">
          <span>S</span>
          <strong>SAM for Developers</strong>
        </Link>
        <nav>
          <Link href="/app/settings">Open app settings</Link>
          <Link href="/developers/manifest">Manifest</Link>
          <Link href="/developers/author-guide">Publish</Link>
        </nav>
      </header>
      <main className="dev-main">
        <section className="dev-hero">
          <p className="dev-eyebrow">docs / integrations</p>
          <h1>Build connectors for the SAM marketplace</h1>
          <p>
            Publish reviewed integrations that sync banks, webhooks and automations into a user&apos;s ledger.
            Start with a declarative manifest (Phase 1). Sandboxed Workers come later (Phase 2).
          </p>
          <div className="dev-hero-actions">
            <Link className="dev-primary" href="/developers/author-guide">
              Create an integration
            </Link>
            <Link className="dev-secondary" href="/developers/overview">
              Read the overview
            </Link>
          </div>
        </section>
        <section className="dev-grid">
          {DEVELOPER_DOCS.map((doc) => (
            <Link key={doc.slug} href={`/developers/${doc.slug}`} className="dev-card">
              <strong>{doc.title}</strong>
              <span>{doc.summary}</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
