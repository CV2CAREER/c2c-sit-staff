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
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
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
        className="bg-transparent border-white text-white hover:bg-white hover:text-orange-500 text-xs"
      >
        <LogOut size={14} className="mr-1" />
        Exit View As User
      </Button>
    </div>
  );
}