"use client";

import { useEffect, useRef } from "react";
import {
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

const isScrollableElement = (target: EventTarget | null, deltaY: number) => {
  let element = target instanceof Element ? target : null;

  while (element && element !== document.body) {
    if (element.hasAttribute("data-smooth-scroll-prevent")) return true;

    const { overflowY } = window.getComputedStyle(element);
    const canScroll = /(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight;

    if (canScroll) {
      const atTop = element.scrollTop <= 0;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }

    element = element.parentElement;
  }

  return false;
};

const SmoothScroll = () => {
  const prefersReducedMotion = useReducedMotion();
  const currentY = useMotionValue(0);
  const targetY = useMotionValue(0);
  const active = useRef(false);
  const enabled = useRef(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    enabled.current = finePointer && !prefersReducedMotion;

    if (!enabled.current) return;

    const syncPosition = () => {
      if (active.current) return;
      currentY.set(window.scrollY);
      targetY.set(window.scrollY);
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        isScrollableElement(event.target, event.deltaY)
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextTarget = Math.min(
        maximum,
        Math.max(0, targetY.get() + event.deltaY * multiplier),
      );

      targetY.set(nextTarget);
      active.current = true;
    };

    const handleResize = () => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const clamped = Math.min(maximum, targetY.get());
      targetY.set(clamped);
      currentY.set(Math.min(maximum, currentY.get()));
    };

    document.documentElement.classList.add("premium-scroll");
    currentY.set(window.scrollY);
    targetY.set(window.scrollY);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", syncPosition, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      enabled.current = false;
      active.current = false;
      document.documentElement.classList.remove("premium-scroll");
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", syncPosition);
      window.removeEventListener("resize", handleResize);
    };
  }, [currentY, prefersReducedMotion, targetY]);

  useAnimationFrame((_time, delta) => {
    if (!enabled.current || !active.current) return;

    const current = currentY.get();
    const target = targetY.get();
    const distance = target - current;

    if (Math.abs(distance) < 0.35) {
      currentY.set(target);
      window.scrollTo(0, target);
      active.current = false;
      return;
    }

    const frameFactor = Math.min(delta, 64) / 16.667;
    const easing = 1 - Math.pow(0.86, frameFactor);
    const next = current + distance * easing;
    currentY.set(next);
    window.scrollTo(0, next);
  });

  return null;
};

export default SmoothScroll;
