// PlanEditorModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { PricingPlan } from "@/types/pricing.types";
import { useAdminMutations } from "@/hooks/api/admin.api";

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan | null;
  locationId: string | null;
  onPlanUpdated: () => void;
}

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({
  isOpen,
  onClose,
  plan,
  locationId,
  onPlanUpdated,
}) => {
  const [otherFeatures, setOtherFeatures] = useState<string[]>([""]);
  const { updatePricingPlanMutation } = useAdminMutations();

  // Refs for form fields
  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const profileLimitRef = useRef<HTMLInputElement>(null);
  const validityPeriodRef = useRef<HTMLInputElement>(null);
  const subscriptionBreakRef = useRef<HTMLInputElement>(null);
  const jobApplicationsRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (plan && isOpen) {
      setOtherFeatures(
        plan.extra ? plan.extra.split(",").map(f => f.trim()) : [""]
      );
      if (titleRef.current) titleRef.current.value = plan.title || "";
      if (priceRef.current) priceRef.current.value = String(plan.price ?? "");
      if (profileLimitRef.current)
        profileLimitRef.current.value = String(plan.profileLimit ?? "");
      if (validityPeriodRef.current)
        validityPeriodRef.current.value = plan.validityPeriod || "";
      if (subscriptionBreakRef.current)
        subscriptionBreakRef.current.value = plan.subscriptionBreak || "";
      if (jobApplicationsRef.current)
        jobApplicationsRef.current.value = String(plan.jobApplications ?? "");
    } else if (!isOpen) {
      setOtherFeatures([""]);
      formRef.current?.reset();
    }
  }, [plan, isOpen]);

  const addFeature = () => {
    if (otherFeatures.length < 3) {
      setOtherFeatures([...otherFeatures, ""]);
    }
  };

  const updateFeature = (index: number, value: string) => {
    const updatedFeatures = [...otherFeatures];
    updatedFeatures[index] = value;
    setOtherFeatures(updatedFeatures);
  };

  const removeFeature = (index: number) => {
    setOtherFeatures(otherFeatures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !locationId || updatePricingPlanMutation.isPending) return;

    const title = titleRef.current?.value;
    const price = priceRef.current?.value;
    const profileLimit = profileLimitRef.current?.value;
    const validityPeriod = validityPeriodRef.current?.value;
    const subscriptionBreak = subscriptionBreakRef.current?.value;
    const jobApplications = jobApplicationsRef.current?.value;

    if (
      !title ||
      !price ||
      !profileLimit ||
      !validityPeriod ||
      !subscriptionBreak ||
      !jobApplications
    ) {
      return;
    }

    const featurePayload: Partial<PricingPlan> = {
      title,
      price: parseInt(price, 10),
      profileLimit: parseInt(profileLimit, 10),
      validityPeriod,
      subscriptionBreak,
      jobApplications: parseInt(jobApplications, 10),
      extra: otherFeatures.filter((f) => f.trim() !== "").join(","),
    };

    updatePricingPlanMutation.mutate({
      planId: plan._id,
      feature: featurePayload,
    }, {
      onSuccess: () => {
        onPlanUpdated();
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-4 md:p-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg md:text-xl font-medium text-career-black-200">
            Edit Service: {plan?.title}
          </h1>
          <button
            onClick={onClose}
            className="text-2xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Fields using Refs */}
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm md:text-base">
                Service:
              </label>
              <input
                type="text"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="title"
                ref={titleRef}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="price" className="text-sm md:text-base">
                Price:
              </label>
              <input
                type="number"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="price"
                ref={priceRef}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="validityPeriod" className="text-sm md:text-base">
                Valid:
              </label>
              <input
                type="text"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="validityPeriod"
                ref={validityPeriodRef}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="subscriptionBreak"
                className="text-sm md:text-base"
              >
                Break:
              </label>
              <input
                type="text"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="subscriptionBreak"
                ref={subscriptionBreakRef}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="jobApplications" className="text-sm md:text-base">
                Job Application:
              </label>
              <input
                type="text"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="jobApplications"
                ref={jobApplicationsRef}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profileLimit" className="text-sm md:text-base">
                Client Profile:
              </label>
              <input
                type="number"
                required
                className="border border-gray-300 p-2 rounded-md w-full"
                id="profileLimit"
                ref={profileLimitRef}
              />
            </div>
          </div>

          {/* Other Features Section */}
          <div className="flex flex-col gap-4 mt-4 mb-4 border-t pt-4">
            <h2 className="text-md font-medium">Other Features (Max 3)</h2>
            {otherFeatures.map((feature, index) => (
              <div key={index} className="flex flex-col gap-2">
                <label
                  htmlFor={`feature-${index}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Feature {index + 1}:
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    id={`feature-${index}`}
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="border border-gray-300 rounded-md p-2 w-full focus:ring focus:ring-blue-500"
                    maxLength={100} // Add max length if appropriate
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-2 bg-red-500 text-white rounded-md focus:ring focus:ring-red-300 hover:bg-red-600"
                    aria-label="Remove feature"
                  >
                    −
                  </button>
                </div>
              </div>
            ))}

            {otherFeatures.length < 3 && (
              <button
                type="button"
                onClick={addFeature}
                className="bg-green-500 text-white rounded-md px-4 py-2 w-full flex items-center justify-center focus:ring focus:ring-green-300 hover:bg-green-600"
                aria-label="Add feature"
              >
                + Add Feature
              </button>
            )}
          </div>

          <div className="col-span-2 flex justify-end items-center gap-3 mt-5 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updatePricingPlanMutation.isPending}
              className="bg-gray-200 text-gray-700 rounded-md px-4 py-2 md:px-6 md:py-3 hover:bg-gray-300 disabled:opacity-50"
            >
              <p className="text-sm md:text-base">Cancel</p>
            </button>
            <button
              type="submit"
              disabled={updatePricingPlanMutation.isPending}
              className="bg-[#008ED3] text-white rounded-md px-4 py-2 md:px-6 md:py-3 hover:bg-blue-700 disabled:opacity-50"
            >
              <p className="text-sm md:text-base">
                {updatePricingPlanMutation.isPending ? "Saving..." : "Save Changes"}
              </p>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanEditorModal;
