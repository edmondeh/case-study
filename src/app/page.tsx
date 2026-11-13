import { CommentingApp } from "../components/CommentingApp";
import { SetupRequired } from "../components/SetupRequired";
import { getImage } from "../lib/rooms";

type PageProps = {
  searchParams: Promise<{ image?: string | string[] }>;
};

// Render per request so the env check runs at request time. Otherwise a
// build made without a key would serve the setup screen forever.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return <SetupRequired />;
  }

  const { image } = await searchParams;
  const imageId = typeof image === "string" ? image : undefined;
  return <CommentingApp image={getImage(imageId)} />;
}
