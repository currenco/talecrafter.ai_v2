"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, LogOut, UserRound } from "lucide-react";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useUser } from "@/lib/neon-auth/client";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  NavItems,
  Navbar,
  NavbarButton,
} from "@/components/ui/resizable-navbar";

type HeaderLogoProps = {
  href: string;
  onClick: () => void;
};

const HeaderLogo = ({ href, onClick }: HeaderLogoProps) => (
  <Link
    href={href}
    className="relative z-20 flex items-center gap-2 rounded-full px-2 py-1"
    onClick={onClick}
  >
    <Image
      src="/app_logo.png"
      alt="TaleCrafter AI"
      width={42}
      height={42}
      className="object-contain"
      priority
    />
    <span className="tc-title-gradient hidden text-xl font-bold tracking-tight sm:block">
      TaleCrafterAI
    </span>
  </Link>
);

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const isAdmin = userDetail?.role === "admin";

  const visitorItems = [
    { name: "Home", link: "/" },
    { name: "About", link: "/about" },
    { name: "Explore Stories", link: "/explore" },
  ];

  const userItems = [
    { name: "Create Story", link: "/create-story" },
    { name: "Explore Stories", link: "/explore" },
    { name: "My Stories", link: "/dashboard" },
    ...(isAdmin ? [{ name: "Admin Panel", link: "/admin" }] : []),
  ];

  const isAuthenticated = isLoaded && isSignedIn;
  const navItems = !isLoaded ? [] : isAuthenticated ? userItems : visitorItems;
  const logoHref = isAuthenticated ? "/dashboard" : "/";
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const signOut = async () => {
    await authClient.signOut();
    setUserDetail(undefined);
    closeMobileMenu();
    router.push("/");
    router.refresh();
  };

  const accountControls = (
    <div className="flex items-center gap-1">
      <Link
        href="/buy-credits"
        aria-label={`${userDetail?.credit ?? 0} credits. Manage credits`}
        title="Credits"
        className="flex h-9 min-w-12 items-center justify-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15"
      >
        <Coins size={17} aria-hidden="true" />
        <span>{userDetail?.credit ?? "-"}</span>
      </Link>
      <Link
        href="/dashboard"
        aria-label="Open account dashboard"
        title="Account"
        className="rounded-full p-2 text-blue-100 hover:bg-white/10"
      >
        <UserRound size={19} aria-hidden="true" />
      </Link>
      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        className="rounded-full p-2 text-blue-100 hover:bg-white/10"
        onClick={signOut}
      >
        <LogOut size={19} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <Navbar className="px-3 py-2">
      <NavBody className="border-blue-300/15 bg-[#010715]/90">
        <HeaderLogo href={logoHref} onClick={closeMobileMenu} />
        <NavItems items={navItems} />
        <div className="relative z-20 flex items-center gap-3">
          {!isLoaded ? null : isAuthenticated ? (
            <>
              <Link href="/create-story">
                <NavbarButton
                  as="button"
                  variant="gradient"
                  className="rounded-full bg-blue-600 px-5 text-white hover:bg-blue-500"
                >
                  Create
                </NavbarButton>
              </Link>
              {accountControls}
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <NavbarButton
                  as="button"
                  variant="secondary"
                  className="rounded-full text-blue-100/80 hover:text-white"
                >
                  Login
                </NavbarButton>
              </Link>
              <Link href="/sign-up">
                <NavbarButton
                  as="button"
                  variant="gradient"
                  className="rounded-full bg-blue-600 px-5 text-white hover:bg-blue-500"
                >
                  Sign Up
                </NavbarButton>
              </Link>
            </>
          )}
        </div>
      </NavBody>

      <MobileNav className="border-blue-300/15 bg-[#010715]/90">
        <MobileNavHeader>
          <HeaderLogo href={logoHref} onClick={closeMobileMenu} />
          <div className="flex items-center gap-3">
            {isAuthenticated && accountControls}
            <button
              type="button"
              aria-label="Toggle navigation menu"
              className="rounded-full border border-blue-300/20 p-2"
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            >
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((value) => !value)}
              />
            </button>
          </div>
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          className="bg-[#03122e]/95"
        >
          {navItems.map((item) => (
            <Link
              key={item.link}
              href={item.link}
              onClick={closeMobileMenu}
              className={`w-full rounded-xl px-4 py-3 text-base font-semibold transition ${
                pathname === item.link
                  ? "border border-blue-300/20 bg-blue-500/20 text-white"
                  : "text-blue-100/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}

          <div className="flex w-full flex-col gap-3 border-t border-blue-300/15 pt-4">
            {!isLoaded ? null : isAuthenticated ? (
              <Link href="/create-story" onClick={closeMobileMenu}>
                <NavbarButton
                  as="button"
                  variant="gradient"
                  className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-500"
                >
                  Create Story
                </NavbarButton>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" onClick={closeMobileMenu}>
                  <NavbarButton
                    as="button"
                    variant="secondary"
                    className="w-full rounded-xl border border-blue-300/20 text-blue-100"
                  >
                    Login
                  </NavbarButton>
                </Link>
                <Link href="/sign-up" onClick={closeMobileMenu}>
                  <NavbarButton
                    as="button"
                    variant="gradient"
                    className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Sign Up
                  </NavbarButton>
                </Link>
              </>
            )}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
};

export default Header;
