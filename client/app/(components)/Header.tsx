"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, LogOut, UserRound } from "lucide-react";
import { useContext, useState } from "react";
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
  MobileNavMenu,
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
    className="relative z-20 flex items-center gap-2 rounded-full px-2 py-1"
    onClick={onClick}
  >
    <Image
      src="/logo.png"
      alt="TaleCrafter AI"
      width={42}
      height={42}
      className="h-11 w-11 rounded-full border border-[#d8c69e]/25 object-cover shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
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
        href="/buy-credits"
        aria-label={`${userDetail?.credit ?? 0} credits. Manage credits`}
        title="Credits"
        className="flex h-9 min-w-12 items-center justify-center gap-1.5 rounded-full border border-[#d8c69e]/20 bg-[#d8c69e]/10 px-2.5 text-sm font-semibold text-[#f1eadb] hover:bg-[#d8c69e]/15"
      >
        <Coins size={17} aria-hidden="true" />
        <span>{userDetail?.credit ?? "-"}</span>
      </Link>
      <button
        type="button"
        aria-label="Open account menu"
        aria-haspopup="dialog"
        aria-expanded={isAccountOpen}
        title="Account"
        className="rounded-full p-2 text-[#c3cbd4] hover:bg-white/10"
        onClick={openAccountModal}
      >
        <UserRound size={19} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      <Navbar className={isHome ? "fixed px-3 py-4" : "px-3 py-2"}>
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
            <div className="flex items-center gap-3">
              {isAuthenticated && accountControls}
              <button
                type="button"
                aria-label="Toggle navigation menu"
                className="rounded-full border border-[#d8c69e]/20 p-2"
                onClick={() => setIsMobileMenuOpen((value) => !value)}
              >
                <MobileNavToggle isOpen={isMobileMenuOpen} />
              </button>
            </div>
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            className="border border-[#d8c69e]/15 bg-[#111d2b]"
          >
            {navItems.map((item) => (
              <Link
                key={item.link}
                href={item.link}
                onClick={closeMobileMenu}
                className={`w-full rounded-xl px-4 py-3 text-base font-semibold transition ${
                  pathname === item.link
                    ? "border border-[#d8c69e]/20 bg-[#d8c69e]/12 text-[#f1eadb]"
                    : "text-[#c3cbd4]/75 hover:bg-white/10 hover:text-[#f1eadb]"
                }`}
              >
                {item.name}
              </Link>
            ))}

            <div className="flex w-full flex-col gap-3 border-t border-[#d8c69e]/15 pt-4">
              {isAuthenticated ? (
                <Link href="/create-story" onClick={closeMobileMenu}>
                  <NavbarButton
                    as="button"
                    variant="gradient"
                    className="tc-btn-primary w-full rounded-xl"
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
                      className="w-full rounded-xl border border-[#d8c69e]/20 text-[#c3cbd4]"
                    >
                      Login
                    </NavbarButton>
                  </Link>
                  <Link href="/sign-up" onClick={closeMobileMenu}>
                    <NavbarButton
                      as="button"
                      variant="gradient"
                      className="tc-btn-primary w-full rounded-xl"
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
