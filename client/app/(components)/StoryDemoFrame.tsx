import Image from "next/image";

type StoryDemoFrameProps = {
  alt: string;
  sizes: string;
  priority?: boolean;
};

const StoryDemoFrame = ({ alt, sizes, priority = false }: StoryDemoFrameProps) => (
  <div className="overflow-hidden rounded-[2rem] border border-[#d8c69e]/25 bg-[#111d2b] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.38)] sm:p-3">
    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[#d8c69e]" />
        <span className="h-2 w-2 rounded-full bg-[#9f8d68]" />
        <span className="h-2 w-2 rounded-full bg-[#435b75]" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8c69e] sm:text-xs">
        TaleCrafter reader
      </p>
    </div>

    <div className="overflow-hidden rounded-[1.4rem] border border-[#d8c69e]/20 bg-[#0b1522]">
      <Image
        src="/demo-themed.png"
        alt={alt}
        width={1305}
        height={1205}
        sizes={sizes}
        className="h-auto w-full"
        priority={priority}
      />
    </div>
  </div>
);

export default StoryDemoFrame;
