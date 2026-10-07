"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type DeferredVideoProps = {
  src: string;
  poster: string;
  label: string;
  className?: string;
};

export default function DeferredVideo({
  src,
  poster,
  label,
  className,
}: DeferredVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || shouldLoad || reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion, shouldLoad]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={shouldLoad && !reducedMotion}
      muted
      loop={!reducedMotion}
      playsInline
      preload="none"
      poster={poster}
      aria-label={label}
    >
      {shouldLoad ? <source src={src} type="video/mp4" /> : null}
    </video>
  );
}
