---
name: refactoring-strategy
description: Comprehensive guide for refactoring feature modules from the v2 codebase to the c2c-customer-rft architecture. Covers API client management, public endpoints, feature structuring, and UI composition.
---

# Refactoring Strategy from v2 to rft

This skill documents the prescribed pattern for porting features (like Auth, Sessions, User Profiles) from the legacy `v2` codebase to the `c2c-customer-rft` standards.

## Core Rules & Lifecycle

> [!IMPORTANT]
> **Preservation First:**
>
> 1. **No URL Changes:** Do not change page paths or folder structures. The URLs must remain identical to the legacy system unless the `rft` architecture (like `(dashboard)` groups) strictly requires a minor move.
> 2. **Design Fidelity:** Do not change the design, colors, or layout. The visual user interface must remain exactly as it was in `v2`. **I want 100% parity and 1 to 1 ui.**
> 3. **Reuse UI Code:** Use the same UI code, class names, and components as much as possible. This is a **code refactor only** (API/Auth layer), not a redesign. **Reuse as much code as possible for the ui, i want 1 to 1 ui/ux.**

When refactoring a feature, follow these exact procedural steps to ensure consistency with the `rft` architecture.

### 1. API Mapping & Configuration

Before writing UI components, establish the backend connection layer.

- **Define Endpoint Constants:**
  - Locate the feature's API routes in the legacy system.
  - Map them to the new Express backend equivalents (`/api/v1/...`).
  - Create or update a file in `src/constants/apiEndpoints/` (e.g., `user.endpoint.ts`) with exactly what the backend expects.

- **Define API Paths (for routing flags):**
  - Create or update the corresponding file in `src/constants/apiPaths/` (e.g., `api-userPaths.ts`).
  - _Crucial Step:_ If any of these endpoints do NOT require the user to be logged in (e.g., password reset, fetching public posts), **you MUST add them to the `PUBLIC_ROUTES` array inside `src/services/api-client.ts`.** Failure to do this will cause the Axios interceptor to block the request.

### 2. Domain Hooks (`src/hooks/api/`)

Do not fetch directly from components. Use TanStack Query wrapped around our custom `useApi` hooks.

- **Modifying Existing Hooks:**
  - If a file for this domain already exists (e.g., `auth.api.ts`, `user.api.ts`), **do not create a new one.** Append your new mutation or query to the bottom of the file and include it in the exported domain object (e.g., export `deleteUserDomain`).
  - The decision to create a new file is based strictly on the backend URL prefix. If the endpoint is `/api/v1/payment/capture`, check if `payment.api.ts` exists. If not, create it. If it does, strictly append to it.

### 3. Page & Component Structuring

Mirror the granular component architecture seen in the `rft` auth module.

- **Granular Components:**
  - Break massive `v2` pages down into highly focused client components.
  - Example: `v2`'s monolithic login page was broken into `LoginForm.tsx`, `AuthHeader.tsx`, `SocialLogin.tsx`, etc., inside `src/app/(auth)/login/_components/`.
- **Page Wrapper (Metadata):**
  - The `page.tsx` file should act primarily as a Server Component wrapper that imports the client components.
  - **Metadata:** You _must_ add Next.js metadata logic to the `page.tsx` file (e.g., `export const metadata: Metadata = { title: "..." }`) just like the existing `rft` pages.
- **File System Routing:**
  - Make sure the folder structure accurately reflects the route. If you are creating a mutation/view for a specific user action like `/dashboard/user/settings`, structure it logically mirroring the URL.

### 4. Handling Redirects & Loading States

- **The Splash Screen:**
  - When actively redirecting a user (e.g., after a successful mutation like Login, Logout, or Checkout), you must show the appropriate loading state or splash screen as they transition to the new route.
  - Do not let the UI freeze during `router.push()`. Provide instant visual feedback (like the `sonner` toast used in `auth.api.ts`).

### 5. Type Definitions (`src/types/`)

- Ensure all API payloads (Requests) and expected responses are strongly typed in a domain-specific `.types.ts` file in the `src/types/` folder (e.g., `user.types.ts`).

## Fetching Strategy

This section documents the standard pattern for API interactions in the `c2c-customer-rft` project.

### Core Principles

1.  **Encapsulation**: Components should never call axios or fetch directly. They must use domain-specific hooks.
2.  **Domain Segregation**: Group related API calls into domain hooks (e.g., `user.api.ts`, `auth.api.ts`).
3.  **State Management**: Use TanStack Query (React Query) for server state and loading/error management.
4.  **Global Sync**: Sync successful mutations with global state (Zustand) when necessary.

### Implementation Pattern

#### 1. Define Constants

Store endpoints in `src/constants/apiEndpoints/`.

#### 2. Base Hooks (`src/hooks/useApi.ts`)

Use `useFetchData` for GET requests and `useMutateData` for POST/PUT/PATCH/DELETE.

#### 3. Domain Hooks (`src/hooks/api/`)

Create a hook that returns an object containing multiple queries/mutations.

##### Example Mutation:

```typescript
export const useUserMutations = () => {
  const { mutate: doSomething } = useMutateData<ResponseType, RequestType>({
    method: "POST",
    mutationKey: ["unique-key"],
    url: SOME_ENDPOINT_CONSTANT,
    onSuccess: (response) => {
      // Handle success (toasts, redirects, state updates)
    },
    onError: (error) => {
      // Handle error
    },
  });
  return { doSomething };
};
```

##### Example Query:

```typescript
export const useUserQueries = (options: { enabled: boolean }) => {
  const { data, isLoading } = useFetchData<ResponseType>({
    method: "GET",
    url: FETCH_ENDPOINT,
    queryKey: ["user-key"],
    enabled: options.enabled,
  });
  return { data, isLoading };
};
```

### Tools & Libraries

- **TanStack Query**: Caching and lifecycle.
- **Axios Instance**: Configured in `src/services/api-client.ts`.
- **Sonner**: Toast notifications.
- **Zustand**: Global client-side state.

## Example Workflow (Migrating "Delete User")

1. **Path Mapping:** Add `DELETE: "/v1/user/delete"` to `src/constants/apiEndpoints/user.endpoint.ts`. Add it to `src/constants/apiPaths/api-userPaths.ts`.
2. **Auth Verification:** If it requires authentication, ensure it is _not_ in the `PUBLIC_ROUTES` array in `api-client.ts`.
3. **Hook Modification:** Open `src/hooks/api/user.api.ts`. Use `useMutateData` to create `deleteUserMutation`. Export it.
4. **UI Breakdown:** Create `src/app/(dashboard)/user/settings/_components/DeleteAccountModal.tsx`.
5. **Page Wrapper:** Update `src/app/(dashboard)/user/settings/page.tsx` to include metadata and render the modal.
6. **Redirection Phase:** On successful mutation, trigger a toast, clear local state (`setUser(null)`), show a loading spinner, and `router.push('/goodbye')`.
