import { feedResponse } from "../../lib/feed";
import {
  getPublishedPosts,
  topicHref,
  topicPages,
  topics,
  type Topic,
} from "../../lib/posts";

export function getStaticPaths() {
  return topics.map((topic) => ({
    params: { topic: topicPages[topic].slug },
    props: { topic },
  }));
}

export async function GET({
  site,
  props,
}: {
  site: URL;
  props: { topic: Topic };
}) {
  const { label } = topicPages[props.topic];
  return feedResponse({
    site,
    title: `Aïmen Louafi — ${label}`,
    description: `${label} posts by Aïmen Louafi.`,
    path: topicHref(props.topic),
    posts: (await getPublishedPosts()).filter(
      (post) => post.data.topic === props.topic,
    ),
  });
}
