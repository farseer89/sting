import { InjectionToken } from '@angular/core';

export interface ProductAuthConfig {
  loginWelcome: string;
  loginTagline: string;
  signupCta: string;
  loginHeroTitle: string;
  loginHeroSubtitle: string;
  /** Optional third hero line below subtitle (login/signup left panel). */
  loginHeroDetail?: string;
  loginImageUrl: string;
  supportEmail: string;
}

export interface ProductBillingConfig {
  productKey: string;
  trialDays: number;
}

export interface ProductRoutesConfig {
  signup: string;
  signupSuccess: string;
  postSignupRedirect: string;
  login: string;
  home: string;
  billing: string;
}

/** Protopipe-only: route onboarding through Discovery book instead of the legacy wizard. */
export interface ProductOnboardingConfig {
  /** When true, home is reachable without legacy wizard completion; /protopipe/onboarding redirects home. */
  bypassLegacyWizard?: boolean;
}

export interface ProductConfig {
  id: string;
  displayName: string;
  auth: ProductAuthConfig;
  billing: ProductBillingConfig;
  routes: ProductRoutesConfig;
  onboarding?: ProductOnboardingConfig;
  /** Optional sales CTA (e.g. Calendly) for website-build upsell. */
  scheduleCallUrl?: string;
}

export const PRODUCT_CONFIG = new InjectionToken<ProductConfig>('PRODUCT_CONFIG');

/** Default FieldWave/Sting platform branding when no product override is set. */
export const defaultProductConfig: ProductConfig = {
  id: 'fieldwave',
  displayName: 'FieldWave',
  auth: {
    loginWelcome: 'Welcome to FieldWave',
    loginTagline: 'Sign in to continue',
    signupCta: 'Start free trial',
    loginHeroTitle: 'This is Sting.',
    loginHeroSubtitle: 'Help People Do Good Things.',
    loginImageUrl: 'assets/images/surfing.jpeg',
    supportEmail: 'support@fieldwave.ai',
  },
  billing: {
    productKey: 'fieldwave',
    trialDays: 0,
  },
  routes: {
    signup: '/signup',
    signupSuccess: '/signup/success',
    postSignupRedirect: '/home',
    login: '/login',
    home: '/home',
    billing: '/home/billing',
  },
};
