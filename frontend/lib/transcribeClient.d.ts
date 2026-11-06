export function postTranscribe(options: {
  url: string
  apiKey?: string
  payload: unknown
  timeoutMs?: number
  sleepMs?: number
  fetchImpl?: typeof fetch
  sleepImpl?: (ms: number) => Promise<unknown>
}): Promise<{ text: string }>
