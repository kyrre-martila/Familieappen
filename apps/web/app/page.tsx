"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SPLASH_DURATION_MS = 3000;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/login");
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <section className="splash-screen" aria-label="Familieappen loading screen">
      <picture className="splash-screen__media" aria-hidden="true">
        <source
          media="(min-width: 48rem)"
          srcSet="/assets/onboarding/splash-family-desktop.webp"
        />
        <img
          alt=""
          className="splash-screen__image"
          decoding="async"
          fetchPriority="high"
          src="/assets/onboarding/splash-family-mobile.webp"
        />
      </picture>

      <div className="splash-screen__scrim" aria-hidden="true" />

      <div className="splash-screen__brand" aria-label="Familieappen">
        <img
          alt=""
          className="splash-screen__icon"
          src="/assets/brand/familieappen-icon.svg"
        />
        <img
          alt=""
          className="splash-screen__logo"
          src="/assets/brand/familieappen-logo.svg"
        />
        <p className="splash-screen__tagline">
          mindre kaos
          <br />
          mer familietid
        </p>
      </div>

      <div
        aria-label="Loading Familieappen"
        aria-valuetext="Opening login"
        className="splash-screen__progress"
        role="progressbar"
      >
        <span
          className="splash-screen__progress-bar"
          style={{ animationDuration: `${SPLASH_DURATION_MS}ms` }}
        />
      </div>
    </section>
  );
}
