import styles from "./StoryGridSkeleton.module.css";

export function StoryBookSkeleton() {
  return (
    <div role="status" aria-label="Loading story pages" aria-busy="true" className={`relative mx-auto h-[620px] w-[330px] max-w-full overflow-hidden rounded-lg bg-white/10 ${styles.card}`} />
  );
}

export default function StoryReaderSkeleton() {
  return (
    <div role="status" aria-label="Opening your story" aria-busy="true" className="min-h-screen bg-[#0b1522] px-5 py-8 md:px-16 lg:px-28 xl:px-40">
      <div aria-hidden="true" className={`tc-glass-panel relative overflow-hidden px-5 py-6 md:px-8 ${styles.card}`}>
        <div className="mx-auto h-10 w-3/4 rounded bg-white/10 sm:h-12 md:h-[60px]" />
        <div className="mx-auto mt-4 h-5 w-full max-w-4xl rounded bg-white/10" />
        <div className="mx-auto mt-2 h-5 w-2/3 rounded bg-white/10" />
      </div>
      <div className="mt-8">
        <StoryBookSkeleton />
      </div>
    </div>
  );
}
