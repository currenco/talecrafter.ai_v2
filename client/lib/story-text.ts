import type { StoryChapter } from "@/types/story";

export const getCleanChapterText = (chapter: StoryChapter) => {
  const text = chapter?.textPrompt ?? "";
  const promptPrefix = chapter?.imagePrompt?.substring(0, 20);
  return (promptPrefix ? text.split(promptPrefix)[0] : text)
    .replace(/\{[^}]*\}/g, "")
    .replace(
      /(Water ?Color|Watercolor|Anime( style)?|3D ?Cartoon|Oil (Paint|painting)|Comic( book)?|Paper ?Cut|Papercut|Pixel ?Art)[\s\S]*/i,
      ""
    )
    .trim();
};
