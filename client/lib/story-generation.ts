import { apiFetch, ApiClientError } from "@/lib/api-client";

export type StoryGenerationStatus = {
  storyId: string;
  slug: string;
  status: "draft" | "published" | "archived";
  generationStatus: "idle" | "running" | "succeeded" | "failed" | "cancelled";
  errorMessage: string | null;
  completedImages: number;
  totalImages: number;
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const waitUntilVisible = () => {
  if (document.visibilityState !== "hidden") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") return;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resolve();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
  });
};

export const waitForStoryPublication = async ({
  storyId,
  token,
  onProgress,
}: {
  storyId: string;
  token: string | null;
  onProgress?: (status: StoryGenerationStatus) => void;
}) => {
  const deadline = Date.now() + 10 * 60_000;
  let delay = 2000;
  while (Date.now() < deadline) {
    await waitUntilVisible();
    if (Date.now() >= deadline) break;
    let status: StoryGenerationStatus;
    try {
      status = await apiFetch<StoryGenerationStatus>(
        `/stories/me/${storyId}/status`,
        { token },
      );
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.statusCode !== 429)
        throw error;
      await wait(
        Math.min(
          error.retryAfterMs ?? 60_000,
          Math.max(0, deadline - Date.now()),
        ),
      );
      continue;
    }
    onProgress?.(status);

    if (status.status === "published") return status;
    if (["failed", "cancelled"].includes(status.generationStatus)) {
      throw new ApiClientError(
        status.errorMessage ||
          "Image generation stopped. The story remains in your drafts.",
        502,
      );
    }

    await wait(delay);
    delay = Math.min(10_000, Math.round(delay * 1.5));
  }

  throw new ApiClientError(
    "Image generation is still running. You can follow it from your dashboard.",
    408,
  );
};
