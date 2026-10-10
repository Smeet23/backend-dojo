import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/lesson/Callout";
import { MessageAnatomy } from "@/components/widgets/MessageAnatomy";
import { CorsFlow } from "@/components/widgets/CorsFlow";
import { StatusCodeFinder } from "@/components/widgets/StatusCodeFinder";
import { CacheFlow } from "@/components/widgets/CacheFlow";
import { IdempotencyLab } from "@/components/widgets/IdempotencyLab";
import { RequestJourney } from "@/components/widgets/RequestJourney";
import { RoadmapExplorer } from "@/components/widgets/RoadmapExplorer";
import { ConceptTranslator } from "@/components/widgets/ConceptTranslator";

const components: MDXComponents = {
  // Wide tables scroll inside their own box instead of the page.
  table: (props) => (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[32rem] text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold" {...props} />
    </div>
  ),
  Callout,
  MessageAnatomy,
  CorsFlow,
  StatusCodeFinder,
  CacheFlow,
  IdempotencyLab,
  RequestJourney,
  RoadmapExplorer,
  ConceptTranslator,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
