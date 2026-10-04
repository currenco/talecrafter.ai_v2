import { createContext } from 'react';

export type UserDetail = {
  id: string;
  authUserId: string;
  userEmail: string;
  userName: string | null;
  userImage: string | null;
  role: 'user' | 'admin';
  credit: number;
};

export type AuthUserSummary = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type UserDetailContextValue = {
  userDetail: UserDetail | undefined;
  setUserDetail: React.Dispatch<React.SetStateAction<UserDetail | undefined>>;
  authUser: AuthUserSummary | null;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
};

export const UserDetailContext = createContext<UserDetailContextValue>({
  userDetail: undefined,
  setUserDetail: () => undefined,
  authUser: null,
  isAuthLoaded: false,
  isSignedIn: false,
});
