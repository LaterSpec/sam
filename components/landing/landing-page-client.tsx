"use client";

import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingSamyChat } from "./landing-samy-chat";
import { LandingFeatures } from "./landing-features";
import { LandingMcp } from "./landing-mcp";
import { LandingPricing } from "./landing-pricing";
import { LandingFaq } from "./landing-faq";
import { LandingFooter } from "./landing-footer";
import "./landing.css";

export function LandingPageClient() {
  return (
    <div className="landing-shell landing-grid-bg">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingSamyChat />
        <LandingFeatures />
        <LandingMcp />
        <LandingPricing />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
