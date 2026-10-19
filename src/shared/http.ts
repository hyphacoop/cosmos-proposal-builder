const REQUEST_TIMEOUT_MS = 10_000;

// Fetch with a timeout, turning network failures into readable errors.
// `unreachable` is the message for failures other than a timeout, which browsers also use for CORS refusals.
export async function fetchWithTimeout(url: string, init: RequestInit, unreachable: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`${new URL(url).host} did not respond in time`, { cause: error });
    }
    throw new Error(unreachable, { cause: error });
  }
}
