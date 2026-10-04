// --- Digital Ocean Gradient Configuration ---

import {
  GRADIENT_ACCESS_TOKEN,
  GRADIENT_AGENT_ACCESS_KEY,
  GRADIENT_AGENT_ENDPOINT,
  GRADIENT_CLAUDE_SONNET_AGENT_ENDPOINT,
  GRADIENT_CLAUDE_SONNET_AGENT_ACCESS_KEY,
  GRADIENT_GPT4O_AGENT_ENDPOINT,
  GRADIENT_GPT4O_AGENT_ACCESS_KEY,
  GRADIENT_GPT4O_MINI_AGENT_ENDPOINT,
  GRADIENT_GPT4O_MINI_AGENT_ACCESS_KEY,
  GRADIENT_GPT_OSS_20B_AGENT_ENDPOINT,
  GRADIENT_GPT_OSS_20B_AGENT_ACCESS_KEY,
  GRADIENT_CLAUDE_FABLE_AGENT_ENDPOINT,
  GRADIENT_CLAUDE_FABLE_AGENT_ACCESS_KEY,
} from "../config/env";
import {
  AI_MODEL_SHARED_DEFAULT,
  AI_MODEL_CLAUDE_SONNET,
  AI_MODEL_GPT_4O,
  AI_MODEL_GPT_4O_MINI,
  AI_MODEL_GPT_OSS_20B,
  AI_MODEL_CLAUDE_FABLE,
  SUPPORTED_AI_MODELS,
  SupportedAiModel,
} from "../config/ai-models";
import { getServiceLogger } from "./createLogger";

const logger = getServiceLogger("digital-factory");

// Validate environment variables
if (!GRADIENT_ACCESS_TOKEN) {
  logger.error("Missing GRADIENT_ACCESS_TOKEN in environment variables");
  throw new Error("GRADIENT_ACCESS_TOKEN environment variable is not set.");
}

if (!GRADIENT_AGENT_ACCESS_KEY) {
  logger.error("Missing GRADIENT_AGENT_ACCESS_KEY in environment variables");
  throw new Error("GRADIENT_AGENT_ACCESS_KEY environment variable is not set.");
}

if (!GRADIENT_AGENT_ENDPOINT) {
  logger.error("Missing GRADIENT_AGENT_ENDPOINT in environment variables");
  throw new Error("GRADIENT_AGENT_ENDPOINT environment variable is not set.");
}

// Import the Gradient SDK
import Gradient from '@digitalocean/gradient';

// Initialize TWO clients like in Python
let agentClient: any;
let apiClient: any;

try {
  // Client 1: Agent client (for agent-specific endpoints)
  agentClient = new Gradient({
    agentAccessKey: GRADIENT_AGENT_ACCESS_KEY,
    agentEndpoint: GRADIENT_AGENT_ENDPOINT,
  });

  // Client 2: API client (for general API calls)
  apiClient = new Gradient({
    accessToken: GRADIENT_ACCESS_TOKEN,
  });

  logger.info('[DigitalOcean Gradient] Both clients initialized successfully');
} catch (error) {
  logger.error('[DigitalOcean Gradient] Failed to initialize clients:', error);
  throw new Error('Failed to initialize DigitalOcean Gradient clients');
}

// A dedicated agent lives at its own endpoint/key, entirely separate from
// the shared agentClient/apiClient SDK singletons above (which are bound to
// GRADIENT_AGENT_ENDPOINT specifically) — so routing to one means going
// straight to the endpoint-agnostic direct-fetch path (directApiFallback
// below) rather than through those singletons.
type AgentOverride = { endpoint: string; accessKey: string };

// Registry of every dedicated (non-default) agent this backend can route a
// VCS prompt to, keyed by the same model string the prompt's `model` field
// holds. Add a new entry here (plus its own env vars in src/config/env.ts
// and its display name in src/config/ai-models.ts) the same way
// GRADIENT_CLAUDE_SONNET_AGENT_* was added — each is its own DO agent
// created in the console first, this just wires the endpoint/key up.
const DEDICATED_AGENTS: Partial<Record<SupportedAiModel, AgentOverride>> = {};
if (GRADIENT_CLAUDE_SONNET_AGENT_ENDPOINT && GRADIENT_CLAUDE_SONNET_AGENT_ACCESS_KEY) {
  DEDICATED_AGENTS[AI_MODEL_CLAUDE_SONNET] = {
    endpoint: GRADIENT_CLAUDE_SONNET_AGENT_ENDPOINT,
    accessKey: GRADIENT_CLAUDE_SONNET_AGENT_ACCESS_KEY,
  };
}
if (GRADIENT_GPT4O_AGENT_ENDPOINT && GRADIENT_GPT4O_AGENT_ACCESS_KEY) {
  DEDICATED_AGENTS[AI_MODEL_GPT_4O] = {
    endpoint: GRADIENT_GPT4O_AGENT_ENDPOINT,
    accessKey: GRADIENT_GPT4O_AGENT_ACCESS_KEY,
  };
}
if (GRADIENT_GPT4O_MINI_AGENT_ENDPOINT && GRADIENT_GPT4O_MINI_AGENT_ACCESS_KEY) {
  DEDICATED_AGENTS[AI_MODEL_GPT_4O_MINI] = {
    endpoint: GRADIENT_GPT4O_MINI_AGENT_ENDPOINT,
    accessKey: GRADIENT_GPT4O_MINI_AGENT_ACCESS_KEY,
  };
}
if (GRADIENT_GPT_OSS_20B_AGENT_ENDPOINT && GRADIENT_GPT_OSS_20B_AGENT_ACCESS_KEY) {
  DEDICATED_AGENTS[AI_MODEL_GPT_OSS_20B] = {
    endpoint: GRADIENT_GPT_OSS_20B_AGENT_ENDPOINT,
    accessKey: GRADIENT_GPT_OSS_20B_AGENT_ACCESS_KEY,
  };
}
if (GRADIENT_CLAUDE_FABLE_AGENT_ENDPOINT && GRADIENT_CLAUDE_FABLE_AGENT_ACCESS_KEY) {
  DEDICATED_AGENTS[AI_MODEL_CLAUDE_FABLE] = {
    endpoint: GRADIENT_CLAUDE_FABLE_AGENT_ENDPOINT,
    accessKey: GRADIENT_CLAUDE_FABLE_AGENT_ACCESS_KEY,
  };
}

logger.info(
  `[DigitalOcean AI] Dedicated agents configured: ${Object.keys(DEDICATED_AGENTS).length ? Object.keys(DEDICATED_AGENTS).join(', ') : 'none — every prompt uses the shared gpt-oss-120b agent'}`,
);

export interface AiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AiResponse {
  text: string;
  usage: AiUsage;
}

/**
 * Calls the Digital Ocean AI Agent using SDK (like Python code)
 */
const callDigitalOceanAgent = async (prompt: string, jsonMode: boolean, maxTokens: number, agentOverride?: AgentOverride): Promise<AiResponse> => {
  // A dedicated agent (e.g. the Claude Sonnet 4.6 one) lives at its own
  // endpoint/key — the agentClient/apiClient SDK singletons below are bound
  // to the shared agent's config at module load, so they can't be reused
  // here. Go straight to the endpoint-agnostic direct-fetch path.
  if (agentOverride) {
    return await directApiFallback(prompt, Date.now(), jsonMode, maxTokens, agentOverride);
  }

  logger.info(`[DigitalOcean AI] Using agent client with endpoint: ${GRADIENT_AGENT_ENDPOINT}`);

  // Only requested for callers that parse the response as JSON (e.g. CV
  // variant generation) — forcing this on plain-text callers (cover letter)
  // would be wrong, so it's opt-in per call rather than always-on.
  const responseFormat = jsonMode ? { response_format: { type: 'json_object' } } : {};

  try {
    const startTime = Date.now();

    // METHOD 1: Try Agent Inference first (like Python)
    if (agentClient && agentClient.agents) {
      try {
        logger.info('[DigitalOcean AI] Trying Agent Inference via SDK...');

        const agentResponse = await agentClient.agents.chat.completions.create({
          messages: [{
            role: 'user',
            content: prompt
          }],
          // The agent's real model (gpt-oss-120b, confirmed in the DO
          // console) is fixed server-side on the agent itself — this field
          // is inert on an agent-bound endpoint like this one, kept only
          // because the SDK's types require *something* here.
          model: 'llama3.3-70b-instruct',
          temperature: 0.7,
          max_tokens: maxTokens,
          ...responseFormat,
        });

        const endTime = Date.now();
        logger.info(`[DigitalOcean AI] Agent responded in ${endTime - startTime}ms`);

        if (agentResponse && agentResponse.choices && agentResponse.choices[0]) {
          const text = agentResponse.choices[0].message.content || '';
          const usage: AiUsage = agentResponse.usage
            ? { prompt_tokens: agentResponse.usage.prompt_tokens || 0, completion_tokens: agentResponse.usage.completion_tokens || 0, total_tokens: agentResponse.usage.total_tokens || 0 }
            : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
          return { text, usage };
        }
      } catch (agentError: any) {
        logger.warn(`[DigitalOcean AI] Agent SDK error: ${agentError.message.substring(0, 100)}`);
      }
    }

    // METHOD 2: Try Serverless Inference (fallback)
    if (apiClient && apiClient.chat) {
      try {
        logger.info('[DigitalOcean AI] Trying Serverless Inference via SDK...');

        const inferenceResponse = await apiClient.chat.completions.create({
          messages: [{
            role: 'user',
            content: prompt
          }],
          // Unlike the agent-bound Method 1 above, this hits DO's general
          // serverless inference API directly, where `model` genuinely
          // selects which model answers — so this literal is NOT cosmetic
          // here. Left as 'llama3.3-70b-instruct' rather than corrected to
          // gpt-oss-120b: this is only a rarely-hit fallback (Method 1
          // succeeds in normal operation), and swapping it without
          // confirming the exact model id DO's serverless catalog expects
          // for gpt-oss-120b risks silently breaking this fallback path on
          // a guess. Flagged for whoever next touches this file with real
          // DO console access to confirm and fix properly.
          model: 'llama3.3-70b-instruct',
          temperature: 0.7,
          max_tokens: maxTokens,
          ...responseFormat,
        });

        const endTime = Date.now();
        logger.info(`[DigitalOcean AI] Serverless responded in ${endTime - startTime}ms`);

        if (inferenceResponse && inferenceResponse.choices && inferenceResponse.choices[0]) {
          const text = inferenceResponse.choices[0].message.content || '';
          const usage: AiUsage = inferenceResponse.usage
            ? { prompt_tokens: inferenceResponse.usage.prompt_tokens || 0, completion_tokens: inferenceResponse.usage.completion_tokens || 0, total_tokens: inferenceResponse.usage.total_tokens || 0 }
            : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
          return { text, usage };
        }
      } catch (inferenceError: any) {
        logger.warn(`[DigitalOcean AI] Serverless SDK error: ${inferenceError.message.substring(0, 100)}`);
      }
    }

    // METHOD 3: Fallback to direct API (final fallback)
    logger.info('[DigitalOcean AI] SDK methods failed, trying direct API...');
    return await directApiFallback(prompt, startTime, jsonMode, maxTokens);

  } catch (error: any) {
    logger.error(`[DigitalOcean AI] All methods failed:`, error.message);
    throw error;
  }
};

/**
 * Direct API fallback (like Python's _direct_api_fallback)
 */
const directApiFallback = async (prompt: string, startTime: number, jsonMode: boolean, maxTokens: number, agentOverride?: AgentOverride): Promise<AiResponse> => {
  try {
    const endpoint = agentOverride?.endpoint ?? GRADIENT_AGENT_ENDPOINT;
    const accessKey = agentOverride?.accessKey ?? GRADIENT_AGENT_ACCESS_KEY;

    const headers = {
      'Authorization': `Bearer ${accessKey}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      messages: [{
        role: 'user',
        content: prompt
      }],
      // Every agent-bound endpoint (shared or dedicated) fixes its model
      // server-side — this field is inert either way, kept only because the
      // API requires something here.
      model: 'llama3.3-70b-instruct',
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: false,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    // Use the full API endpoint path
    const apiUrl = `${endpoint}/api/v1/chat/completions`;
    logger.info(`[DigitalOcean AI] Direct API to: ${apiUrl}`);

    // The agent behind GRADIENT_AGENT_ENDPOINT is a reasoning model (emits
    // chain-of-thought before answering) — a flat 120s wasn't enough for the
    // ~8000-char CV variant prompt (observed timing out twice at exactly
    // 120s) while being far more than a trivial test message needs. Scale
    // with prompt size instead: 90s floor, ~20ms/char, 5min ceiling. The
    // Interview Pack stage prompts (hard rules + schema + CV + job content
    // + prior-stage context) routinely landed right on the old 180s ceiling
    // and timed out, so the ceiling was raised — 180s was too tight for
    // this reasoning model on the heaviest prompts.
    const timeoutMs = Math.min(300000, Math.max(90000, prompt.length * 20));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        const timeoutError: any = new Error(`Direct API timed out after ${timeoutMs}ms`);
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Direct API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    logger.info(`[DigitalOcean AI] Direct API responded in ${endTime - startTime}ms`);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const text = data.choices[0].message.content;
      const usage: AiUsage = data.usage
        ? { prompt_tokens: data.usage.prompt_tokens || 0, completion_tokens: data.usage.completion_tokens || 0, total_tokens: data.usage.total_tokens || 0 }
        : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      return { text, usage };
    }

    throw new Error('Unexpected response format from direct API');

  } catch (error: any) {
    logger.error('[DigitalOcean AI] Direct API fallback failed:', error.message);
    throw error;
  }
};

/**
 * Resolves a VCS prompt's `model` field to which agent actually handles the
 * call. Returns undefined (shared default agent) whenever the requested
 * model is unset, unrecognized, or not yet wired up with real
 * endpoint/key env vars — a prompt can be switched to a model in the admin
 * UI well before that model's agent is configured, and calls must keep
 * working unchanged in the meantime rather than start failing.
 */
const resolveAgentOverride = (model?: string | null): AgentOverride | undefined => {
  if (!model || model === AI_MODEL_SHARED_DEFAULT) return undefined;

  const override = DEDICATED_AGENTS[model as SupportedAiModel];
  if (!override && SUPPORTED_AI_MODELS.includes(model as SupportedAiModel)) {
    // A recognized model, just not wired up with real endpoint/key env vars
    // yet — worth a warning, unlike an unset/unrecognized `model` (the
    // common case for every prompt that hasn't opted into a model yet).
    logger.warn(`[DigitalOcean AI] Prompt requested model "${model}" but its agent isn't configured — falling back to the shared agent.`);
  }
  return override;
};

// Same tolerant extraction every caller already does on the far side of
// queryDigitalOceanAI (strip a markdown code fence, pull out the first
// {...} or [...] block, JSON.parse it) — duplicated narrowly here just to
// decide whether an attempt counts as a failure worth retrying, not to
// replace each caller's own parsing.
const looksLikeParseableJson = (text: string): boolean => {
  const cleaned = text.replace(/```(?:json)?\s*|\s*```/gi, '').trim();
  const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
  try {
    JSON.parse(match ? match[0] : cleaned);
    return true;
  } catch {
    return false;
  }
};

/**
 * Queries Digital Ocean AI with retry logic.
 *
 * `jsonMode` requests `response_format: { type: "json_object" }` from the
 * underlying API — opt-in per call since only some callers (e.g. CV variant
 * generation) parse the response as JSON; cover letter generation and others
 * expect plain text and must not set this. That request alone doesn't
 * guarantee compliance (weaker models can still ignore it), so when set,
 * each attempt's response is also checked here and retried like any other
 * failure if it isn't parseable JSON — a caller only ever sees a non-JSON
 * result after every retry has been exhausted. Never guarantees the JSON's
 * *keys* match any particular schema — schema drift (e.g. `experience` vs
 * `jobs`) is handled separately by each caller's own normalization.
 *
 * `model` is the calling prompt's own `VCS.model` field (Admin > AI Prompts
 * > Model) — omit it (or pass an unconfigured model) to use the shared
 * default agent, unchanged from before per-prompt model selection existed.
 */
export const queryDigitalOceanAI = async (
  prompt: string,
  retryCount: number = 2,
  jsonMode: boolean = false,
  // Every caller shares this one output budget by default; CV variant
  // generation passes a higher value since its output is a full designed
  // HTML/CSS document (much more verbose than the plain-text/JSON other
  // callers return), and a tight budget discourages the model from
  // spending tokens on decorative styling in favor of just fitting the
  // content in.
  maxTokens: number = 4000,
  model?: SupportedAiModel | string | null,
): Promise<string> => {
  const result = await queryDigitalOceanAIWithUsage(prompt, retryCount, jsonMode, maxTokens, model);
  return result.text;
};

/**
 * Like queryDigitalOceanAI but also returns token usage data for metering.
 */
export const queryDigitalOceanAIWithUsage = async (
  prompt: string,
  retryCount: number = 2,
  jsonMode: boolean = false,
  maxTokens: number = 4000,
  model?: SupportedAiModel | string | null,
): Promise<AiResponse> => {
  const agentOverride = resolveAgentOverride(model);
  logger.info(`[DigitalOcean AI] Processing prompt (${prompt.length} chars) via ${agentOverride ? model : 'shared gpt-oss-120b agent'}`);

  for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
    try {
      logger.info(`[DigitalOcean AI] Attempt ${attempt} of ${retryCount + 1}`);
      const result = await callDigitalOceanAgent(prompt, jsonMode, maxTokens, agentOverride);

      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Empty response');
      }

      // jsonMode is a request, not a guarantee — a smaller/weaker model can
      // still ignore it and return prose, a truncated object, or JSON
      // wrapped in commentary. Observed directly on gpt-oss-20b: identical
      // prompt, one attempt returned malformed output, a retry returned
      // clean JSON — non-deterministic, not something a single attempt can
      // catch. Treating it as a failed attempt lets it use the exact same
      // retry/backoff loop as an empty response or network error, instead
      // of silently handing the caller text that will fail to parse further
      // down (interview pack's parseStageJson, ai-vetting's
      // parseClassificationResponse, etc.).
      if (jsonMode && !looksLikeParseableJson(result.text)) {
        throw new Error('Response did not contain valid JSON (jsonMode requested)');
      }

      logger.info(`[DigitalOcean AI] Success on attempt ${attempt} — ${result.usage.total_tokens} tokens`);
      return result;
    } catch (error: any) {
      logger.warn(`[DigitalOcean AI] Attempt ${attempt} failed:`, error.message);

      // A timeout means the request was fundamentally too slow for the
      // window it was given — retrying the identical prompt against the
      // same slow endpoint is very unlikely to finish faster, and doing it
      // 3x just turns a ~1-3min failure into a 6+min one with no feedback
      // to the caller in the meantime. Fail immediately instead.
      if (error.isTimeout) {
        logger.error(`[DigitalOcean AI] Timed out on attempt ${attempt} — not retrying`);
        throw new Error(`Digital Ocean AI timed out: ${error.message}`);
      }

      if (attempt === retryCount + 1) {
        logger.error('[DigitalOcean AI] All attempts failed');
        throw new Error(`Failed after ${retryCount + 1} attempts: ${error.message}`);
      }

      const delay = Math.pow(2, attempt - 1) * 1000;
      logger.info(`[DigitalOcean AI] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to get response from Digital Ocean AI');
};

/**
 * Test function to verify the setup
 */
export const testDigitalOceanConnection = async (): Promise<{success: boolean; message: string; method?: string}> => {
  try {
    const testPrompt = 'Respond with "OK" to confirm connection.';

    // Try agent client first
    if (agentClient && agentClient.agents) {
      try {
        const response = await agentClient.agents.chat.completions.create({
          messages: [{ role: 'user', content: testPrompt }],
          model: 'llama3.3-70b-instruct',
          max_tokens: 10,
        });

        if (response?.choices?.[0]?.message?.content?.toLowerCase().includes('ok')) {
          return { success: true, message: 'Agent client connected', method: 'agent' };
        }
      } catch (error) {
        logger.warn('Agent client test failed:', error);
      }
    }

    // Try direct API as fallback
    const response = await queryDigitalOceanAI(testPrompt, 0);
    if (response.toLowerCase().includes('ok')) {
      return { success: true, message: 'Direct API connected', method: 'direct' };
    }

    return { success: false, message: 'Connection test failed' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Log configuration (without secrets)
 */
export const logConfig = (): void => {
  logger.info('[DigitalOcean AI] Configuration check:');
  logger.info('- Agent endpoint configured:', !!GRADIENT_AGENT_ENDPOINT);
  logger.info('- Access token configured:', !!GRADIENT_ACCESS_TOKEN);
  logger.info('- Agent access key configured:', !!GRADIENT_AGENT_ACCESS_KEY);
  logger.info('- Agent client available:', !!agentClient);
  logger.info('- API client available:', !!apiClient);
  logger.info('- Dedicated agents configured:', Object.keys(DEDICATED_AGENTS).join(', ') || 'none');
};

// --- Gradient Agent Client (replica of frontend gradientClient.ts) ---

type GradientMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Calls the Gradient Agent directly via API (similar to frontend implementation)
 * @param messages - Array of messages to send to the agent
 * @param sessionId - Optional session ID for conversation tracking
 * @returns The response from the Gradient Agent
 */
export async function callGradientAgent(
  messages: GradientMessage[],
  sessionId?: string
) {
  if (!GRADIENT_AGENT_ENDPOINT || !GRADIENT_AGENT_ACCESS_KEY) {
    throw new Error('Missing Gradient Agent configuration (GRADIENT_AGENT_ENDPOINT or GRADIENT_AGENT_ACCESS_KEY)');
  }

  logger.info('[GradientAgent] Calling Gradient Agent at:', GRADIENT_AGENT_ENDPOINT);

  try {
    const res = await fetch(`${GRADIENT_AGENT_ENDPOINT}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GRADIENT_AGENT_ACCESS_KEY}`
      },
      body: JSON.stringify({
        messages
      })
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error('[GradientAgent] Error Response:', text);
      throw new Error(`Gradient error ${res.status}: ${text}`);
    }

    const data = await res.json();
    logger.info('[GradientAgent] Successfully received response');
    return data;
  } catch (error: any) {
    logger.error('[GradientAgent] Failed to call Gradient Agent:', error.message);
    throw error;
  }
}

/**
 * Simplified function to send a single prompt to Gradient Agent
 * @param prompt - The prompt text to send
 * @param sessionId - Optional session ID for conversation tracking
 * @returns The response content from the agent
 */
export async function sendToGradientAgent(prompt: string, sessionId?: string): Promise<string> {
  const messages: GradientMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await callGradientAgent(messages, sessionId);

  // Extract the content from the response
  if (response.choices && response.choices[0] && response.choices[0].message) {
    return response.choices[0].message.content || '';
  }

  throw new Error('Unexpected response format from Gradient Agent');
}
