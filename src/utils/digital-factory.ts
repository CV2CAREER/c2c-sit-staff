// --- Digital Ocean Gradient Configuration ---

import { GRADIENT_ACCESS_TOKEN, GRADIENT_AGENT_ACCESS_KEY, GRADIENT_AGENT_ENDPOINT } from "../config/env";
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

/**
 * Calls the Digital Ocean AI Agent using SDK (like Python code)
 */
const callDigitalOceanAgent = async (prompt: string): Promise<string> => {
  logger.info(`[DigitalOcean AI] Using agent client with endpoint: ${GRADIENT_AGENT_ENDPOINT}`);
  
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
          model: 'llama3.3-70b-instruct',
          temperature: 0.7,
          max_tokens: 4000,
        });
        
        const endTime = Date.now();
        logger.info(`[DigitalOcean AI] Agent responded in ${endTime - startTime}ms`);
        
        if (agentResponse && agentResponse.choices && agentResponse.choices[0]) {
          return agentResponse.choices[0].message.content || '';
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
          model: 'llama3.3-70b-instruct',
          temperature: 0.7,
          max_tokens: 4000,
        });
        
        const endTime = Date.now();
        logger.info(`[DigitalOcean AI] Serverless responded in ${endTime - startTime}ms`);
        
        if (inferenceResponse && inferenceResponse.choices && inferenceResponse.choices[0]) {
          return inferenceResponse.choices[0].message.content || '';
        }
      } catch (inferenceError: any) {
        logger.warn(`[DigitalOcean AI] Serverless SDK error: ${inferenceError.message.substring(0, 100)}`);
      }
    }
    
    // METHOD 3: Fallback to direct API (final fallback)
    logger.info('[DigitalOcean AI] SDK methods failed, trying direct API...');
    return await directApiFallback(prompt, startTime);
    
  } catch (error: any) {
    logger.error(`[DigitalOcean AI] All methods failed:`, error.message);
    throw error;
  }
};

/**
 * Direct API fallback (like Python's _direct_api_fallback)
 */
const directApiFallback = async (prompt: string, startTime: number): Promise<string> => {
  try {
    const headers = {
      'Authorization': `Bearer ${GRADIENT_AGENT_ACCESS_KEY}`,
      'Content-Type': 'application/json',
    };
    
    const payload = {
      messages: [{
        role: 'user',
        content: prompt
      }],
      model: 'llama3.3-70b-instruct',
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
    };
    
    // Use the full API endpoint path
    const apiUrl = `${GRADIENT_AGENT_ENDPOINT}/api/v1/chat/completions`;
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
      return data.choices[0].message.content;
    }
    
    throw new Error('Unexpected response format from direct API');
    
  } catch (error: any) {
    logger.error('[DigitalOcean AI] Direct API fallback failed:', error.message);
    throw error;
  }
};

/**
 * Queries Digital Ocean AI with retry logic
 */
export const queryDigitalOceanAI = async (prompt: string, retryCount: number = 2): Promise<string> => {
  logger.info(`[DigitalOcean AI] Processing prompt (${prompt.length} chars)`);
  
  for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
    try {
      logger.info(`[DigitalOcean AI] Attempt ${attempt} of ${retryCount + 1}`);
      const result = await callDigitalOceanAgent(prompt);
      
      if (!result || result.trim().length === 0) {
        throw new Error('Empty response');
      }
      
      logger.info(`[DigitalOcean AI] Success on attempt ${attempt}`);
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
