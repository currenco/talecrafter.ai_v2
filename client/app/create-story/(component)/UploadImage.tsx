"use client";

import { useState } from "react";
import Image from "next/image";
import { getAccessToken } from "@/lib/neon-auth/client";
import { apiFetch } from "@/lib/api-client";

export default function UploadImage({
  setImageSubject,
}: {
  setImageSubject: (text: string) => void;
}) {
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const identifyImage = async () => {
    if (!image) return;

    setLoading(true);

    try {
      const imageBase64 = await fileToBase64(image);
      const token = await getAccessToken();
      const data = await apiFetch<{ text: string }>("/ai/gemini", {
        method: "POST",
        token,
        body: JSON.stringify({
          mode: "image-analysis",
          prompt:
            "Analyze this image and give me a short story idea description int 30 to 50 words that can be generated based on the appearance of the image.",
          imageBase64,
          mimeType: image.type || "image/jpeg",
        }),
      });

      const text = String(data?.text ?? "")
        .trim()
        .replace(/```/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/-\s*/g, "")
        .replace(/\n\s*\n/g, "\n");
      setResult(text);
      setImageSubject(text);
    } catch (error) {
      if (error instanceof Error) {
        setResult(`Error identifying image: ${error.message}`);
      } else {
        setResult("An unknown error occurred while identifying the image.");
      }
    } finally {
      setLoading(false);
    }
  };

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return (
    <section className="w-full">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c69e]">
            Or begin with an image
          </p>
          <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#f1eadb] sm:text-4xl">
            Let a picture inspire the premise
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c3cbd4]/65 sm:text-base">
            Upload a scene or character and TaleCrafter will turn its visual details
            into a starting idea you can build on.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#d8c69e]/30 bg-[#0b1522]/55 px-6 py-10">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
            <label
              htmlFor="image-upload"
              className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#d8c69e]/30 bg-[#d8c69e]/[0.08] px-6 py-3 text-sm font-semibold text-[#f1eadb] transition hover:bg-[#d8c69e]/15"
            >
              Choose Image
            </label>
            {image && (
              <p className="max-w-full truncate text-sm text-[#c3cbd4]/70">
                {image.name}
              </p>
            )}
          </div>
          {image && (
            <div className="mt-6 flex justify-center">
              <Image
                src={URL.createObjectURL(image)}
                alt="Uploaded image"
                width={300}
                height={300}
                className="aspect-square rounded-2xl border border-[#d8c69e]/20 object-cover shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => identifyImage()}
            disabled={!image || loading}
            className="mt-6 w-full rounded-full border border-[#e2d2ae] bg-gradient-to-br from-[#eee0c0] to-[#cbb789] px-6 py-3 text-base font-semibold text-[#101a28] transition hover:from-[#f5e8ca] hover:to-[#d8c69e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Identifying image..." : "Generate Idea"}
          </button>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-[#d8c69e]/15 bg-[#0b1522]/55 p-5">
            <h3 className="font-serif text-2xl font-medium text-[#f1eadb]">
              Suggested story idea
            </h3>
            <div className="prose prose-blue max-w-none">
              {result.split("\n").map((line, index) => {
                if (line.trim() !== "") {
                  return (
                    <p key={index} className="mt-3 leading-7 text-[#c3cbd4]/80">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
