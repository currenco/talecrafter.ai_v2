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

type UserDetailContextValue = {
  userDetail: UserDetail | undefined;
  setUserDetail: React.Dispatch<React.SetStateAction<UserDetail | undefined>>;
};

export const UserDetailContext = createContext<UserDetailContextValue>({
  userDetail: undefined,
  setUserDetail: () => undefined,
});
