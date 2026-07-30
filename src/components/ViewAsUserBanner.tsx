"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAuthMutations } from "@/hooks/api/auth.api";

export default function ViewAsUserBanner() {
  const { user, isViewingAsUser, viewedByUserEmail } = useAuth();
  const router = useRouter();
  const { exitViewAsUserDomain } = useAuthMutations();

  // Only show if user is viewing as another user
  if (!isViewingAsUser || !user) {
    return null;
  }

  const handleExitViewAsUser = async () => {
    const toastId = toast.loading("Switching back to admin account...");
    
    try {
      if (!viewedByUserEmail) {
        toast.dismiss(toastId);
        toast.error("Original admin email not found");
        return;
      }

      await exitViewAsUserDomain.exitViewAsUser(viewedByUserEmail);
      
      toast.dismiss(toastId);
      toast.success("Successfully switched back to admin account");
      router.push("/admin/dashboard");
      
    } catch{
      toast.dismiss(toastId);
      toast.error("Failed to switch back to admin account");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-500 px-4 py-2.5 text-white shadow-[0_1px_10px_rgba(234,88,12,0.25)]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <AlertCircle size={16} />
        </span>
        <span className="text-sm font-medium">
          You are viewing as: <strong>{user.email}</strong>
        </span>
        {viewedByUserEmail && (
          <span className="text-xs opacity-90">
            (Admin: {viewedByUserEmail})
          </span>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExitViewAsUser}
        className="border-white/70 bg-transparent text-xs text-white transition-colors hover:border-white hover:bg-white hover:text-orange-600"
      >
        <LogOut size={14} className="mr-1" />
        Exit View As User
      </Button>
    </div>
  );
}