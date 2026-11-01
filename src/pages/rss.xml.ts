import { feedResponse } from "../lib/feed";
import { getPublishedPosts } from "../lib/posts";

export async function GET({ site }: { site: URL }) {
  return feedResponse({
    site,
    title: "Aïmen Louafi — Writing",
    description: "Posts about AI engineering, films, and other things.",
    path: "/",
    posts: await getPublishedPosts(),
  });
}
