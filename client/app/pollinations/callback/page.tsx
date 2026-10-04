import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function PollinationsCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center bg-[#0b1522] text-[#c3cbd4]">
          Connecting wallet...
        </main>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
