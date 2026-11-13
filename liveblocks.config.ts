declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    // Where a thread is pinned on the image, normalized to 0..1 of the
    // image's width and height (see src/lib/geometry.ts). Not pixels, so
    // it is independent of zoom, pan and screen size.
    ThreadMetadata: {
      x: number;
      y: number;
    };
  }
}

export {};
