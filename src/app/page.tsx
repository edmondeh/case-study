import { CommentingApp } from "../components/CommentingApp";
import { getImage } from "../lib/rooms";

type PageProps = {
  searchParams: Promise<{ image?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { image } = await searchParams;
  const imageId = typeof image === "string" ? image : undefined;
  return <CommentingApp image={getImage(imageId)} />;
}
