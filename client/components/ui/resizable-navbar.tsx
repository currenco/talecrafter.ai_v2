"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";

import React, { useState } from "react";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const nextVisible = latest > 100;
    setVisible((current) =>
      current === nextVisible ? current : nextVisible,
    );
  });

  return (
    <div
      className={cn("sticky inset-x-0 top-0 z-50 box-border w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        y: visible && !reducedMotion ? 20 : 0,
      }}
      transition={{
        duration: reducedMotion ? 0 : 0.2,
        ease: "easeOut",
      }}

      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full border border-[#d8c69e]/15 bg-[#0b1522]/95 px-4 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors duration-200 lg:flex",
        visible && "bg-[#0b1522]/85 shadow-[0_18px_60px_rgba(0,0,0,0.34)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-[#c3cbd4]/70 transition duration-200 hover:text-[#f1eadb] lg:flex lg:space-x-2",
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-4 py-2 text-[#c3cbd4]/72 transition hover:text-[#f1eadb]"
          key={`link-${idx}`}
          href={item.link}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full border border-[#d8c69e]/15 bg-[#d8c69e]/[0.08]"
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        y: visible && !reducedMotion ? 20 : 0,
      }}
      transition={{
        duration: reducedMotion ? 0 : 0.2,
        ease: "easeOut",
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full min-w-0 flex-col items-center justify-between rounded-full border border-[#d8c69e]/15 bg-[#0b1522] px-3 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.28)] lg:hidden",
        visible && "shadow-[0_18px_60px_rgba(0,0,0,0.34)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-2xl border border-[#d8c69e]/15 bg-[#111d2b] px-4 py-8 shadow-[0_24px_70px_rgba(0,0,0,0.4)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick?: () => void;
}) => {
  return isOpen ? (
    <IconX className="text-[#c3cbd4]" {...(onClick ? { onClick } : {})} />
  ) : (
    <IconMenu2 className="text-[#c3cbd4]" {...(onClick ? { onClick } : {})} />
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "secondary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "secondary" | "gradient";
} & (
  React.ComponentPropsWithoutRef<"a"> | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "relative inline-block cursor-pointer rounded-full px-4 py-2 text-center text-sm font-bold transition duration-200 hover:-translate-y-0.5";

  const variantStyles = {
    secondary: "bg-transparent text-[#c3cbd4] shadow-none",
    gradient:
      "border border-[#e2d2ae] bg-gradient-to-br from-[#eee0c0] to-[#cbb789] text-[#101a28] hover:from-[#f5e8ca] hover:to-[#d8c69e] shadow-[0px_1px_0px_0px_rgba(255,255,255,0.3)_inset]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
