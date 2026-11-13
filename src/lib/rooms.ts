/**
 * Images that can be commented on, and the Liveblocks room for each.
 *
 * Every image gets its own room, so its comments (and their anchors) only
 * ever belong to that image.
 */

export type CanvasImage = {
  id: string;
  src: string;
  alt: string;
};

export const IMAGES = {
  "landing-page": {
    id: "landing-page",
    src: "/images/landing-page.svg",
    alt: "Design mock-up of a product landing page",
  },
  // Points at a file that does not exist. Open /?image=broken to see how
  // the app handles an image that fails to load.
  broken: {
    id: "broken",
    src: "/images/this-image-does-not-exist.png",
    alt: "An image that fails to load",
  },
} satisfies Record<string, CanvasImage>;

export const DEFAULT_IMAGE: CanvasImage = IMAGES["landing-page"];

export function getImage(id: string | undefined): CanvasImage {
  if (id && Object.hasOwn(IMAGES, id)) {
    return IMAGES[id as keyof typeof IMAGES];
  }
  return DEFAULT_IMAGE;
}

/** Room ids start with this prefix; the auth route only grants these. */
export const ROOM_PREFIX = "image-comments:";

export function getRoomId(image: CanvasImage): string {
  return `${ROOM_PREFIX}${image.id}`;
}
