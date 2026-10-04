"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll } from "framer-motion";

const FRAME_COUNT = 300;
const CACHE_RADIUS = 18;
const frameUrl = (index: number) =>
  `/frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.jpg`;

export default function ScrollStorySequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    // Keep decoded memory bounded: 300 full-HD frames would exceed 2 GB.
    const frames = new Map<number, HTMLImageElement>();
    const pending = new Map<number, HTMLImageElement>();
    const failed = new Set<number>();
    let target = 0;
    let direction = 1;
    let raf = 0;
    let disposed = false;
    let lastDrawn = -1;

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
      if (!frame || closest === lastDrawn) return;
      // Cover the viewport without stretching, including portrait screens.
      const scale = Math.max(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
      const width = frame.naturalWidth * scale;
      const height = frame.naturalHeight * scale;
      context.drawImage(frame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      canvas.style.opacity = "1";
      lastDrawn = closest;
    };

    const scheduleDraw = () => {
      if (!raf && !disposed) raf = window.requestAnimationFrame(draw);
    };

    const pump = () => {
      if (disposed) return;
      const wanted = [target];
      for (let distance = 1; distance <= CACHE_RADIUS; distance++) {
        wanted.push(target + distance * direction, target - distance * direction);
      }
      for (const index of wanted) {
        if (pending.size >= 4) break;
        if (index < 0 || index >= FRAME_COUNT || frames.has(index) || pending.has(index) || failed.has(index)) continue;
        const frame = new window.Image();
        pending.set(index, frame);
        frame.decoding = "async";
        frame.onload = () => {
          if (disposed) return;
          pending.delete(index);
          if (Math.abs(index - target) <= CACHE_RADIUS) frames.set(index, frame);
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
      if (next !== target) direction = next > target ? 1 : -1;
      target = next;
      for (const index of frames.keys()) {
        if (Math.abs(index - target) > CACHE_RADIUS) frames.delete(index);
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
  }, [reducedMotion, scrollYProgress]);

  return (
    <section
      ref={sectionRef}
      aria-label="Watch a storybook come to life as you scroll"
      className="relative h-[500svh] bg-[#0b1522] motion-reduce:h-[100svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div
          role="img"
          aria-label="An illustrated pop-up storybook unfolds into a miniature world of trees and castles."
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${frameUrl(0)}')` }}
        />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 motion-reduce:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0b1522] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0b1522] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-8 flex items-center justify-between px-6 text-[10px] font-medium uppercase tracking-[0.24em] text-[#f1eadb]/80 sm:bottom-10 sm:px-12 sm:text-xs">
          <span>A world within every story</span>
          <span className="motion-reduce:hidden">Scroll to unfold <span aria-hidden="true">↓</span></span>
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-[#d8c69e]/70 motion-reduce:hidden"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </section>
  );
}
