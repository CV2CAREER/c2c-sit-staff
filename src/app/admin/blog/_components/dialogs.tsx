"use client";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useBlogMutations } from "@/hooks/api/admin/blog";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";

interface PostActionDialogProps {
  activeDialog: DefaultActions | null;
  setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  postId: string;
}

export const PostActionDialogs: React.FC<PostActionDialogProps> = ({ activeDialog, setActiveDialog, postId }) => {
  const { softDeletePost, restorePost, deletePostPermanently } = useBlogMutations();

  const handleSoftDelete = () => {
    toast.promise(softDeletePost.mutateAsync(postId), {
      loading: "Moving to the Recycle bin...",
      success: "Post has been moved to the Recycle bin",
      error: "Could not move post to the Recycle bin",
    });
    setActiveDialog(null);
  };

  const handleRestore = () => {
    toast.promise(restorePost.mutateAsync(postId), {
      loading: "Restoring post...",
      success: "Post has been restored successfully",
      error: "Could not restore post",
    });
    setActiveDialog(null);
  };

  const handleDeletePermanently = () => {
    toast.promise(deletePostPermanently.mutateAsync(postId), {
      loading: "Deleting post permanently...",
      success: "Post has been deleted permanently.",
      error: "Could not delete post.",
    });
    setActiveDialog(null);
  };

  return (
    <>
      {/* Move Post to Recycle Bin */}
      <Dialog
        open={activeDialog === "soft-delete"}
        onOpenChange={() => setActiveDialog(null)}
      >
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This post will be moved to the Recycle bin.
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleSoftDelete}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Post */}
      <Dialog
        open={activeDialog === "restore"}
        onOpenChange={() => setActiveDialog(null)}
      >
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This post will be removed from the trash and restored to active posts.
          </DialogDescription>
          <DialogFooter>
            <Button
              onClick={handleRestore}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Permanently Delete Post */}
      < Dialog
        open={activeDialog === "delete"
        }
        onOpenChange={() => setActiveDialog(null)}
      >
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This post will be deleted permanently!
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeletePermanently}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </>
  );
};