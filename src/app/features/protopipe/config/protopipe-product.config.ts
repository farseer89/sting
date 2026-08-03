import type { ProductConfig } from '../../../core/config/product-config';

export const protopipeProductConfig: ProductConfig = {
  id: 'protopipe',
  displayName: 'SearchClimber.io',
  logoUrl: 'assets/images/logos/searchclimber-logo.png',
  auth: {
    loginWelcome: 'Welcome to SearchClimber.io',
    loginTagline: 'Sign in to your SEO workspace',
    signupCta: 'Start 3-day free trial',
    loginHeroTitle: 'Time to Climb',
    loginHeroSubtitle: 'We Make SEO & Content Easy',
    loginHeroDetail: 'Plan keywords, schedule articles, and grow organic traffic.',
    loginImageUrl: 'assets/images/login-mckinley.jpg',
    supportEmail: 'support@protopipe.com',
  },
  billing: {
    productKey: 'protopipe',
    trialDays: 3,
  },
  routes: {
    signup: '/signup',
    signupSuccess: '/signup/success',
    postSignupRedirect: '/home',
    login: '/login',
    home: '/home',
    billing: '/home/billing',
  },
  onboarding: {
    bypassLegacyWizard: true,
    hideDiscoveryBookMasthead: true,
  },
  scheduleCallUrl: 'https://calendly.com/server-futureproofsystems/30min',
};
