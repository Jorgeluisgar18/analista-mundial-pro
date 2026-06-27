interface TheSportsDbConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

interface EventsByDayResponse {
  events: unknown[] | null;
}

export class TheSportsDbClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: TheSportsDbConfig) {
    this.fetcher = config.fetcher ?? fetch;
  }

  async request<T>(endpoint: string, params: Record<string, string>) {
    const url = new URL(
      `${this.config.baseUrl}/${this.config.apiKey}/${endpoint}`,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetcher(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (response.status === 429) {
      throw new Error("TheSportsDB rate limit reached");
    }
    if (!response.ok) {
      throw new Error(`TheSportsDB request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async eventsByDay(date: string) {
    const body = await this.request<EventsByDayResponse>("eventsday.php", {
      d: date,
      s: "Soccer",
    });
    return body.events ?? [];
  }
}
