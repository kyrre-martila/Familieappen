"use client";

import { useRouter } from "next/navigation";
import { completeOnboardingAppPrompt, ONBOARDING_DASHBOARD_ROUTE } from "../../../lib/onboarding-completion";

const APP_STORE_URL = "https://example.com/familieappen-app-store"; // TODO: Replace with the production App Store URL.
const GOOGLE_PLAY_URL = "https://example.com/familieappen-google-play"; // TODO: Replace with the production Google Play URL.

export function AppRecommendationActions() {
  const router = useRouter();

  function continueInBrowser() {
    completeOnboardingAppPrompt();
    router.push(ONBOARDING_DASHBOARD_ROUTE);
  }

  return (
    <div className="app-recommendation-actions" aria-label="Velg hvordan du vil fortsette">
      <a className="app-store-button app-store-button--apple" href={APP_STORE_URL} rel="noreferrer" target="_blank">
        <AppleIcon />
        <span className="app-store-button__copy">
          <span>Last ned i</span>
          <strong>App Store</strong>
        </span>
      </a>
      <a className="app-store-button app-store-button--google" href={GOOGLE_PLAY_URL} rel="noreferrer" target="_blank">
        <GooglePlayIcon />
        <span className="app-store-button__copy">
          <span>Last ned på</span>
          <strong>Google Play</strong>
        </span>
      </a>

      <div className="app-recommendation-divider" aria-hidden="true">
        <span />
        <p>ELLER</p>
        <span />
      </div>

      <button className="app-recommendation-continue" onClick={continueInBrowser} type="button">
        Fortsett i nettleseren
      </button>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" className="app-store-button__icon" fill="currentColor" viewBox="0 0 48 48">
      <path d="M31.2 7.4c1.2-1.5 2-3.6 1.8-5.7-1.8.1-4 .9-5.3 2.4-1.2 1.4-2.2 3.5-1.9 5.5 2 .2 4.1-.8 5.4-2.2Z" />
      <path d="M39.6 34.8c-1 2.3-1.5 3.3-2.8 5.3-1.8 2.8-4.4 6.3-7.6 6.3-2.8 0-3.5-1.9-7.3-1.8-3.8 0-4.6 1.8-7.3 1.8-3.2 0-5.6-3.2-7.4-6-5-7.8-5.5-17 .1-21.9 2-1.7 4.6-2.7 7.1-2.7 2.8 0 5.4 1.9 7.3 1.9 1.8 0 5.1-2.4 8.6-2.1 1.5.1 5.6.6 8.2 4.5-7.2 4-6 14.3 1.1 14.7Z" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg aria-hidden="true" className="app-store-button__icon" viewBox="0 0 48 48">
      <path d="M7.5 4.5c-.6.7-1 1.7-1 3v33c0 1.2.4 2.2 1 3l20.3-19.6L7.5 4.5Z" fill="#31a853" />
      <path d="m34.2 17.6-6.4 6.3 6.5 6.3 7.6-4.3c2.1-1.2 2.1-4.2 0-5.4l-7.7-4.4Z" fill="#fbbc04" />
      <path d="M7.5 4.5 27.8 24l6.4-6.3L11.6 4.8c-1.6-.9-3.1-.9-4.1-.3Z" fill="#4285f4" />
      <path d="m7.5 43.5 20.3-19.6 6.5 6.3-22.7 13c-1.6.9-3.1.9-4.1.3Z" fill="#ea4335" />
    </svg>
  );
}
