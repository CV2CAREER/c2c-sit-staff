export const CLIENT_JOURNEY_BY_CLIENT = (clientId: string) =>
  `/api/v1/client-journey/client/${clientId}`;
export const CLIENT_JOURNEY_ATTEST = (clientId: string) =>
  `/api/v1/client-journey/client/${clientId}/attest`;
export const CLIENT_JOURNEY_REOPEN = (clientId: string) =>
  `/api/v1/client-journey/client/${clientId}/reopen`;
