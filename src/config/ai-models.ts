// The set of models a VCS prompt's `model` field can be set to (Admin > AI
// Prompts > Model). Every prompt-driven AI call site resolves its prompt's
// `model` against this list and routes accordingly — see
// `resolveAgentForModel` in digital-factory.ts. Keep this list and the
// frontend's `AVAILABLE_MODELS` (c2c-iat-staff/src/app/admin/prompts/
// _components/PromptMetadataPanel.tsx) in sync; the two are not derived from
// a shared source since they live in separate repos.
//
// Each entry here is its own DigitalOcean Gradient agent, with its own
// endpoint + access key configured in the DO console — DO has no single
// endpoint where a `model:` parameter switches which model answers on an
// agent-bound call; the model is fixed per-agent. See
// GRADIENT_CLAUDE_SONNET_AGENT_ENDPOINT/ACCESS_KEY in src/config/env.ts.

// The shared agent every prompt used before per-prompt selection existed,
// and still the default when a prompt's `model` is unset/unrecognized/not
// yet configured with real credentials. Its real underlying model is
// gpt-oss-120b (confirmed in the DigitalOcean console) — NOT
// llama3.3-70b-instruct, which this codebase wrongly called it for a while.
export const AI_MODEL_SHARED_DEFAULT = 'gpt-oss-120b';

// A second, dedicated DO agent (its own endpoint/access key) running Claude
// Sonnet 4.6 — confirmed working live prior to this feature's build.
export const AI_MODEL_CLAUDE_SONNET = 'claude-sonnet-4.6';

export const SUPPORTED_AI_MODELS = [AI_MODEL_SHARED_DEFAULT, AI_MODEL_CLAUDE_SONNET] as const;

export type SupportedAiModel = (typeof SUPPORTED_AI_MODELS)[number];
