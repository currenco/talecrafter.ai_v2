"use client";
import { useState } from "react";
import Image from "next/image";
import type { StorySelectionProps } from "@/types/story";

export interface OptionField {
  label: string;
  imageUrl: string;
  isFree: boolean;
}

const StoryType = ({ userSelection }: StorySelectionProps) => {
  const [selectedOption, setSelectedOption] = useState<string>();

  const onUserSelect = (item: OptionField) => {
    setSelectedOption(item.label);
    userSelection({
      fieldValue: item?.label,
      fieldName: "storyType",
    });
  };

  const OptionList = [
    {
      label: "Mythology",
      imageUrl: "/genre/mythology.webp",
      isFree: true,
    },
    {
      label: "Sci-fi",
      imageUrl: "/genre/sci-fi.webp",
      isFree: true,
    },
    {
      label: "Educational",
      imageUrl: "/genre/educational.webp",
      isFree: true,
    },
    {
      label: "History",
      imageUrl: "/genre/history.webp",
      isFree: true,
    },
    {
      label: "Fantasy",
      imageUrl: "/genre/fantasy.webp",
      isFree: true,
    },
    {
      label: "Crime",
      imageUrl: "/genre/crime.webp",
      isFree: true,
    },
    {
      label: "Motivational",
      imageUrl: "/genre/motivational.webp",
      isFree: true,
    },
    {
      label: "Horror",
      imageUrl: "/genre/horror.webp",
      isFree: true,
    },
    {
      label: "Romantic",
      imageUrl: "/genre/romantic.webp",
      isFree: true,
    },
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c69e]">
        Shape the narrative
      </p>
      <h2 className="mt-3 block w-full font-serif text-3xl font-medium tracking-tight text-[#f1eadb] sm:text-4xl">
        Choose a story genre
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#c3cbd4]/65 sm:text-base">
        Your genre guides the story&apos;s mood, pace, and imaginative world.
      </p>
      <div className="hsb mt-7 overflow-x-auto whitespace-nowrap pb-3">
        {OptionList.map((item) => (
          <button
            type="button"
            key={item.label}
            aria-pressed={selectedOption === item.label}
            className={`relative m-1 inline-flex w-[116px] cursor-pointer flex-col rounded-[1.4rem] border p-1.5 text-left transition sm:m-2 sm:w-[190px] ${
              selectedOption === item.label
                ? "border-[#d8c69e] bg-[#d8c69e]/10 shadow-[0_0_0_3px_rgba(216,198,158,0.08)]"
                : "border-[#d8c69e]/10 bg-[#0b1522]/45 hover:border-[#d8c69e]/35 hover:bg-[#d8c69e]/[0.05]"
            }`}
            onClick={() => onUserSelect(item)}
          >
            <Image
              src={item.imageUrl}
              alt={item.label}
              width={768}
              height={768}
              sizes="(max-width: 639px) 100px, 200px"
              className="aspect-square w-full rounded-[1.1rem] object-cover"
            />
            <span className="block w-full px-2 py-3 text-center text-sm font-semibold text-[#eee7d9] sm:text-base">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoryType;
