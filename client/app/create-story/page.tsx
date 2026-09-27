"use client";
import { useContext, useEffect, useRef, useState } from "react";
import StorySubjectInput from "./(component)/StorySubjectInput";
import StoryType from "./(component)/StoryType";
import AgeCategory from "./(component)/AgeCategory";
import ImageStyle from "./(component)/ImageStyle";
import { Button } from "@nextui-org/button";
import CustomLoader from "./(component)/CustomLoader";
import { useAuth, useUser } from "@/lib/neon-auth/client";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import UploadImage from "./(component)/UploadImage";
import { motion } from "framer-motion";
import {
  apiFetch,
  ApiClientError,
  createIdempotencyKey,
  shouldRetainIdempotencyKey,
} from "@/lib/api-client";
import type { UserDetail } from "@/app/_context/UserDetailContext";
import type { StorySelection } from "@/types/story";
import { waitForStoryPublication } from "@/lib/story-generation";
import { CircleCheck, Link2, LoaderCircle, WalletCards } from "lucide-react";
const MotionDiv = motion.div;

export interface FormDataType {
  storySubject: string;
  storyType: string;
  ageCategory: string;
  imageStyle: string;
}

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
  const [formData, setFormData] = useState<Partial<FormDataType>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [generationMessage, setGenerationMessage] = useState(
    "Writing your story draft...",
  );
  const { user } = useUser();
  const { getToken } = useAuth();
  const notify = (msg: string) => toast(msg);
  const notifyError = (msg: string) => toast.error(msg);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
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
    if (!user) {
      setWalletStatus(undefined);
      setWalletLoading(false);
      return;
    }

    const loadWallet = async () => {
      setWalletLoading(true);
      try {
        const token = await getToken();
        const status = await apiFetch<PollinationsStatus>(
          "/pollinations/status",
          { token },
        );
        if (!ignore) setWalletStatus(status);
      } catch (error) {
        console.error("Unable to load Pollinations wallet", error);
        if (!ignore) setWalletStatus(undefined);
      } finally {
        if (!ignore) setWalletLoading(false);
      }
    };

    loadWallet();
    return () => {
      ignore = true;
    };
  }, [getToken, user]);

  const connectPollinations = async () => {
    setWalletPending(true);
    try {
      const token = await getToken();
      const result = await apiFetch<{ authorizationUrl: string }>(
        "/pollinations/connect",
        { method: "POST", token },
      );
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      notifyError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to connect Pollinations wallet",
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
      ageGroup: formData.ageCategory,
      imageStyle: formData.imageStyle,
    };
  };

  const validateStoryRequest = () => {
    const body = buildRequestBody();
    if (
      !body.storySubject ||
      !body.storyType ||
      !body.ageGroup ||
      !body.imageStyle
    ) {
      notifyError("Please complete all story options before generating.");
      return null;
    }

    return body;
  };

  const GenerateStory = async (mode: "classic" | "interactive" = "classic") => {
    if (!user) {
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
      notifyError("Connect your Pollinations wallet before generating images");
      return;
    }

    const body = validateStoryRequest();
    if (!body) return;

    setLoading(true);
    setGenerationMessage("Writing your story draft...");
    try {
      const token = await getToken();
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

      if (result.storyId && user?.id) {
        sessionStorage.removeItem(`dashboard_stories_cache_v1_${user.id}`);
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
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020b1f] px-5 pb-12 md:px-16 lg:px-28 xl:px-40">
      <div className="tc-hero-grid absolute inset-0 opacity-35" />
      <div className="tc-hero-orb tc-hero-orb-one" />
      <div className="tc-hero-orb tc-hero-orb-two" />

      <div className="relative">
        <MotionDiv
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="tc-glass-panel mt-6 px-5 py-7 shadow-[0_16px_45px_rgba(0,0,0,0.35)] md:px-8"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="tc-title-gradient text-3xl font-extrabold sm:text-4xl md:text-5xl">
                Create Story
              </h1>
              <p className="tc-title-gradient mt-3 max-w-2xl text-sm leading-relaxed md:text-base">
                Configure your story prompt, visual style, and target audience.
                Choose a complete Classic book or a Plot Twist story where your
                decisions shape each new branch.
              </p>
            </div>
            <div className="inline-flex items-center rounded-xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-blue-100/90">
              <span className="tc-title-gradient text-sm font-medium">
                Credits left:
              </span>
              <span className="tc-title-gradient ml-2 text-xl font-bold">
                {userDetail?.credit ?? "-"}
              </span>
            </div>
          </div>
        </MotionDiv>

        {user && (
          <div className="mt-6 flex flex-col gap-4 border-y border-blue-300/15 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200">
                <WalletCards size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  Pollinations wallet
                </p>
                <p className="truncate text-sm text-blue-100/65">
                  {walletLoading
                    ? "Checking wallet connection..."
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
                            : "Connect to generate story images"}
                </p>
              </div>
            </div>
            {walletLoading ? (
              <LoaderCircle
                className="animate-spin text-cyan-300"
                size={20}
                aria-label="Checking wallet connection"
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
                className="tc-btn-primary px-5 py-5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                onClick={connectPollinations}
              >
                {walletPending ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Link2 size={18} />
                )}
                Connect wallet
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
          className="tc-glass-panel-soft mt-8 p-5 md:p-7"
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
          className="tc-glass-panel-soft mt-7 p-5 md:p-7"
        >
          <UploadImage setImageSubject={setStorySubject} />
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.14, duration: 0.5 }}
          className="tc-glass-panel-soft mt-7 p-5 md:p-7"
        >
          <StoryType userSelection={onHandleUserSelection} />
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.16, duration: 0.5 }}
          className="tc-glass-panel-soft mt-7 p-5 md:p-7"
        >
          <ImageStyle userSelection={onHandleUserSelection} />
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.18, duration: 0.5 }}
          className="tc-glass-panel-soft mt-7 p-5 md:p-7"
        >
          <AgeCategory userSelection={onHandleUserSelection} />
        </MotionDiv>

        <div className="mt-8 flex justify-end">
          <div className="flex flex-wrap items-center gap-3">
            {!user ? (
              <Button
                disabled={loading}
                className="tc-btn-primary px-8 py-6 text-base hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => GenerateStory("classic")}
              >
                Login to Create Story
              </Button>
            ) : (
              <>
                <Button
                  disabled={loading}
                  className="tc-btn-primary px-8 py-6 text-base hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => GenerateStory("interactive")}
                >
                  Create Plot Twist Story
                </Button>
                <Button
                  disabled={loading}
                  className="tc-btn-primary px-8 py-6 text-base hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
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
