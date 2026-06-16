import type { ProductConfig } from '../../../core/config/product-config';

export const protopipeProductConfig: ProductConfig = {
  id: 'protopipe',
  displayName: 'SearchClimber.ai',
  auth: {
    loginWelcome: 'Welcome to SearchClimber.ai',
    loginTagline: 'Sign in to your SEO workspace',
    signupCta: 'Start 3-day free trial',
    loginHeroTitle: 'SEO content that ranks.',
    loginHeroSubtitle: 'Plan keywords, schedule articles, and grow organic traffic.',
    loginImageUrl: 'assets/images/surfing.jpeg',
    supportEmail: 'support@protopipe.com',
  },
  billing: {
    productKey: 'protopipe',
    trialDays: 3,
  },
  routes: {
    signup: '/signup',
    signupSuccess: '/signup/success',
    postSignupRedirect: '/protopipe/onboarding',
    login: '/login',
    home: '/home',
  },
  scheduleCallUrl: 'https://calendly.com/server-futureproofsystems/30min',
};
