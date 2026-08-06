"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VcsPromptVersion } from "../hooks/use-vcs-prompts";
import PromptVersionDiff from "./PromptVersionDiff";
import VersionsList from "./VersionsList";

interface PromptVersionsViewProps {
  vcsId: string;
  promptKey: string;
  versions: VcsPromptVersion[];
  patchVersions: (updater: (list: VcsPromptVersion[]) => VcsPromptVersion[]) => void;
  onChanged: () => void;
}

const mostRecentRetired = (versions: VcsPromptVersion[]) =>
  [...versions]
    .filter((v) => v.status === "retired")
    .sort(
      (a, b) =>
        new Date(b.deployedAt || b.updatedAt).getTime() -
        new Date(a.deployedAt || a.updatedAt).getTime(),
    )[0] || null;

const PromptVersionsView = ({
  vcsId,
  promptKey,
  versions,
  patchVersions,
  onChanged,
}: PromptVersionsViewProps) => {
  const [pair, setPair] = useState<VcsPromptVersion[]>([]);

  useEffect(() => {
    if (versions.length === 0) {
      setPair([]);
      return;
    }
    const live = versions.find((v) => v.status === "live") || null;
    const draft = versions.find((v) => v.status === "draft") || null;
    const other = draft || mostRecentRetired(versions);
    setPair([live, other].filter(Boolean) as VcsPromptVersion[]);
    // Reset the comparison pair whenever the underlying version list is
    // reloaded for a different key — user-driven "View" clicks after that
    // are handled by handleView below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcsId]);

  const handleView = (version: VcsPromptVersion) => {
    setPair((prev) => {
      const withoutDup = prev.filter((v) => v.id !== version.id);
      return [...withoutDup, version].slice(-2);
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <Card className="flex-1 rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] lg:w-2/3">
        <CardContent className="h-full p-4">
          <PromptVersionDiff promptKey={promptKey} left={pair[0] || null} right={pair[1] || null} />
        </CardContent>
      </Card>
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] lg:w-1/3 lg:shrink-0">
        <CardContent className="p-4 lg:max-h-[600px] lg:overflow-y-auto">
          <VersionsList
            vcsId={vcsId}
            promptKey={promptKey}
            versions={versions}
            selectedIds={pair.map((v) => v.id)}
            onView={handleView}
            patchVersions={patchVersions}
            onChanged={onChanged}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptVersionsView;
