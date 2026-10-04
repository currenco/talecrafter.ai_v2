"use client";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/react";
import Image from "next/image";
import { useContext } from "react";
import { HiSparkles } from "react-icons/hi2";

const DashboardHeader = () => {
  const { userDetail } = useContext(UserDetailContext);

  return (
    <div className="tc-glass-panel p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8c69e]">Your library</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#f1eadb] md:text-6xl">
            My Stories
          </h1>
          <p className="mt-2 text-sm text-[#c3cbd4]/70 md:text-base">
            Manage your generated books, revisit ideas, and continue creating.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <span className="inline-flex items-center rounded-full border border-[#d8c69e]/20 bg-[#d8c69e]/[0.08] px-4 py-2 text-lg font-bold text-[#f1eadb] md:text-xl">
            <Image
              src={"/credits.png"}
              width={28}
              height={28}
              alt="coin"
              className="mr-2 inline-flex"
            />
            {userDetail?.credit ?? "-"}
          </span>
          <Link href="/buy-credits">
            <Button className="tc-btn-primary group px-6 py-5 text-sm duration-200 hover:scale-[1.03]">
              <HiSparkles className="mr-2 text-base transition-transform duration-200 group-hover:rotate-12" />
              Buy Credits
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
