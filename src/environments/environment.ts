const microserviceBaseUrl = 'https://droppin.shop';

export const environment = {
  production: false,
  appName: 'Sting',
  MICRO_BASE_URL: microserviceBaseUrl,
  MICRO_SOCKET_ENDPOINT: microserviceBaseUrl,
  MICRO_USER_SIGNIN: `${microserviceBaseUrl}/api/users/signin`,
};
