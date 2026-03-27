// -------------------------------------------------------------
// --------------- AUTHENTICATION ENDPOINTS --------------------

import { API_AUTH_PATHS } from "../apiPaths/api-authPaths";

// -------------------------------------------------------------
const LOGIN = `${API_AUTH_PATHS.LOGIN}`;
const LOGOUT = `${API_AUTH_PATHS.LOGOUT}`;
const VALIDATESESSION = `${API_AUTH_PATHS.VALIDATESESSION}`;
const FETCHUSER = `${API_AUTH_PATHS.FETCHUSER}`;

export { LOGOUT, LOGIN, VALIDATESESSION, FETCHUSER };

