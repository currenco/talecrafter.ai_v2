export type CharacterBiblePack = {
  title?: string;
  settings?: { subject?: string; genre?: string; ageGroup?: string; artStyle?: string; format?: string };
  characters: Record<string, unknown>;
  scenes: { title?: string; textPrompt?: unknown; imagePrompt?: string; animationDirection?: string }[];
};

function readable(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readable).filter(Boolean).join("\n");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ")}: ${readable(item)}`).join("\n");
  return value == null ? "" : String(value);
}

export function characterBibleSections(pack: CharacterBiblePack) {
  const sections: { text: string; heading?: boolean; role?: "title" | "section" | "label"; pageBreak?: boolean }[] = [];
  const add = (text: string, heading = false, role?: "title" | "section" | "label", pageBreak = false) => { if (text.trim()) sections.push({ text: text.trim(), heading, role, pageBreak }); };
  add(pack.title || "Story", true, "title");
  add("Character Bible", true, "section");
  add("Story settings", true, "label");
  const settings = pack.settings ?? {};
  for (const [label, value] of [["Story idea", settings.subject], ["Genre", settings.genre], ["Age group", settings.ageGroup], ["Art style", settings.artStyle], ["Story format", settings.format]]) {
    if (value) add(`${label}: ${value}`);
  }
  add("Character profiles", true, "section", true);
  for (const [name, description] of Object.entries(pack.characters ?? {})) {
    add(name.replace(/^character(\d+)$/i, "Character $1"), true, "label");
    add(readable(description));
  }
  for (const [index, scene] of (pack.scenes ?? []).entries()) {
    add(`Scene ${index + 1}${scene.title ? `: ${scene.title}` : ""}`, true, "section", true);
    if (readable(scene.textPrompt).trim()) add("Narration", true, "label");
    add(readable(scene.textPrompt));
    if (scene.imagePrompt) {
      add("Image prompt", true, "label");
      add(scene.imagePrompt.replace(/([\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, "$1 "));
    }
    if (scene.animationDirection?.trim()) {
      add("How to animate this scene", true, "label");
      add(scene.animationDirection);
    }
  }
  return sections;
}
