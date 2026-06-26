const microserviceBaseUrl = 'REPLACE_WITH_MICROSERVICE_URL';
const shireBaseUrl = 'REPLACE_WITH_SHIRE_URL';

export const environment = {
  production: true,
  enableDevRoutes: false,
  appName: 'REPLACE_WITH_APP_NAME',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/v2/auth/signin`,
  SHIRE_BASE_URL: shireBaseUrl.startsWith('http') ? shireBaseUrl : null,
};
