"use client";

import { useCallback, useEffect, useState } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAccessToken, useUser } from "@/lib/neon-auth/client";
import {
  UserDetailContext,
  type UserDetail,
} from "./_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import SmoothScroll from "./(components)/SmoothScroll";

const PROFILE_CACHE_TTL_MS = 5 * 60_000;
const profileCache = new Map<
  string,
  { value: UserDetail; expiresAt: number }
>();
const profileRequests = new Map<string, Promise<UserDetail>>();

const fetchCurrentUser = (authUserId: string) => {
  const cached = profileCache.get(authUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }

  const pending = profileRequests.get(authUserId);
  if (pending) return pending;

  const request = getAccessToken()
    .then((token) => apiFetch<UserDetail>("/users/me", { token }))
    .then((currentUser) => {
      profileCache.set(authUserId, {
        value: currentUser,
        expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
      });
      return currentUser;
    })
    .finally(() => profileRequests.delete(authUserId));

  profileRequests.set(authUserId, request);
  return request;
};

const Provider = ({ children }: { children: React.ReactNode }) => {
  const [userDetail, setUserDetailState] = useState<UserDetail>();
  const { user, isLoaded, isSignedIn } = useUser();
  const authUserId = user?.id;

  const setUserDetail: React.Dispatch<
    React.SetStateAction<UserDetail | undefined>
  > = useCallback(
    (nextValue) => {
      setUserDetailState((previousValue) => {
        const next =
          typeof nextValue === "function"
            ? nextValue(previousValue)
            : nextValue;

        if (authUserId) {
          if (next) {
            profileCache.set(authUserId, {
              value: next,
              expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
            });
          } else {
            profileCache.delete(authUserId);
          }
        }

        return next;
      });
    },
    [authUserId]
  );

  useEffect(() => {
    let ignore = false;

    const syncCurrentUser = async () => {
      if (!isLoaded) return;

      if (!authUserId) {
        setUserDetail(undefined);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(authUserId);
        if (!ignore) setUserDetail(currentUser);
      } catch (error) {
        console.error("Unable to sync current user", error);
      }
    };

    syncCurrentUser();

    return () => {
      ignore = true;
    };
  }, [authUserId, isLoaded, setUserDetail]);

  return (
    <UserDetailContext.Provider
      value={{
        userDetail,
        setUserDetail,
        authUser: user ?? null,
        isAuthLoaded: isLoaded,
        isSignedIn,
      }}
    >
      <NextUIProvider>
        <SmoothScroll />
        {children}
        <ToastContainer
          theme="dark"
          toastClassName="!border !border-[#d8c69e]/20 !bg-[#111d2b] !text-[#f1eadb]"
          progressClassName="!bg-[#d8c69e]"
        />
      </NextUIProvider>
    </UserDetailContext.Provider>
  );
};

export default Provider;
