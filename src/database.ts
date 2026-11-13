/**
 * Stand-in for a real user database (from the Liveblocks example). Users
 * are identified as "user-<index>".
 */

export type User = {
  id: string;
  info: { name: string; avatar: string };
};

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];

export const USERS: readonly User[] = NAMES.map((name, index) => ({
  id: `user-${index}`,
  info: {
    name,
    avatar: `https://liveblocks.io/avatars/avatar-${index}.png`,
  },
}));

export function getUser(id: string | null | undefined): User | undefined {
  return USERS.find((user) => user.id === id);
}

export function getRandomUser(): User {
  return USERS[Math.floor(Math.random() * USERS.length)];
}
