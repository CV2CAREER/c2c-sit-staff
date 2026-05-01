// Coach Dashboard Endpoints

// Coach Profile
export const COACH_ME = "/api/v1/coach/me";

// Coach Sessions
export const COACH_SESSIONS = "/api/v1/coach/sessions";
export const COACH_SESSION_DETAIL = (id: string) => `/api/v1/coach/sessions/${id}`;
export const COACH_SESSION_COMPLETE = (id: string) => `/api/v1/coach/sessions/${id}/complete`;
export const COACH_SESSION_CANCEL = (id: string) => `/api/v1/coach/sessions/${id}/cancel`;

// Coach Schedule (Availability)
export const COACH_SCHEDULE = "/api/v1/coach/schedule";
export const COACH_SCHEDULE_DETAIL = (id: string) => `/api/v1/coach/schedule/${id}`;

// Coach Grading
export const COACH_GRADE_SESSION = (sessionId: string) => `/api/v1/coach/grade/${sessionId}`;
