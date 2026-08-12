export const MISSING_INFO_TEMPLATES = '/api/v1/missing-info-templates';
export const MISSING_INFO_TEMPLATE = (id: string) => `/api/v1/missing-info-templates/${id}`;
export const MISSING_INFO_TEMPLATE_PUBLISH = (id: string) => `/api/v1/missing-info-templates/${id}/publish`;

export const MISSING_INFO_REQUESTS_STAFF = '/api/v1/missing-info-requests';
export const MISSING_INFO_REQUESTS_STAFF_SEND = '/api/v1/missing-info-requests/send';
export const MISSING_INFO_REQUESTS_STAFF_OUTSTANDING = '/api/v1/missing-info-requests/outstanding';
export const MISSING_INFO_REQUESTS_STAFF_STATS = '/api/v1/missing-info-requests/stats';
export const MISSING_INFO_REQUESTS_STAFF_BULK_REMINDER = '/api/v1/missing-info-requests/bulk-reminder';
export const MISSING_INFO_REQUESTS_STAFF_RESPONSES = (id: string) => `/api/v1/missing-info-requests/${id}/responses`;
