import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientContentService } from "@/services/clientContent.service";
import type {
  ClientContentGroup,
  ClientContentSection,
  UpdateClientContentPayload,
} from "@/types/clientContent.types";

export const CLIENT_CONTENT_QUERY_KEY = ["admin", "client-content"];

/** Fixed display order so the list never reshuffles between fetches. */
const GROUP_ORDER: ClientContentGroup[] = [
  "Payments",
  "CV Upload",
  "Client Preferences",
  "Features",
];

export function useClientContent() {
  const queryClient = useQueryClient();

  const sectionsQuery = useQuery<ClientContentSection[], Error>({
    queryKey: CLIENT_CONTENT_QUERY_KEY,
    queryFn: () => clientContentService.list(),
  });

  const updateSection = useMutation<
    ClientContentSection,
    Error,
    UpdateClientContentPayload
  >({
    mutationFn: (payload) => clientContentService.update(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<ClientContentSection[]>(
        CLIENT_CONTENT_QUERY_KEY,
        (current) =>
          current?.map((section) =>
            section.id === updated.id ? updated : section,
          ) ?? [updated],
      );
    },
  });

  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);

  const groupedSections = useMemo(() => {
    const groups = new Map<string, ClientContentSection[]>();
    sections.forEach((section) => {
      const existing = groups.get(section.group);
      if (existing) existing.push(section);
      else groups.set(section.group, [section]);
    });

    // Groups the backend adds later are unknown here, so they sort to the end
    // rather than disappearing from the screen.
    const rank = (group: string) => {
      const index = GROUP_ORDER.indexOf(group as ClientContentGroup);
      return index === -1 ? GROUP_ORDER.length : index;
    };

    return [...groups.entries()]
      .map(([group, groupSections]) => ({ group, sections: groupSections }))
      .sort((a, b) => rank(a.group) - rank(b.group) || a.group.localeCompare(b.group));
  }, [sections]);

  return {
    sectionsDomain: {
      data: sections,
      grouped: groupedSections,
      isLoading: sectionsQuery.isLoading,
      isError: sectionsQuery.isError,
      error: sectionsQuery.error,
      refetch: sectionsQuery.refetch,
    },
    actions: {
      updateSection: updateSection.mutateAsync,
      isSaving: updateSection.isPending,
    },
  };
}
