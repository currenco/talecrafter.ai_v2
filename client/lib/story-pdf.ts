export type StoryPdfContent = {
  title: string;
  cover?: string | null;
  scenes: { title?: string; text: string; image: string }[];
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, styles: Partial<CSSStyleDeclaration>, text?: string) {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text) node.textContent = text;
  return node;
}

async function loadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load a story illustration");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Invalid illustration");
  const source = URL.createObjectURL(blob);
  const image = new Image();
  image.src = source;
  try { await image.decode(); } catch (error) { URL.revokeObjectURL(source); throw error; }
  return image;
}

/** Fixed-size print pages, independent of reader theme and viewport. Caller removes root. */
export async function createStoryPdfDocument(content: StoryPdfContent) {
  if (!content.scenes.length) throw new Error("This story has no pages to export");
  const root = element("div", { position: "fixed", left: "-10000px", top: "0", width: `${PAGE_WIDTH}px`, pointerEvents: "none", background: "white" });
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  const sources: string[] = [];
  const cleanup = () => { root.remove(); sources.forEach(source => URL.revokeObjectURL(source)); };
  const page = () => {
    const node = element("section", { position: "relative", width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, boxSizing: "border-box", background: "#ffffff", color: "#252c30", overflow: "hidden" });
    root.appendChild(node);
    return node;
  };
  let pageNumber = 0;
  const interior = () => {
    const sheet = page();
    const body = element("article", { position: "absolute", top: "54px", left: "56px", width: "682px", height: "960px", overflow: "hidden", boxSizing: "border-box" });
    const footer = element("footer", { position: "absolute", bottom: "43px", left: "56px", width: "682px", paddingTop: "13px", borderTop: "1px solid #dce0e1", display: "flex", justifyContent: "space-between", gap: "24px", fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#687277" });
    const label = element("span", { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "620px" }, content.title);
    footer.append(label, element("span", {}, String(++pageNumber)));
    sheet.append(body, footer);
    return body;
  };
  try {
    await document.fonts.ready;
    if (content.cover) {
      const cover = await loadImage(content.cover);
      sources.push(cover.src);
      Object.assign(cover.style, { display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" });
      cover.alt = "";
      page().appendChild(cover);
    } else {
      const cover = page();
      cover.appendChild(element("h1", { position: "absolute", top: "35%", left: "56px", width: "682px", margin: "0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "52px", lineHeight: "1.15", overflowWrap: "anywhere", fontWeight: "normal" }, content.title));
    }
    for (const scene of content.scenes) {
      let body = interior();
      const illustration = await loadImage(scene.image);
      sources.push(illustration.src);
      illustration.alt = "";
      const imageHeight = Math.min(682, 682 * illustration.naturalHeight / illustration.naturalWidth);
      Object.assign(illustration.style, { display: "block", width: "100%", height: `${imageHeight}px`, objectFit: "contain", objectPosition: "center", marginBottom: "30px" });
      body.appendChild(illustration);
      if (scene.title?.trim()) body.appendChild(element("h2", { margin: "0 0 16px", fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: "normal", fontSize: "32px", lineHeight: "1.2", overflowWrap: "anywhere" }, scene.title.trim()));
      // Reserve readable prose space even when an unusually long title wraps.
      const heading = body.querySelector("h2");
      if (heading && heading.offsetHeight > 80) illustration.style.height = `${Math.max(340, imageHeight - heading.offsetHeight + 40)}px`;
      let remaining = Array.from(scene.text.trim());
      while (remaining.length) {
        const paragraph = element("p", { margin: "0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "19px", lineHeight: "1.65", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#303a3f" });
        body.appendChild(paragraph);
        let low = 0;
        let high = remaining.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          paragraph.textContent = remaining.slice(0, middle).join("");
          if (body.scrollHeight <= body.clientHeight) low = middle;
          else high = middle - 1;
        }
        if (low < remaining.length && low > 0) {
          const space = remaining.slice(0, low).lastIndexOf(" ");
          if (space > low / 2) low = space + 1;
        }
        paragraph.textContent = remaining.slice(0, low).join("");
        if (!low) paragraph.remove();
        remaining = remaining.slice(low);
        if (remaining.length) body = interior();
      }
    }
    return { root, cleanup };
  } catch (error) { cleanup(); throw error; }
}

export async function downloadStoryPdf(content: StoryPdfContent) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const { root, cleanup } = await createStoryPdfDocument(content);
  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: content.title, creator: "TaleCrafter AI" });
    for (const [index, sheet] of Array.from(root.children).entries()) {
      const canvas = await html2canvas(sheet as HTMLElement, { scale: 2, backgroundColor: "#ffffff", logging: false, width: PAGE_WIDTH, height: PAGE_HEIGHT, windowWidth: PAGE_WIDTH, scrollX: 0, scrollY: 0 });
      if (index) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
    }
    pdf.save(`${content.title.replace(/[^\w\s-]/g, "").trim() || "story"}.pdf`);
  } finally { cleanup(); }
}
