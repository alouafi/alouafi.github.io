export const profile = {
  name: "Aïmen Louafi",
  role: "AI Engineer",
  employer: "Mistral AI",
  portrait: "/assets/img/profile-placeholder.svg",
  links: {
    github: "https://github.com/alouafi",
    linkedin: "https://www.linkedin.com/in/aimen-louafi",
  },
} as const;

export const selectedWork = [
  {
    context: "Mistral AI · Agent infrastructure · 2026—",
    title: ["Reliable tools for", "tool-using agents"],
    description:
      "Reusable MCP mocks, automated builders, and harness-level evaluation designed to turn brittle connector behavior into testable infrastructure.",
    highlights: [
      "Evaluation at trajectory scale",
      "Reusable RL environment tooling",
      "Production reliability",
    ],
  },
  {
    context: "Doctrine · Retrieval & legal AI · 2021—2026",
    title: ["Retrieval that earns", "the citation"],
    description:
      "Production RAG across enterprise documents and court decisions: query understanding, hybrid retrieval, reranking, orchestration, and end-to-end evaluation.",
    highlights: [
      "Domain embedding fine-tuning",
      "Legal knowledge graphs",
      "LLM-as-a-judge evaluation",
    ],
  },
  {
    context: "University of Tokyo · Speech research · 2016—2017",
    title: ["Finding the invariant", "inside the signal"],
    description:
      "Speaker-independent geometric representations of speech, taken from mathematical theory to an isolated-word recognition system.",
    highlights: [
      "75% → 96% accuracy",
      "Geometry & statistics",
      "MATLAB, C, Bash",
    ],
  },
] as const;
