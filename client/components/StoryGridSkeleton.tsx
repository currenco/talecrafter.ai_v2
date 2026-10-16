import styles from "./StoryGridSkeleton.module.css";

export default function StoryGridSkeleton({ isLoading, count = 12 }: { isLoading: boolean; count?: number }) {
  if (!isLoading) return null;
  return (
    <div role="status" aria-label="Loading stories" className="mt-4">
      <span className="sr-only">Loading stories</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={`${styles.card} relative h-[200px] overflow-hidden rounded-lg border border-[#d8c69e]/15 bg-[#172535]`}>
            <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-4 bg-[#111d2b] px-3">
              <div className="h-4 w-3/5 rounded bg-white/10" />
              <div className="h-7 w-12 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
