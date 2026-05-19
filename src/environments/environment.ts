const microserviceBaseUrl = 'https://droppin.shop';

export const environment = {
  production: false,
  enableDevRoutes: true,
  appName: 'Sting',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/v2/auth/signin`,
};
