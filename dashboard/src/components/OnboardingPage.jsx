import { ChevronRight, ChevronsRight } from 'lucide-react';
import './OnboardingPage.css';

export default function OnboardingPage({ onGetStarted }) {
  return (
    <div className="onboarding-page" id="onboarding-page">
      {/* Top Header Logo */}
      <div className="onboarding-header">
        <h2 className="onboarding-brand-logo">
          APIX<span>E</span>R
        </h2>
      </div>

      {/* Hero Image Section */}
      <div className="onboarding-hero-wrapper">
        <img
          src="/onboarding-hero.jpg"
          alt="Developer using mobile platform"
          className="onboarding-hero-img"
        />
      </div>

      {/* Bottom Content Sheet */}
      <div className="onboarding-sheet">
        <h1 className="onboarding-headline">
          TURN DATA INTO SMART DECISIONS
        </h1>

        <p className="onboarding-subtext">
          See live requests, response times, and system health instantly.
        </p>

        {/* Slide / Tap Capsule Button */}
        <div
          className="onboarding-action-capsule"
          onClick={onGetStarted}
          role="button"
          tabIndex={0}
          id="btn-get-started"
        >
          <div className="capsule-inner-btn">
            <span>Get Started</span>
          </div>

          <div className="capsule-arrows-wrap">
            <ChevronsRight size={20} className="capsule-chevrons" />
          </div>
        </div>
      </div>
    </div>
  );
}
