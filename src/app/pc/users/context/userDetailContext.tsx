// The PC user page reuses admin user components (e.g. AdminClientJourney),
// which read the admin context. Two separate (identical) contexts meant the
// PC page's provider didn't satisfy those components and the page crashed
// ("useAdminUserDetail hook must be used within a AdminUserDetailProvider").
// One shared context fixes that for every admin/PC component.
export { AdminUserDetailProvider, useAdminUserDetailContext } from "../../../admin/users/context/userDetailContext";
