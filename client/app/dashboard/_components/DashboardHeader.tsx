"use client";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/react";
import { HiSparkles } from "react-icons/hi2";

const DashboardHeader = () => {

  return (
    <div className="tc-glass-panel p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)] md:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
        <div className="contents">
          <p className="col-start-1 row-start-1 text-xs font-semibold uppercase tracking-normal text-[#d8c69e]">Your library</p>
          <h1 className="col-span-2 mt-2 font-serif text-2xl font-medium leading-tight tracking-normal text-[#f1eadb] sm:text-3xl lg:text-4xl">
            My Stories
          </h1>
          <p className="col-span-2 mt-2 text-sm leading-6 text-[#c3cbd4]/70 sm:text-base sm:leading-7">
            Manage your generated books, revisit ideas, and continue creating.
          </p>
        </div>

        <div className="col-start-2 row-start-1 justify-self-end">
          <Link href="/pricing">
            <Button className="tc-btn-primary group h-auto min-h-11 px-4 py-2 text-sm leading-5 duration-200 sm:px-5 sm:py-2.5">
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
