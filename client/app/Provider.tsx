"use client";

import { useEffect, useState } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth, useUser } from "@/lib/neon-auth/client";
import {
  UserDetailContext,
  type UserDetail,
} from "./_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const [userDetail, setUserDetail] = useState<UserDetail>();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const authUserId = user?.id;

  useEffect(() => {
    let ignore = false;

    const syncCurrentUser = async () => {
      if (!isLoaded) return;

      if (!authUserId) {
        setUserDetail(undefined);
        return;
      }

      try {
        const token = await getToken();
        const currentUser = await apiFetch<UserDetail>("/users/me", { token });
        if (!ignore) setUserDetail(currentUser);
      } catch (error) {
        console.error("Unable to sync current user", error);
        if (!ignore) setUserDetail(undefined);
      }
    };

    syncCurrentUser();

    return () => {
      ignore = true;
    };
  }, [authUserId, getToken, isLoaded]);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      <NextUIProvider>
        {children}
        <ToastContainer />
      </NextUIProvider>
    </UserDetailContext.Provider>
  );
};

export default Provider;
