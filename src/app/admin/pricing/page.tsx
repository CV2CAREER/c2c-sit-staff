// CV2C-Staff/app/admin/pricing/page.tsx;
"use client";
import React, { useState, useMemo } from "react";
import LocationSelector from "./_components/locationSelector";
import MultiplierEditor from "./_components/multiplierEditor";
import PlanEditorModal from "./_components/planEditorModal";
import { PricingPlan } from "@/types/pricing.types";
import { useAdminQueries } from "@/hooks/api/admin.api";
// import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader/PageHeader";
import PlansAndPricing from "./_components/PlansAndPricing";

import "./plan.css";

function PricingAdminPage() {
  // const { user } = useAuth();
  // const [activePlanIndex, setActivePlanIndex] = useState<number>(-1);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PricingPlan | null>(null);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string>("AUD");

  // --- Data Fetching ---
  const { adminLocationsDomain } = useAdminQueries({ fetchAdminLocations: true });
  
  const locations = adminLocationsDomain.data || [];
  const activeLocation = useMemo(
    () => locations.find(loc => loc.currencyCode === selectedLocationCode),
    [locations, selectedLocationCode]
  );

  const { pricingPlansDomain } = useAdminQueries({ 
    fetchPricingPlans: true, 
    locationId: activeLocation?._id 
  });

  const pricingPlans = pricingPlansDomain.data || [];

  // --- Event Handlers ---
  const handleLocationSelect = (locationCode: string) => {
    setSelectedLocationCode(locationCode);
  };

  const handleEditPlanClick = (plan: PricingPlan) => {
    setSelectedPlanForEdit(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlanForEdit(null);
  };

  const handlePlanUpdated = () => {
    // TanStack Query handles invalidation via mutation onSuccess
  };

  const currentMultiplier = useMemo(
    () => activeLocation?.multiplier ?? null,
    [activeLocation]
  );

  const isLoading = adminLocationsDomain.isLoading || pricingPlansDomain.isLoading;
  const error = adminLocationsDomain.error || pricingPlansDomain.error;

  return (
    <section className="flex flex-col gap-y-5 mt-5">
      <PageHeader title="Pricing & Plans" />

      <div className="p-5 mx-auto overflow-hidden bg-white rounded-lg w-full">
        <div className="w-full flex flex-col md:flex-row gap-[2rem] justify-start items-start md:items-end mb-6">
          <LocationSelector
            locations={locations}
            activeLocationCode={activeLocation?.currencyCode ?? null}
            onSelectLocation={handleLocationSelect}
            disabled={adminLocationsDomain.isLoading}
          />
          {activeLocation && (
            <MultiplierEditor
              locationId={activeLocation._id}
              currentMultiplier={currentMultiplier}
              disabled={adminLocationsDomain.isLoading}
            />
          )}
        </div>

        {isLoading && <p className="text-center py-4 text-primary">Loading data...</p>}
        
        {error && (
          <p className="text-center py-4 text-red-500">
            {typeof error === "string" ? error : "An error occurred while fetching data."}
          </p>
        )}

        {!isLoading && !error && pricingPlans.length === 0 && activeLocation && (
          <p className="text-center py-4">No pricing plans found for the selected location.</p>
        )}

        {!isLoading && !error && !activeLocation && (
          <p className="text-center py-4">Please select a location to view plans.</p>
        )}

        {!isLoading && !error && pricingPlans.length > 0 && (
          <div className="gap-6 py-[2rem] sm:gap-8 flex items-stretch overflow-x-auto">
            {pricingPlans.map((plan) => (
              <PlansAndPricing
                key={plan._id}
                multiplier={currentMultiplier ?? "1"}
                handleClick={() => handleEditPlanClick(plan)}
                pricing={plan}
                symbol={{
                  currencyCode: activeLocation?.currencyCode,
                  currencySymbol: activeLocation?.currencySymbol
                }}
              />
            ))}
          </div>
        )}
      </div>

      <PlanEditorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        plan={selectedPlanForEdit}
        locationId={activeLocation?._id ?? null}
        onPlanUpdated={handlePlanUpdated}
      />
    </section>
  );
}

export default PricingAdminPage;
