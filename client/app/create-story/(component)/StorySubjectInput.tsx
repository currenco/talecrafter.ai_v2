"use client";
import type { StorySelectionProps } from "@/types/story";

const StorySubjectInput = ({ userSelection }: StorySelectionProps) => {
  return (
    <div>
      <label
        htmlFor="story-subject"
        className="block w-full font-serif text-3xl font-medium tracking-tight text-[#f1eadb] sm:text-4xl"
      >
        Begin with an idea
      </label>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c3cbd4]/65 sm:text-base">
        Describe a character, a place, or a moment. A few thoughtful details are
        enough to shape an entire story.
      </p>
      <textarea
        id="story-subject"
        className="mt-6 min-h-40 w-full resize-y rounded-2xl border border-[#d8c69e]/20 bg-[#0b1522]/80 px-5 py-4 text-lg leading-8 text-[#f1eadb] outline-none transition placeholder:text-[#c3cbd4]/35 focus:border-[#d8c69e]/60 focus:ring-2 focus:ring-[#d8c69e]/15"
        placeholder="A young cartographer discovers a map whose islands move beneath the moonlight..."
        onChange={(e) =>
          userSelection({
            fieldValue: e.target.value,
            fieldName: "storySubject",
          })
        }
      />
    </div>
  );
};

export default StorySubjectInput;
