export class ApiError extends Error {
  status: number
  payload?: any

  constructor(message: string, status: number, payload?: any) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)

  if (!response.ok) {
    let payload: any = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    const message = payload?.error || response.statusText || "Error de red"
    throw new ApiError(message, response.status, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
