"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import bcrypt from "bcryptjs";
import { produce } from "immer";
import { DEFAULT_USER_SEED, SUPPORTED_ROLES } from "@/lib/defaults";
import type { Role, User } from "@/types";

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  signature?: string;
}

interface AuthState {
  users: User[];
  currentUser: User | null;
  bootstrapped: boolean;
  bootstrap: () => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  registerUser: (input: RegisterUserInput, actorId: string) => Promise<User>;
  updateSignature: (userId: string, signature: string) => void;
  verifyPassword: (userId: string, password: string) => Promise<boolean>;
  toggleUserState: (userId: string, enabled: boolean) => void;
}

const buildDefaultUsers = (): User[] => {
  return DEFAULT_USER_SEED.map((seed) => ({
    ...seed,
    id: crypto.randomUUID(),
  }));
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      bootstrapped: false,
      bootstrap: () => {
        const state = get();
        if (state.bootstrapped) {
          return;
        }

        const defaultUsers = buildDefaultUsers();
        set(
          produce<AuthState>((draft) => {
            draft.users = defaultUsers;
            draft.bootstrapped = true;
          }),
        );
      },
      login: async (email, password) => {
        const { users } = get();
        const normalizedEmail = email.trim().toLowerCase();
        const user = users.find(
          (candidate) => candidate.email.toLowerCase() === normalizedEmail,
        );

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        if (!user.enabled) {
          throw new Error("Account is disabled. Contact QA administration.");
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          throw new Error("Invalid credentials.");
        }

        const updatedUser = {
          ...user,
          lastLoginAt: new Date().toISOString(),
        };

        set(
          produce<AuthState>((draft) => {
            draft.users = draft.users.map((candidate) =>
              candidate.id === updatedUser.id ? updatedUser : candidate,
            );
            draft.currentUser = updatedUser;
          }),
        );

        return updatedUser;
      },
      logout: () => {
        set(
          produce<AuthState>((draft) => {
            draft.currentUser = null;
          }),
        );
      },
      registerUser: async (input, actorId) => {
        const { users } = get();
        const actor = users.find((user) => user.id === actorId);

        if (!actor || actor.role !== "Admin") {
          throw new Error("Only administrators can provision new users.");
        }

        if (!SUPPORTED_ROLES.includes(input.role)) {
          throw new Error("Unsupported role selected.");
        }

        const exists = users.some(
          (user) => user.email.toLowerCase() === input.email.toLowerCase(),
        );
        if (exists) {
          throw new Error("User with this email already exists.");
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        const newUser: User = {
          id: crypto.randomUUID(),
          name: input.name,
          email: input.email.toLowerCase(),
          role: input.role,
          passwordHash,
          signature: input.signature,
          lastLoginAt: undefined,
          enabled: true,
        };

        set(
          produce<AuthState>((draft) => {
            draft.users.unshift(newUser);
          }),
        );

        return newUser;
      },
      updateSignature: (userId, signature) => {
        set(
          produce<AuthState>((draft) => {
            draft.users = draft.users.map((user) =>
              user.id === userId ? { ...user, signature } : user,
            );
            if (draft.currentUser?.id === userId) {
              draft.currentUser = { ...draft.currentUser, signature };
            }
          }),
        );
      },
      verifyPassword: async (userId, password) => {
        const { users } = get();
        const user = users.find((candidate) => candidate.id === userId);
        if (!user) {
          return false;
        }

        return bcrypt.compare(password, user.passwordHash);
      },
      toggleUserState: (userId, enabled) => {
        set(
          produce<AuthState>((draft) => {
            draft.users = draft.users.map((user) =>
              user.id === userId ? { ...user, enabled } : user,
            );
          }),
        );
      },
    }),
    {
      name: "document-management-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
        bootstrapped: state.bootstrapped,
      }),
      version: 1,
      skipHydration: true,
    },
  ),
);
