"use client";
import { useContext, useEffect, useRef, useState } from "react";
import StorySubjectInput from "./(component)/StorySubjectInput";
import StoryType from "./(component)/StoryType";
import ImageStyle from "./(component)/ImageStyle";
import { Button } from "@nextui-org/button";
import CustomLoader from "./(component)/CustomLoader";
import { getAccessToken } from "@/lib/neon-auth/client";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import UploadImage from "./(component)/UploadImage";
import { motion, useReducedMotion } from "framer-motion";
import {
  apiFetch,
  ApiClientError,
  createIdempotencyKey,
  shouldRetainIdempotencyKey,
} from "@/lib/api-client";
import type { UserDetail } from "@/app/_context/UserDetailContext";
import type { StorySelection } from "@/types/story";
import { waitForStoryPublication } from "@/lib/story-generation";
import { CircleCheck, KeyRound, Link2, LoaderCircle } from "lucide-react";
const MotionDiv = motion.div;

export interface FormDataType {
  storySubject: string;
  storyType: string;
  imageStyle: string;
}

const primaryButtonClass =
  "rounded-full border border-[#e2d2ae] bg-gradient-to-br from-[#eee0c0] to-[#cbb789] px-8 py-6 text-base font-semibold text-[#101a28] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_35px_rgba(0,0,0,0.22)] transition hover:from-[#f5e8ca] hover:to-[#d8c69e] disabled:cursor-not-allowed disabled:opacity-60";

type ClassicStoryResponse = {
  slug?: string;
  storyId?: string;
  status?: "draft" | "published";
  user?: UserDetail;
};

type InteractiveStoryResponse = {
  storyId: string;
  user?: UserDetail;
};

type PollinationsStatus = {
  state:
    | "connected"
    | "disconnected"
    | "expired"
    | "revoked"
    | "model_not_authorized";
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  balance: unknown;
};

const CreateStory = () => {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [formData, setFormData] = useState<Partial<FormDataType>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [generationMessage, setGenerationMessage] = useState(
    "Writing your story draft...",
  );
  const notify = (msg: string) => toast(msg);
  const notifyError = (msg: string) => toast.error(msg);
  const { userDetail, setUserDetail, authUser } = useContext(UserDetailContext);
  const userId = authUser?.id;
  const [storySubject, setStorySubject] = useState("");
  const [walletStatus, setWalletStatus] = useState<PollinationsStatus>();
  const [walletPending, setWalletPending] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const generationRequestRef = useRef<{
    mode: "classic" | "interactive";
    request: string;
    key: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!userId) {
      setWalletStatus(undefined);
      setWalletLoading(false);
      return;
    }

    const loadWallet = async () => {
      setWalletLoading(true);
      try {
        const token = await getAccessToken();
        const status = await apiFetch<PollinationsStatus>(
          "/pollinations/status",
          { token },
        );
        if (!ignore) setWalletStatus(status);
      } catch (error) {
        console.error("Unable to load Pollinations key connection", error);
        if (!ignore) setWalletStatus(undefined);
      } finally {
        if (!ignore) setWalletLoading(false);
      }
    };

    loadWallet();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const connectPollinations = async () => {
    setWalletPending(true);
    try {
      const token = await getAccessToken();
      const result = await apiFetch<{ authorizationUrl: string }>(
        "/pollinations/connect",
        { method: "POST", token },
      );
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      notifyError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to connect your Pollinations key",
      );
      setWalletPending(false);
    }
  };

  const onHandleUserSelection = (data: StorySelection) => {
    setFormData((prev) => ({
      ...prev,
      [data.fieldName]: data.fieldValue,
    }));
  };

  const buildRequestBody = () => {
    const subject =
      formData.storySubject ||
      storySubject
        .replace("Here's a short story idea based on the image:", "")
        .trim();

    return {
      storySubject: subject,
      storyType: formData.storyType,
      ageGroup: "All Ages",
      imageStyle: formData.imageStyle,
    };
  };

  const validateStoryRequest = () => {
    const body = buildRequestBody();
    if (
      !body.storySubject ||
      !body.storyType ||
      !body.imageStyle
    ) {
      notifyError("Please complete all story options before generating.");
      return null;
    }

    return body;
  };

  const GenerateStory = async (mode: "classic" | "interactive" = "classic") => {
    if (!authUser) {
      router.push("/sign-up?redirect_url=/create-story");
      return;
    }

    if (!userDetail || userDetail.credit === undefined) {
      notifyError("User details not loaded yet. Please try again.");
      return;
    }

    if (userDetail.credit <= 0) {
      notifyError(
        "You have no credit left! Please buy credit to generate story",
      );
      return;
    }

    if (!walletStatus?.connected) {
      notifyError("Connect your Pollinations key before generating images");
      return;
    }

    const body = validateStoryRequest();
    if (!body) return;

    setLoading(true);
    setGenerationMessage("Writing your story draft...");
    try {
      const token = await getAccessToken();
      const isInteractive = mode === "interactive";
      const endpoint = isInteractive ? "/interactive-stories" : "/stories";
      const request = JSON.stringify(body);
      if (
        !generationRequestRef.current ||
        generationRequestRef.current.mode !== mode ||
        generationRequestRef.current.request !== request
      ) {
        generationRequestRef.current = {
          mode,
          request,
          key: createIdempotencyKey(),
        };
      }
      const result = await apiFetch<
        ClassicStoryResponse | InteractiveStoryResponse
      >(endpoint, {
        method: "POST",
        token,
        idempotencyKey: generationRequestRef.current.key,
        body: request,
      });
      generationRequestRef.current = null;

      if (result.user) {
        setUserDetail(result.user);
      }

      if (result.storyId && authUser.id) {
        sessionStorage.removeItem(`dashboard_stories_cache_v1_${authUser.id}`);
      }

      if (!isInteractive) {
        const classicResult = result as ClassicStoryResponse;
        if (!classicResult.storyId) {
          throw new Error("Story response did not include a story ID");
        }

        notify("Story draft created. Generating its images now.");
        const published = await waitForStoryPublication({
          storyId: classicResult.storyId,
          token,
          onProgress: (status) =>
            setGenerationMessage(
              `Creating images ${status.completedImages}/${status.totalImages}...`,
            ),
        });
        generationRequestRef.current = null;
        notify("Story Generated Successfully");
        router.push(`/story/${published.slug}`);
        return;
      }

      notify("Story Generated Successfully");
      const target = (result as InteractiveStoryResponse).storyId;

      if (!target)
        throw new Error("Story response did not include a navigation target");
      router.push(`/interactive-story/${target}`);
    } catch (error) {
      if (!shouldRetainIdempotencyKey(error))
        generationRequestRef.current = null;
      console.error("Error generating story:", error);
      notifyError(
        error instanceof ApiClientError
          ? error.message
          : "Server Error! Please try in a moment.",
      );
    } finally {
      setLoading(false);
      setGenerationMessage("Writing your story draft...");
    }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1522] px-5 pb-20 pt-4 text-[#c3cbd4] md:px-12 lg:px-20 xl:px-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(55,79,105,0.55),transparent_48%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-10rem] top-72 h-96 w-96 rounded-full bg-[#d8c69e]/[0.05] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        <MotionDiv
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="mt-6 rounded-[2rem] border border-[#d8c69e]/20 bg-[#111d2b]/85 px-6 py-9 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:px-10 md:py-12"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8c69e]">
                TaleCrafter studio
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#f1eadb] sm:text-5xl md:text-6xl">
                Create your next story
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#c3cbd4]/75 md:text-lg">
                Set the idea, genre, and art direction. Then create a complete
                Classic book or a Plot Twist story shaped by your decisions.
              </p>
            </div>
            <div className="inline-flex items-center self-start rounded-full border border-[#d8c69e]/25 bg-[#d8c69e]/[0.08] px-5 py-3 text-[#f1eadb]">
              <span className="text-sm font-medium text-[#c3cbd4]/75">
                Credits left:
              </span>
              <span className="ml-2 text-xl font-bold text-[#d8c69e]">
                {userDetail?.credit ?? "-"}
              </span>
            </div>
          </div>
        </MotionDiv>

        {authUser && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#d8c69e]/15 bg-[#111d2b]/65 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8c69e]/10 text-[#d8c69e]">
                <KeyRound size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#f1eadb]">
                  Pollinations key
                </p>
                <p className="truncate text-sm text-[#c3cbd4]/65">
                  {walletLoading
                    ? "Checking key connection..."
                    : walletStatus?.connected
                      ? walletStatus.username
                        ? `Connected as ${walletStatus.username}`
                        : "Connected for image generation"
                      : walletStatus?.state === "expired"
                        ? "Connection expired"
                        : walletStatus?.state === "revoked"
                          ? "Connection revoked"
                          : walletStatus?.state === "model_not_authorized"
                            ? "Reconnect to authorize the current image model"
                            : "Connect your Pollinations key to generate story images"}
                </p>
              </div>
            </div>
            {walletLoading ? (
              <LoaderCircle
                className="animate-spin text-[#d8c69e]"
                size={20}
                aria-label="Checking Pollinations key connection"
              />
            ) : walletStatus?.connected ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CircleCheck size={18} aria-hidden="true" />
                Connected
              </span>
            ) : (
              <Button
                type="button"
                disabled={walletPending}
                className={primaryButtonClass}
                onClick={connectPollinations}
              >
                {walletPending ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Link2 size={18} />
                )}
                Connect key
              </Button>
            )}
          </div>
        )}

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-8 rounded-[2rem] border border-[#d8c69e]/15 bg-[#111d2b]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-8"
        >
          <div className="flex flex-col justify-between gap-5">
            <StorySubjectInput userSelection={onHandleUserSelection} />
          </div>
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="mt-7 rounded-[2rem] border border-[#d8c69e]/15 bg-[#111d2b]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-8"
        >
          <UploadImage setImageSubject={setStorySubject} />
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.14, duration: 0.5 }}
          className="mt-7 rounded-[2rem] border border-[#d8c69e]/15 bg-[#111d2b]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-8"
        >
          <StoryType userSelection={onHandleUserSelection} />
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.16, duration: 0.5 }}
          className="mt-7 rounded-[2rem] border border-[#d8c69e]/15 bg-[#111d2b]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md md:p-8"
        >
          <ImageStyle userSelection={onHandleUserSelection} />
        </MotionDiv>

        <div className="mt-10 flex justify-end border-t border-[#d8c69e]/15 pt-8">
          <div className="flex flex-wrap items-center gap-3">
            {!authUser ? (
              <Button
                disabled={loading}
                className={primaryButtonClass}
                onClick={() => GenerateStory("classic")}
              >
                Login to Create Story
              </Button>
            ) : (
              <>
                <Button
                  disabled={loading}
                  className="rounded-full border border-[#d8c69e]/30 bg-transparent px-8 py-6 text-base font-semibold text-[#f1eadb] transition hover:bg-[#d8c69e]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => GenerateStory("interactive")}
                >
                  Create Plot Twist Story
                </Button>
                <Button
                  disabled={loading}
                  className={primaryButtonClass}
                  onClick={() => GenerateStory("classic")}
                >
                  Create Classic Story
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <CustomLoader isLoading={loading} message={generationMessage} />
    </div>
  );
};

export default CreateStory;
