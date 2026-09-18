"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const Video = () => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const video = ref.current;
        if (video) video.load();
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
          See the workflow
        </p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
          From setup to storybook in one place.
        </h2>
        <p className="mt-5 text-lg leading-8 text-blue-100/70">
          Watch how an idea becomes a configured, illustrated story ready to read.
        </p>
      </div>
      <div className="mt-12 w-full">
        <div className="relative overflow-hidden rounded-lg border border-blue-300/20 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
          <video
            ref={ref}
            preload="none"
            muted
            playsInline
            autoPlay
            loop
            controls
            poster="/demo.png"
            width="100%"
            height="auto"
          >
            <source src="/App_Demo_Video.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(Video), { ssr: false });
