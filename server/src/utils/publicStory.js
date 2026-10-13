export const publicStory = story => {
  if (!story?.output) return story;
  return {
    ...story,
    output: {
      title: story.output.title,
      chapters: (story.output.chapters ?? []).map(chapter => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        textPrompt: chapter.textPrompt,
        imageUrl: chapter.imageUrl,
      })),
    },
  };
};
