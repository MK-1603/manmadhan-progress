import React from "react";
import { HeroSection } from "../../components/hero-section";
import { MobileWelcome } from "../../components/mobile-welcome/MobileWelcome";
import { RemainingLandingSections } from "../../components/landing-sections";
import { SplashScreen } from "../../components/splash-screen";
import { Footer } from "../../components/footer";
import { LoginUrlHandler } from "../../components/auth/login-url-handler";

export default function HomePage() {
  return (
    <>
      <LoginUrlHandler />
      <SplashScreen />

      {/* DESKTOP VIEW (768px+): Marketing Hero Experience */}
      <div className="hidden md:block">
        <HeroSection />
      </div>

      {/* MOBILE VIEW (<768px): Native Mobile Welcome Experience */}
      <div className="block md:hidden">
        <MobileWelcome />
      </div>

      {/* DESKTOP REMAINING LANDING SECTIONS */}
      <div className="hidden md:block">
        <RemainingLandingSections />
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
