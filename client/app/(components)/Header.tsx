"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LogOut, UserRound, Home, Info, Compass, BookOpen, PenLine, ShieldCheck } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/modal";
import {
  authClient,
  clearAccessTokenCache,
} from "@/lib/neon-auth/client";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  NavBody,
  NavItems,
  Navbar,
  NavbarButton,
} from "@/components/ui/resizable-navbar";

type HeaderLogoProps = { onClick: () => void };

const HeaderLogo = ({ onClick }: HeaderLogoProps) => (
  <Link
    href="/"
    className="relative z-20 flex items-center gap-2 rounded-full px-1.5 py-0.5"
    onClick={onClick}
  >
    <Image
      src="/talecrafter-symbol.png"
      alt="TaleCrafter AI"
      width={36}
      height={36}
      className="h-9 w-9 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
      priority
    />
    <span className="tc-title-gradient hidden font-serif text-xl font-semibold tracking-tight sm:block">
      TaleCrafterAI
    </span>
  </Link>
);

const Header = () => {
  const reduceMotion = useReducedMotion();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setIsMobileMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const router = useRouter();
  const {
    userDetail,
    setUserDetail,
    authUser,
    isAuthLoaded,
    isSignedIn,
  } = useContext(UserDetailContext);
  const {
    isOpen: isAccountOpen,
    onOpen: openAccount,
    onClose: closeAccount,
    onOpenChange: onAccountOpenChange,
  } = useDisclosure();
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

  const isAuthenticated = isAuthLoaded && isSignedIn;
  const navItems = isAuthenticated ? userItems : visitorItems;
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const signOut = async () => {
    await authClient.signOut();
    clearAccessTokenCache();
    setUserDetail(undefined);
    closeMobileMenu();
    closeAccount();
    router.push("/");
    router.refresh();
  };

  const openAccountModal = () => {
    closeMobileMenu();
    openAccount();
  };

  const accountName =
    userDetail?.userName || authUser?.name || "TaleCrafter user";
  const accountEmail = userDetail?.userEmail || authUser?.email || "";

  const accountControls = (
    <div className="flex items-center gap-1">
      <Link
        href="/pricing"
        aria-label="View plans"
        title="View plans"
        className="flex h-8 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[#d8c69e]/20 bg-[#d8c69e]/10 px-2 text-xs font-semibold text-[#f1eadb] hover:bg-[#d8c69e]/15"
      >
        <Sparkles size={16} aria-hidden="true" />
        <span>Plans</span>
      </Link>
      <button
        type="button"
        aria-label="Open account menu"
        aria-haspopup="dialog"
        aria-expanded={isAccountOpen}
        title="Account"
        className="rounded-full p-1.5 text-[#c3cbd4] hover:bg-white/10"
        onClick={openAccountModal}
      >
        <UserRound size={18} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      <Navbar className={isHome ? "fixed px-3 py-3" : "px-3 py-1.5"}>
        <NavBody className="border-[#d8c69e]/15 bg-[#0b1522]/90">
          <HeaderLogo onClick={closeMobileMenu} />
          <NavItems items={navItems} />
          <div className="relative z-20 flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/create-story">
                  <NavbarButton
                    as="button"
                    variant="gradient"
                    className="tc-btn-primary rounded-full px-5"
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
                    className="rounded-full text-[#c3cbd4]/80 hover:text-[#f1eadb]"
                  >
                    Login
                  </NavbarButton>
                </Link>
                <Link href="/sign-up">
                  <NavbarButton
                    as="button"
                    variant="gradient"
                    className="tc-btn-primary rounded-full px-5"
                  >
                    Sign Up
                  </NavbarButton>
                </Link>
              </>
            )}
          </div>
        </NavBody>

        <MobileNav className="border-[#d8c69e]/15 bg-[#0b1522]">
          <MobileNavHeader>
            <HeaderLogo onClick={closeMobileMenu} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Toggle navigation menu"
                aria-haspopup="dialog"
                aria-expanded={isMobileMenuOpen}
                className="rounded-full border border-[#d8c69e]/20 p-1.5"
                onClick={() => setIsMobileMenuOpen((value) => !value)}
              >
                <MobileNavToggle isOpen={isMobileMenuOpen} />
              </button>
            </div>
          </MobileNavHeader>

        </MobileNav>
      </Navbar>

      <Modal
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        placement="center"
        scrollBehavior="inside"
        disableAnimation={Boolean(reduceMotion)}
        motionProps={{ variants: { enter: { x: 0, opacity: 1, transition: { duration: 0.2 } }, exit: { x: "100%", opacity: 1, transition: { duration: 0.2 } } } }}
        classNames={{
          wrapper: "!items-stretch !justify-end",
          backdrop: "bg-black/60",
          base: "!m-0 !h-[100dvh] !max-h-[100dvh] !w-[min(340px,90vw)] !max-w-none !rounded-none border-l border-[#d8c69e]/20 bg-[#111d2b] text-[#f1eadb]",
          closeButton: "right-3 top-4 text-[#c3cbd4] hover:bg-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="items-center gap-2 border-b border-[#d8c69e]/15 py-5 pr-12">
            <Image src="/talecrafter-symbol.png" alt="" width={30} height={30} className="shrink-0 object-contain" />
            <span className="text-lg font-semibold">TaleCrafterAI</span>
          </ModalHeader>
          <ModalBody className="gap-5 px-5 py-5">
            {isAuthenticated && <div className="border-b border-[#d8c69e]/15 pb-5 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d8c69e]/10 text-[#d8c69e]"><UserRound size={28} aria-hidden="true" /></span>
              <p className="mt-3 break-words font-semibold">{accountName}</p>
              <p className="mt-1 break-all text-xs text-[#c3cbd4]/75">{accountEmail}</p>
              <p className="mt-2 text-xs font-medium text-[#d8c69e]">{userDetail?.plan === "creator" ? "Creator" : "Free"}</p>
            </div>}
            <nav aria-label="Mobile navigation" className="space-y-1">
              {[...navItems, { name: "Plans", link: "/pricing" }].map(item => {
                const Icon = ({ "/": Home, "/about": Info, "/explore": Compass, "/create-story": PenLine, "/dashboard": BookOpen, "/admin": ShieldCheck, "/pricing": Sparkles } as Record<string, typeof Home>)[item.link];
                return <Link key={item.link} href={item.link} onClick={closeMobileMenu} aria-current={pathname === item.link ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold ${pathname === item.link ? "bg-[#d8c69e]/15 text-[#f1eadb]" : "text-[#c3cbd4] hover:bg-white/5"}`}>
                  <Icon size={19} className="shrink-0" aria-hidden="true" />{item.name}
                </Link>;
              })}
            </nav>
          </ModalBody>
          <ModalFooter className="flex-col border-t border-[#d8c69e]/15 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            {isAuthenticated ? <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/10">
              <LogOut size={19} aria-hidden="true" />Log out
            </button> : <>
              <Link href="/sign-in" onClick={closeMobileMenu} className="flex min-h-11 items-center justify-center rounded-md border border-[#d8c69e]/25 px-4 py-2 text-sm font-semibold">Login</Link>
              <Link href="/sign-up" onClick={closeMobileMenu} className="tc-btn-primary flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold">Sign Up</Link>
            </>}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isOpen={isAccountOpen}
        onOpenChange={onAccountOpenChange}
        placement="center"
        size="sm"
        classNames={{
          backdrop: "bg-black/65",
          base: "border border-[#d8c69e]/20 bg-[#111d2b] text-[#f1eadb]",
          closeButton: "text-[#c3cbd4] hover:bg-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3 border-b border-[#d8c69e]/15">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8c69e]/10 text-[#d8c69e]">
              <UserRound size={21} aria-hidden="true" />
            </span>
            <span>Account</span>
          </ModalHeader>
          <ModalBody className="gap-5 py-6">
            <div>
              <p className="text-xs font-semibold uppercase text-[#c3cbd4]/55">
                Name
              </p>
              <p className="mt-1 break-words text-base font-semibold text-[#f1eadb]">
                {accountName}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#c3cbd4]/55">
                Email
              </p>
              <p className="mt-1 break-all text-sm text-[#c3cbd4]/85">
                {accountEmail}
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-[#d8c69e]/15">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500/15 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-500/25"
              onClick={signOut}
            >
              <LogOut size={18} aria-hidden="true" />
              Log out
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Header;
