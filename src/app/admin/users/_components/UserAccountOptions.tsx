import Icon from "../../../../../public/icons"
import { Menu, MenuHandler, MenuItem, MenuList } from "@material-tailwind/react";
import { useState } from "react";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import FurtherUserAccountActions from "./FurtherUserAccountActions";
import { useMutateData } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_USER_PLAN_UPGRADE, ADMIN_ACTIVATE_CORAL, ADMIN_DEACTIVATE_CORAL, ADMIN_GENERATE_AMBASSADOR_LINK } from "@/constants/apiEndpoints/admin.endpoint";
import axiosInstance from "@/services/api-client";
import {
    Crown, PowerOff, ShieldCheck, Link2, Upload, ArrowUp,
    CalendarDays, Clock, CheckCircle2, AlertTriangle, ChevronDown, Sparkles, Copy, Check
} from "lucide-react";

const UserAccountOptions = ({ userId }: { userId: string }) => {
    const { featureTitlesDomain: planOptions, userDetailDomain: userData } = useAdminQueries({
        fetchFeatureTitles: true,
        userId,
        fetchUserDetail: true,
    });
    const plans = planOptions?.data?.features || []
    const user = userData?.data?.user;
    const isAmbassador = user?.isAmbassador === true;
    const hasCoralActive = isAmbassador && user?.plan?.toLowerCase() === "coral" && user?.isUserSubscribed === true;
    const activePlan = user?.activePlan as any;

    const [showModal, setShowModal] = useState(false)
    const [showCoralModal, setShowCoralModal] = useState(false)
    const [showDeactivateModal, setShowDeactivateModal] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [ambassadorLink, setAmbassadorLink] = useState<string>("")
    const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined)
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>(undefined)
    const [isGeneratingLink, setIsGeneratingLink] = useState(false)

    const handleGenerateAmbassadorLink = async () => {
        setIsGeneratingLink(true)
        try {
            const res = await axiosInstance.get(ADMIN_GENERATE_AMBASSADOR_LINK(userId))
            const link: string = res.data?.data?.link
            setAmbassadorLink(link)
            setShowLinkModal(true)
        } catch {
            toast.error("Failed to generate ambassador link")
        } finally {
            setIsGeneratingLink(false)
        }
    }

    const daysRemaining = activePlan?.expiresAt
        ? Math.ceil((new Date(activePlan.expiresAt).getTime() - Date.now()) / 86400000)
        : null;

    return (
        <div className="flex flex-col gap-3 w-full lg:w-auto">
            {/* Coral plan card */}
            {isAmbassador && hasCoralActive && activePlan && (
                <div className="rounded-xl overflow-hidden border border-orange-200 shadow-sm">
                    <div className="bg-gradient-to-r from-orange-500 to-rose-400 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-white" />
                            <span className="text-white text-sm font-semibold tracking-wide">Plan Active</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                    </div>
                    <div className="bg-orange-50 px-4 py-3 space-y-2.5">
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-orange-800">
                            {activePlan.expiresAt && (
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
                                    <span className="text-orange-600">Expires:</span>
                                    <span className="font-medium">
                                        {new Date(activePlan.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                </span>
                            )}
                            {daysRemaining != null && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                                    <span className={daysRemaining > 0 ? "font-medium text-orange-800" : "font-medium text-red-600"}>
                                        {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining` : "Expired"}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
                <UpgradePlanOptions
                    setSelectedPlan={setSelectedPlan}
                    setSelectedFeatureId={setSelectedFeatureId}
                    setShowModal={setShowModal}
                    plans={plans}
                />

                {isAmbassador && (
                    <>
                        {hasCoralActive ? (
                            <button
                                onClick={() => setShowDeactivateModal(true)}
                                className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                                <PowerOff className="w-4 h-4" />
                                Deactivate Coral
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowCoralModal(true)}
                                className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Activate Coral
                            </button>
                        )}
                        <button
                            onClick={handleGenerateAmbassadorLink}
                            disabled={isGeneratingLink}
                            className="inline-flex items-center gap-2 bg-career-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-career-blue-900 transition-colors disabled:opacity-60"
                        >
                            <Link2 className="w-4 h-4" />
                            {isGeneratingLink ? "Copying..." : "Copy Ambassador Link"}
                        </button>
                    </>
                )}

                <button className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    Export
                </button>
                <FurtherUserAccountActions userId={userId} />
            </div>

            {showModal && (
                <UpgradeAccountModal
                    isOpen={showModal}
                    toggleOpen={setShowModal}
                    tier={selectedPlan as string}
                    featureId={selectedFeatureId as string}
                    userId={userId}
                />
            )}
            {showCoralModal && <ActivateCoralModal isOpen={showCoralModal} toggleOpen={setShowCoralModal} userId={userId} />}
            {showDeactivateModal && <DeactivateCoralModal isOpen={showDeactivateModal} toggleOpen={setShowDeactivateModal} userId={userId} />}
            {showLinkModal && <AmbassadorLinkModal isOpen={showLinkModal} toggleOpen={setShowLinkModal} link={ambassadorLink} />}
        </div>
    )
}

export default UserAccountOptions

// ─── Modals ───────────────────────────────────────────────────────────────────

const UpgradeAccountModal = ({ isOpen, toggleOpen, tier, featureId, userId }: {
    isOpen: boolean; toggleOpen: (value: boolean) => void; tier: string; featureId: string; userId: string;
}) => {
    const queryClient = useQueryClient();
    const upgradePlanMutation = useMutateData<any, { featureId: string }>({
        method: "PATCH",
        url: ADMIN_USER_PLAN_UPGRADE(userId),
        mutationKey: ["admin-upgrade-plan-modal"],
        onSuccess: () => {
            toast.success("User plan upgraded successfully");
            queryClient.invalidateQueries({ queryKey: ["admin-fetch-plans"] });
            queryClient.invalidateQueries({ queryKey: ["admin-feature-titles"] });
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to upgrade user plan");
        },
    });

    const upgradePlan = () => {
        toast.loading("Updating user plan");
        upgradePlanMutation.mutate({ featureId }, {
            onError(error: any) {
                if (error?.response?.data?.message) toast.error(error.response.data.message);
            },
        });
        toggleOpen(false);
    };

    return (
        <AppModal isOpen={isOpen} onClose={() => toggleOpen(false)} title="Upgrade Account">
            <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <ArrowUp className="w-6 h-6 text-career-blue-800" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Confirm Plan Upgrade</h2>
                <p className="text-sm text-gray-500 mt-1">
                    You're about to upgrade this account to <span className="font-semibold text-gray-700">{tier}</span>.
                </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700 mb-5">
                This will immediately change the user's plan. Make sure they have been charged first.
            </div>
            <div className="flex gap-3">
                <Button
                    className="flex-1 h-10 rounded-lg bg-career-blue-800 text-white hover:bg-career-blue-900 text-sm font-medium"
                    onClick={upgradePlan}
                >
                    Confirm Upgrade
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 h-10 rounded-lg border-gray-200 text-gray-700 text-sm font-medium"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </AppModal>
    );
};

const ActivateCoralModal = ({ isOpen, toggleOpen, userId }: {
    isOpen: boolean; toggleOpen: (value: boolean) => void; userId: string;
}) => {
    const queryClient = useQueryClient();
    const activateCoralMutation = useMutateData<any, Record<string, never>>({
        method: "POST",
        url: ADMIN_ACTIVATE_CORAL(userId),
        mutationKey: ["admin-activate-coral", userId],
        onSuccess: () => {
            toast.success("Coral plan activated — 14 days added");
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to activate Coral plan");
        },
    });

    const handleActivate = () => {
        toast.loading("Activating Coral plan...");
        activateCoralMutation.mutate({}, {
            onError(error: any) {
                if (error?.response?.data?.message) toast.error(error.response.data.message);
            },
        });
        toggleOpen(false);
    };

    return (
        <AppModal isOpen={isOpen} onClose={() => toggleOpen(false)} title="Activate Coral Plan">
            <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Activate Coral Plan</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Grant this ambassador <span className="font-semibold text-gray-700">14 days</span> of Coral access.
                </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm text-orange-700 mb-5 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                A confirmation email will be sent to the ambassador once activated.
            </div>
            <div className="flex gap-3">
                <Button
                    className="flex-1 h-10 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-sm font-medium"
                    onClick={handleActivate}
                >
                    Activate
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 h-10 rounded-lg border-gray-200 text-gray-700 text-sm font-medium"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </AppModal>
    );
};

const DeactivateCoralModal = ({ isOpen, toggleOpen, userId }: {
    isOpen: boolean; toggleOpen: (value: boolean) => void; userId: string;
}) => {
    const queryClient = useQueryClient();
    const deactivateCoralMutation = useMutateData<any, Record<string, never>>({
        method: "DELETE",
        url: ADMIN_DEACTIVATE_CORAL(userId),
        mutationKey: ["admin-deactivate-coral", userId],
        onSuccess: () => {
            toast.success("Coral plan deactivated");
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to deactivate Coral plan");
        },
    });

    const handleDeactivate = () => {
        toast.loading("Deactivating Coral plan...");
        deactivateCoralMutation.mutate({}, {
            onError(error: any) {
                if (error?.response?.data?.message) toast.error(error.response.data.message);
            },
        });
        toggleOpen(false);
    };

    return (
        <AppModal isOpen={isOpen} onClose={() => toggleOpen(false)} title="Deactivate Coral Plan">
            <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                    <PowerOff className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Deactivate Coral Plan</h2>
                <p className="text-sm text-gray-500 mt-1">
                    This will immediately revoke the ambassador's Coral access.
                </p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 mb-5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                This action cannot be undone. You will need to reactivate Coral to restore access.
            </div>
            <div className="flex gap-3">
                <Button
                    className="flex-1 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                    onClick={handleDeactivate}
                >
                    Deactivate
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 h-10 rounded-lg border-gray-200 text-gray-700 text-sm font-medium"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </AppModal>
    );
};

// ─── Ambassador Link Modal ────────────────────────────────────────────────────

const AmbassadorLinkModal = ({ isOpen, toggleOpen, link }: {
    isOpen: boolean; toggleOpen: (value: boolean) => void; link: string;
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success("Link copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    return (
        <AppModal isOpen={isOpen} onClose={() => toggleOpen(false)} title="Ambassador Link">
            <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Link2 className="w-6 h-6 text-career-blue-800" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Ambassador Referral Link</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Share this link with the ambassador so they can refer new users.
                </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-5">
                <span className="flex-1 text-sm text-gray-700 break-all font-mono leading-snug">{link}</span>
                <button
                    onClick={handleCopy}
                    className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800"
                >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <Button
                className="w-full h-10 rounded-lg bg-career-blue-800 text-white hover:bg-career-blue-900 text-sm font-medium"
                onClick={() => toggleOpen(false)}
            >
                Done
            </Button>
        </AppModal>
    );
};

// ─── Upgrade dropdown ─────────────────────────────────────────────────────────

const UpgradePlanOptions = ({
    plans, setShowModal, setSelectedPlan, setSelectedFeatureId
}: {
    plans: any[];
    setShowModal: (show: boolean) => void;
    setSelectedPlan: (plan: string) => void;
    setSelectedFeatureId: (id: string) => void;
}) => {
    return (
        <Menu placement="bottom-start">
            <MenuHandler>
                <Button className="inline-flex items-center gap-2 bg-career-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-career-blue-900 transition-colors h-auto">
                    <ArrowUp className="w-4 h-4" />
                    Upgrade Account
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
            </MenuHandler>
            <MenuList
                placeholder=""
                onPointerEnterCapture={() => {}}
                onPointerLeaveCapture={() => {}}
                onResize={() => {}}
                onResizeCapture={() => {}}
                className="p-1 w-56 rounded-xl bg-white shadow-lg border border-gray-100 z-50"
            >
                {plans.map((plan) => (
                    <MenuItem
                        placeholder=""
                        onPointerEnterCapture={() => {}}
                        onPointerLeaveCapture={() => {}}
                        onResize={() => {}}
                        onResizeCapture={() => {}}
                        onClick={() => {
                            setSelectedPlan(plan.title);
                            setSelectedFeatureId(plan.id);
                            setShowModal(true);
                        }}
                        className="rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700 px-3 py-2"
                        key={plan.id}
                    >
                        {plan.title}
                    </MenuItem>
                ))}
            </MenuList>
        </Menu>
    );
};
