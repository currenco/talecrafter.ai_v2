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

export const waitForStoryPublication = async ({
  storyId,
  token,
  onProgress,
}: {
  storyId: string;
  token: string | null;
  onProgress?: (status: StoryGenerationStatus) => void;
}) => {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const status = await apiFetch<StoryGenerationStatus>(
      `/stories/me/${storyId}/status`,
      { token },
    );
    onProgress?.(status);

    if (status.status === "published") return status;
    if (["failed", "cancelled"].includes(status.generationStatus)) {
      throw new ApiClientError(
        status.errorMessage ||
          "Image generation stopped. The story remains in your drafts.",
        502,
      );
    }

    await wait(1500);
  }

  throw new ApiClientError(
    "Image generation is still running. You can follow it from your dashboard.",
    408,
  );
};
