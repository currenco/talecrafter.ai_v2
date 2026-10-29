"use client";

import { useRef, useState } from "react";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";

export default function DeleteStoryDialog({ isOpen, onClose, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      if (await onConfirm()) onClose();
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={!pending} isKeyboardDismissDisabled={pending} hideCloseButton placement="center" className="mx-4 rounded-lg border border-[#d8c69e]/25 bg-[#111d2b] text-[#f1eadb]">
      <ModalContent>
        <ModalHeader>Delete story?</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this story?</p>
          <p className="text-sm text-[#c3cbd4]">This cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" isDisabled={pending} onPress={onClose}>Cancel</Button>
          <Button color="danger" isLoading={pending} isDisabled={pending} onPress={() => void confirm()}>Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
