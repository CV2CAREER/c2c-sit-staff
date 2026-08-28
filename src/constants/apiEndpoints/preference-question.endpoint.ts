export const PREFERENCE_QUESTIONS = '/api/v1/preference-questions';
export const PREFERENCE_QUESTION = (id: string) => `/api/v1/preference-questions/${id}`;
export const PREFERENCE_QUESTIONS_REORDER = '/api/v1/preference-questions/reorder';
export const PREFERENCE_QUESTIONS_RECYCLE_BIN = '/api/v1/preference-questions/recycle-bin';
export const PREFERENCE_QUESTION_RESTORE = (id: string) => `/api/v1/preference-questions/${id}/restore`;
export const PREFERENCE_QUESTION_PERMANENT = (id: string) => `/api/v1/preference-questions/${id}/permanent`;
