import { ApiClientError } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/user-messages";
import type { StoryRecord } from "@/lib/story-data";
import { refreshAccessToken } from "@/lib/neon-auth/client";

export type StoryGenerationStatus = {
  storyId: string;
  slug: string;
  status: "draft" | "published" | "archived";
  generationStatus: "idle" | "running" | "succeeded" | "failed" | "cancelled";
  errorMessage: string | null;
  errorCode?: string | null;
  completedImages: number;
  totalImages: number;
  content: Pick<StoryRecord, "storyId" | "slug" | "coverImage" | "output">;
};

// Reconnecting reads saved progress; it never starts another generation job.
export async function streamStoryProgress({ storyId, token, onProgress, signal }: {
  storyId: string;
  token: string | null;
  onProgress?: (status: StoryGenerationStatus) => void;
  signal?: AbortSignal;
}): Promise<StoryGenerationStatus> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 10 * 60_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const connect = (accessToken: string | null) => fetch(`/api/v1/stories/me/${encodeURIComponent(storyId)}/events`, {
      headers: { Accept: "text/event-stream", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      cache: "no-store", signal: controller.signal,
    });
    let response = await connect(token);
    if (response.status === 401 && token) {
      await response.body?.cancel();
      response = await connect(await refreshAccessToken());
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const code = payload?.errors?.[0]?.code;
      throw new ApiClientError(apiErrorMessage(payload?.message, response.status, code), response.status, undefined, code);
    }
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("Progress stream unavailable");
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (frame.startsWith(":")) continue;
        if (frame.includes("event: error")) throw new Error("Progress stream interrupted");
        const data = frame.split("\n").filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n");
        if (!data) continue;
        const progress = JSON.parse(data) as StoryGenerationStatus;
        onProgress?.(progress);
        if (progress.generationStatus !== "running") return progress;
      }
    }
    throw new Error("Progress stream ended before completion");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
    await reader?.cancel().catch(() => undefined);
    controller.abort();
  }
}

export async function waitForStoryPublication(options: Parameters<typeof streamStoryProgress>[0]) {
  const status = await streamStoryProgress(options);
  if (status.status === "published") return status;
  throw new ApiClientError(apiErrorMessage(status.errorMessage ?? undefined, 502, status.errorCode ?? undefined), 502, undefined, status.errorCode ?? undefined);
}
