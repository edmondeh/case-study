import { CommentingApp } from "../components/CommentingApp";
import { SetupRequired } from "../components/SetupRequired";
import { getImage, getRoomId, parseRoomVariant } from "../lib/rooms";

type PageProps = {
  searchParams: Promise<{
    image?: string | string[];
    room?: string | string[];
  }>;
};

// Render per request so the env check runs at request time. Otherwise a
// build made without a key would serve the setup screen forever.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return <SetupRequired />;
  }

  const { image: imageParam, room } = await searchParams;
  const image = getImage(single(imageParam));
  const roomId = getRoomId(image, parseRoomVariant(single(room)));
  return <CommentingApp image={image} roomId={roomId} />;
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
