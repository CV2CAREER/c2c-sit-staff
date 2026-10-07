"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/user.store";
import { useFaq } from "@/hooks/useFaq";
import type { FaqArticle, FaqAuthorStatus, FaqGap, SaveFaqArticlePayload } from "@/types/faq.types";
import { ConfirmModal } from "@/app/admin/communication/client-content/_modals/ConfirmModal";
import { FaqFormModal } from "../_modals/FaqFormModal";
import { AddCategoryModal } from "../_modals/AddCategoryModal";
import { PublishedTab } from "./PublishedTab";
import { CategoriesTab } from "./CategoriesTab";
import { ReviewQueueTab } from "./ReviewQueueTab";
import { GapLogTab } from "./GapLogTab";

type FaqTab = "published" | "categories" | "review" | "gaps";

const TAB_TRIGGER_CLASS =
  "relative whitespace-nowrap px-4 py-2.5 text-[13px] font-medium text-[#475569] transition-colors hover:text-[#10365A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B96D6]/40 data-[state=active]:text-[#0B96D6] data-[state=active]:font-semibold data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[#0B96D6] rounded-none gap-2";

function CountPill({ count, highlight = false }: { count: number; highlight?: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        highlight ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  );
}

export default function FaqPage() {
  const isAdmin = useAuthStore((s) => s.user?.role) === "admin";
  const [tab, setTab] = useState<FaqTab>("published");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FaqArticle | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleting, setDeleting] = useState<FaqArticle | null>(null);
  const [approving, setApproving] = useState<FaqArticle | null>(null);
  // Set while writing an answer for a Gap Log question.
  const [fromGap, setFromGap] = useState<FaqGap | null>(null);

  const { articlesDomain, categoriesDomain, gapsDomain, actions } = useFaq();
  const gaps = gapsDomain.data;
  const { published, reviewQueue } = articlesDomain;
  const categories = categoriesDomain.data;

  const isLoading = articlesDomain.isLoading || categoriesDomain.isLoading;
  const loadError = articlesDomain.error || categoriesDomain.error;
  const refetchAll = () => {
    void articlesDomain.refetch();
    void categoriesDomain.refetch();
    void gapsDomain.refetch();
  };

  const runAction = async (work: () => Promise<unknown>, loading: string, success: string) => {
    const toastId = toast.loading(loading);
    try {
      await work();
      toast.dismiss(toastId);
      toast.success(success);
      return true;
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    }
  };

  const openNew = () => {
    setEditing(null);
    setFromGap(null);
    setFormOpen(true);
  };

  const openFromGap = (gap: FaqGap) => {
    setEditing(null);
    setFromGap(gap);
    setFormOpen(true);
  };

  const dismissGap = (gap: FaqGap) =>
    void runAction(
      () => actions.updateGap({ id: gap.id, status: "dismissed" }),
      "Dismissing...",
      "Gap dismissed. It reopens if someone asks it again.",
    );

  const openEdit = (article: FaqArticle) => {
    setEditing(article);
    setFormOpen(true);
  };

  const handleSave = async (
    values: Omit<SaveFaqArticlePayload, "status">,
    status: FaqAuthorStatus,
  ) => {
    const gap = fromGap;
    const ok = await runAction(
      async () => {
        const article = await actions.saveArticle({ ...values, status, id: editing?.id });
        // The question now has a draft answer — take it off the open Gap Log.
        if (gap) await actions.updateGap({ id: gap.id, status: "converted", faqArticleId: article?.id });
      },
      "Saving FAQ...",
      status === "in_review" ? "FAQ sent for review." : "FAQ saved as draft.",
    );
    if (!ok) return;
    setFormOpen(false);
    setEditing(null);
    setFromGap(null);
    setTab("review");
  };

  const handleAddCategory = async (name: string) => {
    const ok = await runAction(
      () => actions.createCategory(name),
      "Adding category...",
      `Category "${name}" added.`,
    );
    if (ok) setCategoryOpen(false);
  };

  return (
    <div className="bg-white flex flex-col gap-6 p-5">
      <PageHeader
        title="FAQ"
        description="The single source of truth for the FAQ page and the chatbot. Replaces Train Chatbot."
        renderJSX={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={refetchAll}
              disabled={isLoading}
            >
              <RotateCw className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            {tab === "categories" ? (
              isAdmin && (
                <Button className="text-sm" onClick={() => setCategoryOpen(true)}>
                  <Plus /> Add category
                </Button>
              )
            ) : (
              <Button
                className="text-sm"
                onClick={openNew}
                disabled={categories.length === 0}
              >
                <Plus /> Add FAQ
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
          <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-red-200 bg-red-50 py-10 text-center">
          <p className="text-sm text-red-700">{loadError.message || "We could not load the FAQ."}</p>
          <Button variant="outline" onClick={refetchAll}>
            Try again
          </Button>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as FaqTab)}>
          <TabsList className="flex h-auto w-full items-center justify-start gap-0 overflow-x-auto border-b border-gray-200 bg-transparent p-0 text-muted-foreground">
            <TabsTrigger value="published" className={TAB_TRIGGER_CLASS}>
              Published FAQs <CountPill count={published.length} />
            </TabsTrigger>
            <TabsTrigger value="categories" className={TAB_TRIGGER_CLASS}>
              Categories <CountPill count={categories.length} />
            </TabsTrigger>
            <TabsTrigger value="review" className={TAB_TRIGGER_CLASS}>
              Review Queue{" "}
              <CountPill count={reviewQueue.length} highlight={reviewQueue.length > 0} />
            </TabsTrigger>
            <TabsTrigger value="gaps" className={TAB_TRIGGER_CLASS}>
              Gap Log <CountPill count={gaps.length} highlight={gaps.length > 0} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="pt-4">
            <PublishedTab articles={published} onEdit={openEdit} />
          </TabsContent>
          <TabsContent value="categories" className="pt-4">
            <CategoriesTab categories={categories} />
          </TabsContent>
          <TabsContent value="review" className="pt-4">
            <ReviewQueueTab
              articles={reviewQueue}
              canApprove={isAdmin}
              isBusy={actions.isUpdatingStatus}
              onEdit={openEdit}
              onSubmit={(article) =>
                void runAction(
                  () => actions.submitForReview(article.id),
                  "Sending for review...",
                  `${article.code} sent for review.`,
                )
              }
              onApprove={setApproving}
              onReturn={(article) =>
                void runAction(
                  () => actions.returnToDraft(article.id),
                  "Sending back to draft...",
                  `${article.code} sent back to draft.`,
                )
              }
              onDelete={setDeleting}
            />
          </TabsContent>
          <TabsContent value="gaps" className="pt-4">
            <GapLogTab
              gaps={gaps}
              isLoading={gapsDomain.isLoading}
              isBusy={actions.isUpdatingGap || actions.isSavingArticle}
              onWriteAnswer={openFromGap}
              onDismiss={dismissGap}
            />
          </TabsContent>
        </Tabs>
      )}

      <FaqFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setFromGap(null);
        }}
        article={editing}
        initialQuestion={fromGap?.question}
        categories={categories}
        onSave={handleSave}
        isSaving={actions.isSavingArticle}
      />

      <AddCategoryModal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        categories={categories}
        onSave={handleAddCategory}
        isSaving={actions.isCreatingCategory}
      />

      <ConfirmModal
        open={!!approving}
        onClose={() => setApproving(null)}
        onConfirm={async () => {
          if (!approving) return;
          const ok = await runAction(
            () => actions.approve(approving.id),
            "Publishing...",
            `${approving.code} is live.`,
          );
          if (ok) {
            setApproving(null);
            setTab("published");
          }
        }}
        title="Approve and publish this FAQ?"
        message={
          <>
            &quot;{approving?.question}&quot; will go live on the FAQ page immediately
            {approving?.botAnswerable ? ", and the chatbot may answer from it." : "."}
          </>
        }
        confirmLabel="Approve & publish"
        loading={actions.isUpdatingStatus}
      />

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await runAction(
            () => actions.removeArticle(deleting.id),
            "Deleting...",
            `${deleting.code} deleted.`,
          );
          if (ok) setDeleting(null);
        }}
        title="Delete this FAQ?"
        message={<>&quot;{deleting?.question}&quot; will be removed from the Review Queue.</>}
        confirmLabel="Delete"
        variant="destructive"
        loading={actions.isUpdatingStatus}
      />
    </div>
  );
}
