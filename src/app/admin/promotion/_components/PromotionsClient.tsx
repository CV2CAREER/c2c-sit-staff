"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { IoTrashSharp } from "react-icons/io5";
import PromotionCodeForm from "./PromotionCodeForm";
import PromotionLengthForm from "./PromotionLengthForm";
import PromotionCountryForm from "./PromotionCountryForm";
import { currencyCodes } from "@/data/currencyCodes";
import { FiLoader } from "react-icons/fi";
import { usePromotionQueries, usePromotionMutations } from "@/hooks/api/admin/promotion";
import { IPromotions } from "@/types/promotion.types";

export default function PromotionsClient() {
  const [deleteLoading, setDeleteLoading] = useState<string | false>(false);
  const { promotionsListDomain, promotionLengthDomain } = usePromotionQueries();
  const { createPromotion, deletePromotion, createPromotionLength, updatePromotionLength } = usePromotionMutations();

  const promotions: IPromotions[] = promotionsListDomain.data || [];
  const promotionsLoading = promotionsListDomain.isLoading || promotionsListDomain.isFetching;

  const promotionLengthDataObj = promotionLengthDomain.data?.[0] || {};
  const length = promotionLengthDataObj.numberOfReferralsBeforePromo || 0;
  const numberOfFreePromos = promotionLengthDataObj.numberOfFreePromo || 0;
  const promotionLengthData = {
    numberOfReferralsBeforePromo:
      promotionLengthDataObj.numberOfReferralsBeforePromo != null
        ? String(promotionLengthDataObj.numberOfReferralsBeforePromo)
        : "",
    numberOfFreePromo:
      promotionLengthDataObj.numberOfFreePromo != null
        ? String(promotionLengthDataObj.numberOfFreePromo)
        : "",
  };

  const handleLengthSubmit = async (values: any) => {
    try {
      if (promotionLengthDataObj._id) {
        await updatePromotionLength.mutateAsync({ id: promotionLengthDataObj._id, values });
        toast.success("Updated successfully");
      } else {
        await createPromotionLength.mutateAsync({ ...values, variant: "length" });
        toast.success("Created successfully");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Something went wrong");
    }
  };

  const onSubmitCode = async (values: any) => {
    try {
      values["type"] = "CODE";
      await createPromotion.mutateAsync(values);
      toast.success("Promotion Code Created Successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Something went wrong");
    }
  };

  const handleSubmitCountry = async (values: any) => {
    let countryCode: string = "";
    for (const value of currencyCodes) {
      if (value.name.toLowerCase() === values.country.toLowerCase()) {
        countryCode = value.isoAlpha2;
      }
    }
    try {
      values["countryCode"] = countryCode;
      values["type"] = "COUNTRY";
      await createPromotion.mutateAsync(values);
      toast.success("Promotion Country Created Successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id);
      await deletePromotion.mutateAsync(id);
      toast.success("Deleted successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Something went wrong");
    } finally {
      setDeleteLoading(false);
    }
  };

  const isCreating = (createPromotion as any).isPending || (createPromotion as any).isLoading;
  const isUpdatingLength = (updatePromotionLength as any).isPending || (updatePromotionLength as any).isLoading;
  const isCreatingLength = (createPromotionLength as any).isPending || (createPromotionLength as any).isLoading;

  return (
    <>
      <PromotionCountryForm loading={isCreating} onSubmit={handleSubmitCountry} />
      
      <div className="bg-white rounded-lg p-4">
        <h1 className="font-medium font-sharp-grotesk text-center text-2xl">
          Add promotion by code
        </h1>
        <div className=" flex justify-center ">
          <div className="pt-8 w-full sm:w-[500px]">
            <PromotionCodeForm onSubmit={onSubmitCode} loading={isCreating} />
          </div>
        </div>
      </div>

      <div className="bg-white mt-4 rounded-lg p-4">
        <h2 className="capitalize text-2xl text-center font-semibold">
          promotions by country
        </h2>
        <div className="w-full flex-wrap flex">
          {promotions.length > 0 &&
            promotions
              .filter((promotion) => promotion.type === "COUNTRY")
              .map((el) => (
                <div
                  key={el._id}
                  className=" p-4 rounded-lg shadow-lg flex ml-4 border mt-4"
                >
                  <div className="mr-8">
                    <h1 className="text-sm text-gray-700">Name: {el.name}</h1>
                    <p className="text-sm text-gray-700">Country: {el.country}</p>
                    <p className="text-sm text-gray-700">Expiry Date: {el.expiryDate}</p>
                    <p className="text-sm text-gray-700">Country Code: {el.countryCode}</p>
                    <p className="text-sm text-gray-700">Promotion Code: {el.promotionCode}</p>
                  </div>

                  {deleteLoading === el._id ? (
                    <FiLoader size={12} className="animate-spin" />
                  ) : (
                    <IoTrashSharp
                      onClick={() => handleDelete(el._id)}
                      className=" cursor-pointer hover:text-red-500"
                    />
                  )}
                </div>
              ))}

          {!promotionsLoading && promotions.filter(p => p.type === "COUNTRY").length <= 0 && (
            <div className="w-full text-center text-gray-500 mt-4">No promotions created Yet</div>
          )}
          {promotionsLoading && (
            <div className="w-full flex justify-center mt-4">
              <FiLoader size={20} className="animate-spin text-blue" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white mt-4 rounded-lg p-4">
        <h2 className="capitalize text-2xl text-center font-semibold">
          promotions by code
        </h2>

        <div className="w-full flex-wrap flex">
          {promotions.length > 0 &&
            promotions
              .filter((promotion) => promotion.type === "CODE")
              .map((el) => (
                <div
                  key={el._id}
                  className=" p-4 rounded-lg shadow-lg flex ml-4 border mt-4"
                >
                  <div className="mr-8">
                    <h1 className="text-sm text-gray-700">Name: {el.name}</h1>
                    <p className="text-sm text-gray-700">Country: {el.country}</p>
                    <p className="text-sm text-gray-700">Expiry Date: {el.expiryDate}</p>
                    <p className="text-sm text-gray-700">Promotion Code: {el.promotionCode}</p>
                  </div>

                  {deleteLoading === el._id ? (
                    <FiLoader size={12} className="animate-spin" />
                  ) : (
                    <IoTrashSharp
                      onClick={() => handleDelete(el._id)}
                      className=" cursor-pointer hover:text-red-500"
                    />
                  )}
                </div>
              ))}

          {!promotionsLoading && promotions.filter(p => p.type === "CODE").length <= 0 && (
            <div className="w-full text-center text-gray-500 mt-4">No promotions created Yet</div>
          )}
          {promotionsLoading && (
            <div className="w-full flex justify-center mt-4">
              <FiLoader size={20} className="animate-spin text-blue" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mt-4 mb-4">
        <h2 className="capitalize text-lg text-center font-semibold">
          {length > 0 ? `Promotional length : ${length}` : "Promotional length"}
        </h2>

        <h2 className="capitalize text-lg text-center font-semibold">
          {numberOfFreePromos > 0 ? `Number Of Free Promotions : ${numberOfFreePromos}` : "Number Of Free Promotions"}
        </h2>

        <div className=" flex justify-center ">
          <div className="pt-8 w-full sm:w-[500px]">
            <PromotionLengthForm
              promotionLengthData={promotionLengthData}
              handleLengthSubmit={handleLengthSubmit}
              loading={isUpdatingLength || isCreatingLength}
            />
          </div>
        </div>
      </div>
    </>
  );
}
