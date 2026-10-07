export default function StoryRouteLoading() {
  return (
    <main
      className="min-h-screen bg-[#0b1522] px-5 py-8 md:px-16 lg:px-28 xl:px-40"
      aria-busy="true"
    >
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="mx-auto h-10 w-3/4 max-w-2xl rounded bg-[#d8c69e]/15" />
        <div className="mx-auto mt-5 h-4 w-full max-w-3xl rounded bg-[#c3cbd4]/10" />
        <div className="mx-auto mt-3 h-4 w-2/3 max-w-2xl rounded bg-[#c3cbd4]/10" />
        <div className="mt-10 aspect-[16/10] w-full rounded-lg border border-[#d8c69e]/15 bg-[#111d2b]" />
      </div>
      <p className="sr-only" role="status">
        Loading story
      </p>
    </main>
  );
}
