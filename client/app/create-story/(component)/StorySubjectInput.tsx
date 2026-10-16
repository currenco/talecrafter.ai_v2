"use client";
import type { StorySelectionProps } from "@/types/story";

const StorySubjectInput = ({ userSelection }: StorySelectionProps) => {
  return (
    <div>
      <label
        htmlFor="story-subject"
        className="block w-full font-serif text-xl font-medium leading-snug tracking-normal text-[#f1eadb] sm:text-2xl lg:text-3xl"
      >
        Begin with an idea
      </label>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c3cbd4]/65 sm:text-base">
        Describe a character, a place, or a moment. A few thoughtful details are
        enough to shape an entire story.
      </p>
      <textarea
        id="story-subject"
        className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-[#d8c69e]/20 bg-[#0b1522]/80 px-3 py-3 text-base leading-6 text-[#f1eadb] outline-none transition placeholder:text-[#c3cbd4]/35 focus:border-[#d8c69e]/60 focus:ring-2 focus:ring-[#d8c69e]/15 sm:mt-6 sm:px-5 sm:py-4 sm:leading-7"
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
