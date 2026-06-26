const microserviceBaseUrl = 'https://droppin.shop';
const shireBaseUrl = 'https://shire.droppin.shop';

export const environment = {
  production: true,
  enableDevRoutes: false,
  appName: 'SearchClimber.ai',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/v2/auth/signin`,
  SHIRE_BASE_URL: shireBaseUrl.startsWith('http') ? shireBaseUrl : null,
};
