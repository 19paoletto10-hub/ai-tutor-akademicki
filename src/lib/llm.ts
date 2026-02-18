/**
 * Custom LLM wrapper that replaces window.spark.llm() with configurable
 * max_tokens, timeout, retry logic, and finish_reason detection.
 *
 * Main fix: spark-tools hardcodes max_tokens: 1000 which truncates responses.
 */

const MODEL_FIXES: Record<string, string> = {
  'ai21-jamba-instruct': 'ai21-labs/ai21-jamba-instruct',
  'cohere-command-r-plus': 'cohere/cohere-command-r-plus',
  'cohere-command-r': 'cohere/cohere-command-r',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o': 'openai/gpt-4o',
  'meta-llama-3.1-405b-instruct': 'meta/meta-llama-3.1-405b-instruct',
  'meta-llama-3.1-70b-instruct': 'meta/meta-llama-3.1-70b-instruct',
  'meta-llama-3.1-8b-instruct': 'meta/meta-llama-3.1-8b-instruct',
  'meta-llama-3-70b-instruct': 'meta/meta-llama-3-70b-instruct',
  'meta-llama-3-8b-instruct': 'meta/meta-llama-3-8b-instruct',
  'mistral-large-2407': 'mistral-ai/mistral-large-2407',
  'mistral-large': 'mistral-ai/mistral-large',
  'mistral-nemo': 'mistral-ai/mistral-nemo',
  'mistral-small': 'mistral-ai/mistral-small',
  'phi-3-medium-128K-instruct': 'microsoft/phi-3-medium-128K-instruct',
  'phi-3-medium-4K-instruct': 'microsoft/phi-3-medium-4K-instruct',
  'phi-3-mini-128K-instruct': 'microsoft/phi-3-mini-128K-instruct',
  'phi-3-mini-4K-instruct': 'microsoft/phi-3-mini-4K-instruct',
  'phi-3-small-128K-instruct': 'microsoft/phi-3-small-128K-instruct',
  'phi-3-small-8K-instruct': 'microsoft/phi-3-small-8K-instruct',
}

function fixModelName(modelName?: string): string {
  if (!modelName) return 'openai/gpt-4o'
  return MODEL_FIXES[modelName] || modelName
}

export interface LlmOptions {
  maxTokens?: number
  jsonMode?: boolean
  timeoutMs?: number
  maxRetries?: number
  /** If true, automatically continue when response is truncated (finish_reason: "length") */
  autoContinue?: boolean
}

export interface LlmResult {
  content: string
  wasComplete: boolean
  finishReason: string
}

export class LlmError extends Error {
  public readonly statusCode?: number
  public readonly errorType: 'timeout' | 'rate-limit' | 'server-error' | 'network' | 'unknown'

  constructor(message: string, errorType: LlmError['errorType'], statusCode?: number) {
    super(message)
    this.name = 'LlmError'
    this.errorType = errorType
    this.statusCode = statusCode
  }
}

/**
 * Get a user-friendly error message in Polish based on error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof LlmError) {
    switch (error.errorType) {
      case 'timeout':
        return 'Odpowiedź trwała zbyt długo. Spróbuj ponownie lub zadaj krótsze pytanie.'
      case 'rate-limit':
        return 'Zbyt wiele zapytań — poczekaj chwilę i spróbuj ponownie.'
      case 'server-error':
        return 'Problem z serwerem AI. Spróbuj ponownie za chwilę.'
      case 'network':
        return 'Błąd połączenia — sprawdź połączenie z internetem i spróbuj ponownie.'
      default:
        return 'Przepraszam, wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
    }
  }
  return 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi. Spróbuj ponownie.'
}

async function fetchLlm(
  prompt: string,
  modelName: string,
  maxTokens: number,
  jsonMode: boolean,
  timeoutMs: number,
): Promise<{ content: string; finishReason: string }> {
  const tidiedModelName = fixModelName(modelName)
  const response_format = { type: jsonMode ? 'json_object' : 'text' }

  const body = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 1.0,
    top_p: 1.0,
    max_tokens: maxTokens,
    model: tidiedModelName,
    response_format,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('/_spark/llm', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      if (response.status === 429) {
        throw new LlmError(
          `Rate limit: ${response.status} - ${errorText}`,
          'rate-limit',
          response.status,
        )
      }
      if (response.status >= 500) {
        throw new LlmError(
          `Server error: ${response.status} - ${errorText}`,
          'server-error',
          response.status,
        )
      }
      throw new LlmError(
        `LLM request failed: ${response.status} ${response.statusText} - ${errorText}`,
        'unknown',
        response.status,
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const finishReason = data.choices?.[0]?.finish_reason ?? 'unknown'

    return { content, finishReason }
  } catch (error) {
    if (error instanceof LlmError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LlmError('Request timed out', 'timeout')
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new LlmError('Network error', 'network')
    }
    throw new LlmError(
      error instanceof Error ? error.message : 'Unknown error',
      'unknown',
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRetry(
  prompt: string,
  modelName: string,
  maxTokens: number,
  jsonMode: boolean,
  timeoutMs: number,
  maxRetries: number,
): Promise<{ content: string; finishReason: string }> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchLlm(prompt, modelName, maxTokens, jsonMode, timeoutMs)
    } catch (error) {
      lastError = error
      if (error instanceof LlmError) {
        // Only retry on rate-limit or server errors
        if (error.errorType === 'rate-limit' || error.errorType === 'server-error') {
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
        }
      }
      throw error
    }
  }

  throw lastError
}

/**
 * Main LLM call function — replacement for window.spark.llm().
 *
 * Key differences from spark.llm:
 * - Configurable max_tokens (default 2048 instead of 1000)
 * - Timeout via AbortController (default 90s)
 * - Retry with exponential backoff on 429/5xx
 * - Auto-continue on finish_reason: "length" (up to 1 continuation)
 * - Returns { content, wasComplete } instead of just string
 */
export async function llm(
  prompt: string,
  modelName: string = 'gpt-4o',
  options: LlmOptions = {},
): Promise<LlmResult> {
  const {
    maxTokens = 2048,
    jsonMode = false,
    timeoutMs = 90_000,
    maxRetries = 2,
    autoContinue = true,
  } = options

  const result = await fetchWithRetry(prompt, modelName, maxTokens, jsonMode, timeoutMs, maxRetries)

  // If response was truncated and auto-continue is enabled, request continuation
  if (result.finishReason === 'length' && autoContinue && !jsonMode) {
    try {
      const lastChunk = result.content.slice(-300)
      const continuationPrompt = `${prompt}

[KONTYNUACJA — Twoja poprzednia odpowiedź została przerwana. Oto jej końcówka:]
"""
${lastChunk}
"""

Kontynuuj DOKŁADNIE od miejsca przerwania. NIE powtarzaj tego co już napisałeś. Dokończ odpowiedź i zakończ ją kompletnie.`

      const continuation = await fetchWithRetry(
        continuationPrompt,
        modelName,
        maxTokens,
        jsonMode,
        timeoutMs,
        maxRetries,
      )

      return {
        content: result.content + continuation.content,
        wasComplete: continuation.finishReason === 'stop',
        finishReason: continuation.finishReason,
      }
    } catch (continuationError) {
      // If continuation fails, return original truncated result with a note
      console.warn('LLM continuation failed:', continuationError)
      return {
        content: result.content + '\n\n---\n*Chcesz, żebym rozwinął dalej? Wpisz "kontynuuj".*',
        wasComplete: false,
        finishReason: result.finishReason,
      }
    }
  }

  return {
    content: result.content,
    wasComplete: result.finishReason === 'stop' || result.finishReason === 'unknown',
    finishReason: result.finishReason,
  }
}

/**
 * Simple string-returning wrapper for backward compat.
 * Use this for short responses (validators, quiz eval) where you don't need completion detection.
 */
export async function llmSimple(
  prompt: string,
  modelName: string = 'gpt-4o',
  options: LlmOptions = {},
): Promise<string> {
  const result = await llm(prompt, modelName, { autoContinue: false, ...options })
  return result.content
}
