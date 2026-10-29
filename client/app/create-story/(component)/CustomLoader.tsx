import {
  Modal,
  ModalContent,
  ModalBody,
} from "@nextui-org/modal";
import Image from "next/image";

function CustomLoader({
  isLoading,
  message,
}: {
  isLoading: boolean;
  message?: string;
}) {
  return (
    <div>
      {isLoading && (
        <Modal
          backdrop="opaque"
          isOpen={isLoading}
          isDismissable={false}
          isKeyboardDismissDisabled
          hideCloseButton
          aria-label="Story generation in progress"
          radius="lg"
          classNames={{
            body: "py-6",
            backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
            base: "border-[#292f46] bg-[#19172c] text-[#a8b0d3] dark:bg-[#19172c]",
            header: "border-b-[1px] border-[#292f46]",
            footer: "border-t-[1px] border-[#292f46]",
          }}
        >
          <ModalContent>
            {() => (
              <ModalBody className="flex w-full items-center justify-center bg-white p-12">
                <Image
                  src={"/Loader.gif"}
                  height={200}
                  width={200}
                  alt="loading..."
                />
                <h2 className="text-center text-2xl font-bold text-primary">
                  {message || "Story is generating..."}
                </h2>
              </ModalBody>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}

export default CustomLoader;
