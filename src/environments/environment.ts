const microserviceBaseUrl = 'https://droppin.shop';

export const environment = {
  production: false,
  enableDevRoutes: true,
  appName: 'SearchClimber.io',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/v2/auth/signin`,
  /** When set, Protopipe polls Shire `GET /api/sites/:siteId/runs/:runId` instead of bagend pipeline endpoints. */
  SHIRE_BASE_URL: null as string | null,
};
