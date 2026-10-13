"use client";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/react";
import { HiSparkles } from "react-icons/hi2";

const DashboardHeader = () => {

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
          <Link href="/pricing">
            <Button className="tc-btn-primary group px-6 py-5 text-sm duration-200 hover:scale-[1.03]">
              <HiSparkles className="mr-2 text-base transition-transform duration-200 group-hover:rotate-12" />
              View plans
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
