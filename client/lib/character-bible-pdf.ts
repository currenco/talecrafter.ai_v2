import { characterBibleSections, type CharacterBiblePack } from "./character-bible-content";

// Built-in PDF fonts cannot encode other scripts. Browser printing preserves
// their shaping and selectable text instead of replacing missing glyphs.
export function needsBrowserPdf(text: string) {
  return /[^\u0020-\u007e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/u.test(text.replace(/[\t\r\n]/g, ""));
}

async function printCharacterBible(pack: CharacterBiblePack) {
  const frame = document.createElement("iframe");
  frame.title = "Character bible PDF";
  Object.assign(frame.style, { position: "fixed", left: "-10000px", width: "794px", height: "1123px" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); throw new Error("Could not open PDF preview"); }
  doc.title = `${pack.title || "Story"} - Character Bible`;
  const style = doc.createElement("style");
  style.textContent = "@page{size:A4;margin:20mm}body{font:11pt/1.6 Arial,sans-serif;color:#17212b}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 10pt}h2{font-size:15pt;break-after:avoid;margin:14pt 0 8pt}";
  doc.head.appendChild(style);
  for (const section of characterBibleSections(pack)) {
    const element = doc.createElement(section.heading ? "h2" : "p");
    element.textContent = section.text;
    doc.body.appendChild(element);
  }
  await doc.fonts.ready;
  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup, { once: true });
  // Keep the frame alive for browsers whose print dialog opens asynchronously.
  window.setTimeout(cleanup, 300_000);
  win.focus();
  win.print();
}

export async function downloadCharacterBible(pack: CharacterBiblePack): Promise<"download" | "print"> {
  const sections = characterBibleSections(pack);
  if (sections.some(section => needsBrowserPdf(section.text))) {
    await printCharacterBible(pack);
    return "print";
  }
  const pdf = await createCharacterBiblePdf(pack);
  pdf.save(`${(pack.title || "story").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80)}-character-bible.pdf`);
  return "download";
}

export async function createCharacterBiblePdf(pack: CharacterBiblePack) {
  const sections = characterBibleSections(pack);
  if (sections.some(section => needsBrowserPdf(section.text))) throw new Error("This story requires browser PDF printing");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setProperties({ title: `${pack.title || "Story"} - Character Bible`, creator: "TaleCrafter AI" });
  let y = 22;
  for (const section of sections) {
    const size = section.heading ? 15 : 11;
    const lineHeight = section.heading ? 7 : 5.8;
    pdf.setFont("helvetica", section.heading ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(23, 33, 43);
    const lines: string[] = pdf.splitTextToSize(section.text, 170);
    if (section.heading && y + lineHeight * 2 > 272) { pdf.addPage(); y = 22; }
    for (const line of lines) {
      if (y + lineHeight > 277) { pdf.addPage(); y = 22; }
      pdf.text(line, 20, y);
      y += lineHeight;
    }
    y += section.heading ? 3 : 5;
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(82, 96, 109);
    pdf.text(`TaleCrafter AI | Character Bible | ${page} / ${pages}`, 20, 287);
  }
  return pdf;
}
