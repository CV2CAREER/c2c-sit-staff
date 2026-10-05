export const QUEUE_ENTRIES = '/api/v1/queue-entries';
export const QUEUE_ENTRY_STAFF_TASKS = '/api/v1/queue-entries/staff-tasks';
export const QUEUE_ENTRY_ASSIGN = (id: string) => `/api/v1/queue-entries/${id}/assign`;
export const QUEUE_ENTRY_RESOLVE = (id: string) => `/api/v1/queue-entries/${id}/resolve`;

export const ADMIN_ACTIVE_PCS = '/api/v1/admin/active-pcs';
