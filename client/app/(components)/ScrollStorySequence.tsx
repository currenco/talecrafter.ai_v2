"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll } from "framer-motion";

// Frames 241-300 only extend the final open-book hold with minimal movement.
const FRAME_COUNT = 240;
const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;
const STORY_PROP_BOUNDS = {
  left: 1650,
  top: 650,
  width: 320,
  height: 320,
};
const frameUrl = (index: number) =>
  `/frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.jpg`;

export default function ScrollStorySequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storyPropRef = useRef<HTMLImageElement>(null);
  const reducedMotion = useReducedMotion();
  const [shouldLoadFrames, setShouldLoadFrames] = useState(false);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reducedMotion || shouldLoadFrames) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoadFrames(true);
        observer.disconnect();
      },
      // The sequence sits directly below the hero. Start warming its first
      // frames while the user is still reading the hero instead of waiting
      // until the canvas is already on screen.
      { rootMargin: "200% 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [reducedMotion, shouldLoadFrames]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const storyProp = storyPropRef.current;
    if (!canvas || !storyProp) return;

    const positionStoryProp = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(
        rect.width / FRAME_WIDTH,
        rect.height / FRAME_HEIGHT,
      );
      const renderedWidth = FRAME_WIDTH * scale;
      const renderedHeight = FRAME_HEIGHT * scale;
      const offsetX = (rect.width - renderedWidth) / 2;
      const offsetY = (rect.height - renderedHeight) / 2;
      const left = offsetX + STORY_PROP_BOUNDS.left * scale;
      const top = offsetY + STORY_PROP_BOUNDS.top * scale;
      const width = STORY_PROP_BOUNDS.width * scale;
      const height = STORY_PROP_BOUNDS.height * scale;
      const outsideViewport =
        left >= rect.width ||
        top >= rect.height ||
        left + width <= 0 ||
        top + height <= 0;

      storyProp.style.display = outsideViewport ? "none" : "block";
      storyProp.style.opacity = outsideViewport ? "0" : "1";
      storyProp.style.left = `${left}px`;
      storyProp.style.top = `${top}px`;
      storyProp.style.width = `${width}px`;
      storyProp.style.height = `${height}px`;
    };

    const observer = new window.ResizeObserver(positionStoryProp);
    observer.observe(canvas);
    positionStoryProp();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || !shouldLoadFrames) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const compactViewport = window.matchMedia("(max-width: 767px)").matches;
    const lookAhead = compactViewport ? 12 : 24;
    const lookBehind = compactViewport ? 6 : 12;
    const maxDecodedFrames = compactViewport ? 18 : 36;
    const maxConcurrentRequests = compactViewport ? 4 : 8;

    // Keep decoded memory bounded: retaining all 300 full-HD frames would
    // exceed 2 GB. A moving window remains available in both directions.
    const frames = new Map<number, HTMLImageElement>();
    const pending = new Map<number, HTMLImageElement>();
    const failed = new Set<number>();
    let target = 0;
    let direction = 1;
    let raf = 0;
    let disposed = false;
    let lastDrawn = -1;

    const trimFrameCache = () => {
      if (frames.size <= maxDecodedFrames) return;

      const removable = [...frames.keys()]
        .filter((index) => index !== lastDrawn)
        .sort(
          (a, b) => Math.abs(b - target) - Math.abs(a - target),
        );

      while (frames.size > maxDecodedFrames && removable.length) {
        const index = removable.shift();
        if (index !== undefined) frames.delete(index);
      }
    };

    const draw = () => {
      raf = 0;
      if (disposed) return;
      let closest = -1;
      for (const index of frames.keys()) {
        if (closest < 0 || Math.abs(index - target) < Math.abs(closest - target)) {
          closest = index;
        }
      }
      const frame = frames.get(closest);
      if (!frame) return;
      if (closest === lastDrawn) {
        trimFrameCache();
        return;
      }
      // Cover the viewport without stretching, including portrait screens.
      const scale = Math.max(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
      const width = frame.naturalWidth * scale;
      const height = frame.naturalHeight * scale;
      context.drawImage(frame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      canvas.style.opacity = "1";
      lastDrawn = closest;
      trimFrameCache();
    };

    const scheduleDraw = () => {
      if (!raf && !disposed) raf = window.requestAnimationFrame(draw);
    };

    const pump = () => {
      if (disposed) return;
      const wanted = [target];
      for (let distance = 1; distance <= lookAhead; distance++) {
        wanted.push(target + distance * direction);
        if (distance <= lookBehind) {
          wanted.push(target - distance * direction);
        }
      }
      for (const index of wanted) {
        if (pending.size >= maxConcurrentRequests) break;
        if (index < 0 || index >= FRAME_COUNT || frames.has(index) || pending.has(index) || failed.has(index)) continue;
        const frame = new window.Image();
        pending.set(index, frame);
        frame.decoding = "async";
        if (index === target) frame.fetchPriority = "high";
        frame.onload = () => {
          if (disposed) return;
          pending.delete(index);
          // Retain completed requests even when scrolling has moved. They give
          // the canvas usable intermediate frames instead of forcing a jump.
          frames.set(index, frame);
          scheduleDraw();
          pump();
        };
        frame.onerror = () => {
          if (disposed) return;
          pending.delete(index);
          failed.add(index);
          pump();
        };
        frame.src = frameUrl(index);
      }
    };

    const update = (progress: number) => {
      const next = Math.round(Math.max(0, Math.min(1, progress)) * (FRAME_COUNT - 1));
      const previousTarget = target;
      if (next !== previousTarget) direction = next > previousTarget ? 1 : -1;
      target = next;

      // A large jump can otherwise leave every request slot occupied by
      // irrelevant frames. Cancel only the single farthest request so normal
      // continuous scrolling does not thrash the network.
      if (Math.abs(next - previousTarget) > lookAhead && pending.size) {
        const farthest = [...pending.keys()].sort(
          (a, b) => Math.abs(b - target) - Math.abs(a - target),
        )[0];
        const staleFrame = farthest === undefined ? undefined : pending.get(farthest);
        if (staleFrame && farthest !== undefined) {
          staleFrame.onload = null;
          staleFrame.onerror = null;
          staleFrame.src = "";
          pending.delete(farthest);
        }
      }

      scheduleDraw();
      pump();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      lastDrawn = -1;
      scheduleDraw();
    };
    const observer = new window.ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    update(scrollYProgress.get());
    const unsubscribe = scrollYProgress.on("change", update);

    return () => {
      disposed = true;
      unsubscribe();
      observer.disconnect();
      window.cancelAnimationFrame(raf);
      for (const frame of pending.values()) {
        frame.onload = null;
        frame.onerror = null;
        frame.src = "";
      }
      pending.clear();
      frames.clear();
    };
  }, [reducedMotion, scrollYProgress, shouldLoadFrames]);

  return (
    <section
      ref={sectionRef}
      aria-label="Watch a storybook come to life as you scroll"
      className="relative h-[420svh] bg-[#0b1522] motion-reduce:h-[100svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div
          role="img"
          aria-label="An illustrated pop-up storybook unfolds into a miniature world of trees and castles."
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${frameUrl(0)}')` }}
        />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 motion-reduce:hidden" />
        <Image
          ref={storyPropRef}
          aria-hidden="true"
          alt=""
          src="/decor/story-inkwell-quill.webp"
          width={720}
          height={720}
          priority
          className="pointer-events-none absolute z-[1] origin-center -scale-x-100 object-contain opacity-0 drop-shadow-[0_18px_24px_rgba(2,8,17,0.34)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-20 bg-gradient-to-b from-[#0b1522] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-32 bg-gradient-to-t from-[#0b1522] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[3] flex items-center justify-between px-6 text-[10px] font-medium uppercase tracking-[0.24em] text-[#f1eadb]/80 sm:bottom-10 sm:px-12 sm:text-xs">
          <span>A world within every story</span>
          <span className="motion-reduce:hidden">Scroll to unfold <span aria-hidden="true">↓</span></span>
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-[3] h-px origin-left bg-[#d8c69e]/70 motion-reduce:hidden"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </section>
  );
}
