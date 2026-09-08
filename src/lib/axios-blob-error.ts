// With `responseType: "blob"`, axios parses an ERROR response body as a Blob
// too — even when the backend sent normal JSON (`{ message: "..." }`) — so
// `error.response.data.message` is always undefined and callers silently
// fall back to a generic message no matter what actually failed server-side.
// Used by every mutation that downloads a file (CV variant preview,
// interview pack preview) so a real backend error (e.g. a render failure)
// is never hidden behind a generic toast.
export const rethrowWithBlobErrorMessage = async (error: any): Promise<never> => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed?.message) throw new Error(parsed.message);
    } catch {
      // Body wasn't parseable JSON (or the throw above already escaped) —
      // fall through to re-throwing the original error untouched.
    }
  }
  throw error;
};
