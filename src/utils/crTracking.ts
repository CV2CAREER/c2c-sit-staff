import { CROptionType } from "@/app/admin/cr-tracking/_components/forms/form0";

export const transformCrOptions = (options: CROptionType[] | undefined) => {
  if (!options) return undefined;
  return options.filter((option) => option.name).map((option) => option.name);
};

export const transformToOptionType = (
  options: string[] | undefined
) => {
  if (!options) return undefined;
  return options.map((option) => ({ label: option, value: option }));
};


