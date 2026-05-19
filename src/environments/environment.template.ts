const microserviceBaseUrl = 'REPLACE_WITH_MICROSERVICE_URL';

export const environment = {
  production: true,
  enableDevRoutes: false,
  appName: 'REPLACE_WITH_APP_NAME',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/v2/auth/signin`,
};
