"use client";

import { BookOpen, Check, KeyRound, Languages, Palette, PlugZap, UserRound } from "lucide-react";
import { SAM_PALETTES, SAM_THEME_SWATCHES, type SamTheme } from "@/lib/theme/sam-theme";
import type { Lang } from "@/lib/i18n/i18n-context";
import type { Currency } from "@/lib/finance/currency";
import type { AppState } from "@/lib/db/queries/load-user-data";
import type { DesktopCopy } from "../desktop-copy";

export function SettingsSection({
  state,
  theme,
  language,
  currency,
  copy,
  onTheme,
  onLanguage,
  onCurrency,
  onMcp,
  onIntegrations,
}: {
  state: AppState;
  theme: SamTheme;
  language: Lang;
  currency: Currency;
  copy: DesktopCopy;
  onTheme: (theme: SamTheme) => void;
  onLanguage: (lang: Lang) => void;
  onCurrency: (currency: Currency) => void;
  onMcp: () => void;
  onIntegrations: () => void;
}) {
  return (
    <div className="desk-section">
      <div className="desk-section-heading">
        <div>
          <span className="desk-eyebrow">sam / preferences</span>
          <h1>{copy.settings}</h1>
        </div>
      </div>
      <section className="desk-panel">
        <div className="desk-panel-heading">
          <div className="desk-inline-title">
            <Palette size={16} />
            <h2>{copy.selectTheme}</h2>
          </div>
          <span className="desk-panel-note">semantic colors stay consistent</span>
        </div>
        <div className="desk-theme-grid">
          {Object.entries(SAM_PALETTES).map(([id, palette]) => {
            const swatches = SAM_THEME_SWATCHES[id as keyof typeof SAM_THEME_SWATCHES];
            return (
              <button
                key={id}
                type="button"
                className={theme === id ? "is-active" : ""}
                onClick={() => onTheme(id as SamTheme)}
                aria-pressed={theme === id}
              >
                <span>
                  {swatches.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <strong>{palette.name}</strong>
                {theme === id && <Check size={14} />}
              </button>
            );
          })}
        </div>
      </section>
      <div className="desk-settings-grid">
        <section className="desk-panel">
          <div className="desk-panel-heading">
            <div className="desk-inline-title">
              <UserRound size={16} />
              <h2>{copy.profile}</h2>
            </div>
          </div>
          <dl className="desk-settings-list">
            <div>
              <dt>Name</dt>
              <dd>{state.user.full_name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{state.user.email}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{state.user.plan}</dd>
            </div>
          </dl>
        </section>
        <section className="desk-panel">
          <div className="desk-panel-heading">
            <div className="desk-inline-title">
              <Languages size={16} />
              <h2>Locale</h2>
            </div>
          </div>
          <label className="desk-field">
            <span>{copy.language}</span>
            <select value={language} onChange={(event) => onLanguage(event.target.value as Lang)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="desk-field">
            <span>{copy.currency}</span>
            <select value={currency} onChange={(event) => onCurrency(event.target.value as Currency)}>
              <option value="USD">USD · US dollar</option>
              <option value="PEN">PEN · Sol peruano</option>
            </select>
          </label>
        </section>
      </div>
      <section className="desk-panel desk-mcp-banner">
        <PlugZap size={20} />
        <div>
          <h2>{copy.integrations}</h2>
          <p>{copy.integrationsHint}</p>
        </div>
        <div className="desk-heading-actions">
          <a className="desk-secondary-button" href="/developers" target="_blank" rel="noreferrer">
            <BookOpen size={15} /> {copy.developersDocs}
          </a>
          <button type="button" className="desk-primary-button" onClick={onIntegrations}>
            {copy.openIntegrations}
          </button>
        </div>
      </section>
      <section className="desk-panel desk-mcp-banner">
        <KeyRound size={20} />
        <div>
          <h2>SAM MCP</h2>
          <p>Connect assistants to your financial tools with scoped, revocable access.</p>
        </div>
        <button type="button" className="desk-secondary-button" onClick={onMcp}>
          {copy.connectMcp}
        </button>
      </section>
    </div>
  );
}
