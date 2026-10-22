"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { ApiClientError } from "@/lib/api-client";

export function PollinationsUpgradeNotice() {
  return (
    <div className="space-y-3 text-sm leading-6 text-[#c3cbd4]">
      <p>Your connected image balance is used up. Upgrade to Creator for included image generation, without a personal key. Your saved draft stays in My Stories.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-lg bg-[#d8c69e] px-4 font-semibold text-[#0b1522]">Upgrade to Creator</Link>
      </div>
    </div>
  );
}

export function usePollinationsUpgrade() {
  const [open, setOpen] = useState(false);
  const handleFundingError = (error: unknown) => {
    const exhausted = error instanceof ApiClientError && error.code === "POLLINATIONS_BALANCE_EXHAUSTED";
    if (exhausted) setOpen(true);
    return exhausted;
  };
  const upgradeDialog = (
    <Modal isOpen={open} onOpenChange={setOpen} placement="center" className="border border-[#d8c69e]/25 bg-[#111d2b] text-[#f1eadb]">
      <ModalContent>
        <ModalHeader>Continue creating your story</ModalHeader>
        <ModalBody><PollinationsUpgradeNotice /></ModalBody>
        <ModalFooter><Button variant="light" onPress={() => setOpen(false)}>Close</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
  return { handleFundingError, upgradeDialog };
}
