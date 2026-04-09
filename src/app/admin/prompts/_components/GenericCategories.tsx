/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import Delete from "../../../../../public/gifs/delete-icon-3d.gif";
import AddIcon from "../../../../../public/gifs/add-animated.gif";

import "@/assets/css/animation.css";
// import { PromptCategory } from "@/data/ai-prompts"; // <--- REMOVE THIS SPECIFIC IMPORT
import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import Loader from "../../../../../public/gifs/loader-2.gif";
import NothingFound from "../../../../../public/svg/nothing-found.svg";
import toast from "react-hot-toast";
import Image from "next/image";
import { usePromptsMutations } from "@/hooks/api/admin/prompts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

// Define a generic interface for a Category
// It needs at least _id and name properties for this component's logic
interface GenericCategory {
  _id: string;
  name: string;
  // Add any other common properties that ALL your category types share
  [key: string]: any; // Allow for other unknown properties if needed, or define them explicitly
}

// Update the props interface to use a generic type parameter <T extends GenericCategory>
interface CategoriesProps<T extends GenericCategory> {
  setCurrentAction: Dispatch<SetStateAction<string | null>>;
  setActiveComponent: Dispatch<SetStateAction<string>>;
  setActiveCategory: Dispatch<SetStateAction<T | undefined>>; // Use T here
  activeCategory: T | undefined; // Use T here
  categories: T[] | undefined; // Use T here
  loadingCategories: boolean;
  endPoint?: string; // This remains the same
}

// Make the component itself generic
const Categories = <T extends GenericCategory>({
  setCurrentAction,
  setActiveComponent,
  setActiveCategory,
  activeCategory,
  categories,
  loadingCategories,
  endPoint = "ai-prompt",
}: CategoriesProps<T>) => {
  // mutations
  const { createCategory, deleteCategory: deleteCategoryMutation } =
    usePromptsMutations(endPoint);

  // local state for filtering/UI
  const [fetchingCategories, setFetchingCategories] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
    );
  }, [categories, searchQuery]);

  // modals
  const [onAddCategoryModal, setOnAddCategoryModal] = useState(false);
  const [onDeleteCategoryModal, setOnDeleteCategoryModal] = useState(false);

  // forms
  const [newCategoryData, setNewCategoryData] = useState<{
    name: string;
  } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<T | null>(null); // Use T here
  const [runningProcess, setRunningProcesses] = useState<string[]>([]);

  // functions | process
  async function addNewCategory() {
    if (!newCategoryData) return;

    try {
      if (newCategoryData?.name?.trim().length > 0) {
        const allCategoriesNames =
          categories?.map((category) => category.name.toLowerCase()) || [];

        if (!allCategoriesNames.includes(newCategoryData.name.toLowerCase())) {
          setCurrentAction("Adding category!");
          setRunningProcesses((processes) =>
            uniqueByValue([...processes, "addingCategory"]),
          );

          await createCategory.mutateAsync(newCategoryData.name);

          setRunningProcesses((processes) =>
            processes.filter((p) => p !== "addingCategory"),
          );
          setNewCategoryData(null);
          setCurrentAction(null);
          setOnAddCategoryModal(false);
          toast.success("Added category successfully!");
        } else {
          toast.error(`/${newCategoryData.name}/ already exists.`);
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to add category.`);
      setCurrentAction(null);
      setRunningProcesses((processes) =>
        processes.filter((p) => p !== "addingCategory"),
      );
    }
  }

  async function deleteCategory() {
    if (!categoryToDelete) return;

    try {
      setCurrentAction("Deleting category!");
      setRunningProcesses((processes) =>
        uniqueByValue([...processes, "deletingCategory"]),
      );

      await deleteCategoryMutation.mutateAsync(categoryToDelete._id);

      setRunningProcesses((processes) =>
        processes.filter((p) => p !== "deletingCategory"),
      );
      setCategoryToDelete(null);
      setCurrentAction(null);
      setOnDeleteCategoryModal(false);
      toast.success("Deleted category successfully!");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || `Failed to delete category.`,
      );
      setCurrentAction(null);
      setRunningProcesses((processes) =>
        processes.filter((p) => p !== "deletingCategory"),
      );
    }
  }

  function uniqueByValue(items: string[]) {
    const set = new Set();
    return items.filter((item) => {
      const isDuplicate = set.has(item);
      set.add(item);
      return !isDuplicate;
    });
  }

  // initialize app
  useEffect(() => {
    setFetchingCategories(loadingCategories);
  }, [loadingCategories]);

  return (
    <div className="flex flex-col relative items-start w-full border-2 border-gray-200  max-h-[600px] max-w-[400px] min-w-[350px] rounded-[5px] hover:shadow-lg h-fit">
      {/* prompts header */}
      <div className="!h-16 !min-h-16  flex flex-row items-center  px-4 w-full">
        <h3 className="text-16 !font-medium font-sharp-grotesk text-career-black-200">
          Categories
        </h3>
      </div>
      {/* prompts body */}
      {fetchingCategories ? (
        <div className="body w-full h-screen max-h-fit space-y-3 flex flex-col items-center !justify-center overflow-y-hidden">
          <Image className="w-24 h-24" src={Loader} alt="" />

          <h3 className="text-sm !font-medium font-sharp-grotesk text-gray-600">
            Fetching categories...
          </h3>
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="body w-full h-screen max-h-fit px-4 flex flex-col items-start !justify-start overflow-y-hidden py-4">
          <div className="w-full flex flex-row justify-between space-x-4 items-center pr-2 pl-0.5">
            <div className="flex w-full px-2 h-[40px]">
              <div
                onClick={() => {
                  setOnAddCategoryModal(true);
                  setCurrentAction("Enter category details!");
                }}
                className="flex w-full flex-row items-center hover:shadow-lg transition-all cursor-pointer justify-center bg-blue rounded-[5px] space-x-1 px-2"
              >
                <Image src={AddIcon} alt="" className="w-6 h-6" />
                <h3 className="text-[10px] text-white font-medium">
                  Add Category
                </h3>
              </div>
            </div>

            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!h-6 pl-2 min-h-[40px] w-full outline-none border border-gray-600 focus:border-career-blue-500 rounded-[5px]"
              type="text"
              placeholder="Search"
              value={searchQuery}
            />
          </div>
          {filteredCategories && filteredCategories?.length > 0 ? (
            <div className="w-full h-fit flex flex-row flex-wrap items-start overflow-y-auto no-scroll-btn gap-y-4 pt-3 ">
              {filteredCategories.map((category, index) => {
                return (
                  <div
                    className="flex basis-full px-3 min-h-[45px]"
                    key={index}
                  >
                    <div
                      className={`flex w-full flex-row items-center cursor-pointer justify-between border border-gray-800 rounded-[5px] px-2 hover:!shadow-lg space-x-3 transition-all ${
                        activeCategory?._id === category._id ||
                        activeCategory?.name === category.name
                          ? "shadow-2xl"
                          : ""
                      }`}
                    >
                      <h3
                        onClick={() => {
                          setActiveCategory(category);
                          setActiveComponent("prompts");
                          setCurrentAction(
                            `Viewing /${category.name}/ prompts!`,
                          );
                        }}
                        className="text-xs text-gray-500  transition-all hover:text-gray-700 hover:font-bold"
                      >
                        {category.name}
                      </h3>

                      <div className="flex flex-row space-x-2 items-center">
                        <Image
                          onClick={() => {
                            setCategoryToDelete(category);
                            setOnDeleteCategoryModal(true);
                            setCurrentAction("Confirm Deletion!");
                          }}
                          src={Delete}
                          alt=""
                          className="w-6 h-6"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 justify-center w-full h-full">
              <Image src={NothingFound} className="w-32 h-32" alt="" />
              <p className="text-gray-800 text-sm">
                No matching category found...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="body w-full h-screen max-h-fit px-4 flex flex-col items-start !justify-start overflow-y-hidden py-4">
          <div className="flex flex-col items-center justify-between w-full h-full">
            <div className="collapse"></div>

            <div className="flex flex-col items-center">
              <Image src={NothingFound} className="w-32 h-32" alt="" />
              <p className="text-gray-800 text-sm">No categories found...</p>
            </div>

            <div className="flex w-full px-2 h-[40px] mt-2">
              <div
                onClick={() => {
                  setOnAddCategoryModal(true);
                  setCurrentAction("Enter category details!");
                }}
                className="flex w-full flex-row items-center hover:shadow-lg transition-all cursor-pointer justify-center bg-blue rounded-[5px] space-x-1 px-2"
              >
                <Image src={AddIcon} alt="" className="w-6 h-6" />
                <h3 className="text-[10px] text-white font-medium">
                  Add Category
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modals */}

      {/* add categories */}
      <Dialog
        open={onAddCategoryModal}
        onOpenChange={(state) => {
          setOnAddCategoryModal(state);
          if (!state) {
            setNewCategoryData(null);
            setCurrentAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-sharp-grotesk text-gray-800">
              New Category
            </DialogTitle>
            <DialogClose asChild>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 cursor-pointer absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                onClick={() => {
                  // Already handled by onOpenChange
                }}
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col items-start space-y-3 w-full py-4">
            <label htmlFor="categoryName" className="text-sm text-gray-700">
              Name
            </label>
            <input
              id="categoryName"
              onChange={(e) => {
                setNewCategoryData((d) => ({
                  // @ts-ignore
                  ...d,
                  name: e.target.value,
                }));
              }}
              placeholder="Enter new category"
              className="!h-10 pl-3 min-h-[38px] w-full placeholder:text-sm outline-none border border-gray-300 rounded-md focus:border-career-blue-500"
              type="text"
              value={newCategoryData?.name || ""}
            />
          </div>

          <DialogFooter>
            <Button
              className="!h-[2.5rem] !w-full !rounded-[5px]"
              onClick={() => {
                addNewCategory();
              }}
              disabled={
                runningProcess.includes("addingCategory") ||
                !newCategoryData?.name ||
                newCategoryData?.name.trim().length === 0
              }
            >
              {runningProcess.includes("addingCategory")
                ? "Adding..."
                : `Add ${newCategoryData?.name ? `/${newCategoryData.name}/` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete categories */}
      <Dialog
        open={onDeleteCategoryModal}
        onOpenChange={(state) => {
          setOnDeleteCategoryModal(state);
          if (!state) {
            setCategoryToDelete(null);
            setCurrentAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-sharp-grotesk text-gray-800">
              Delete Category
            </DialogTitle>
            <DialogClose asChild>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 cursor-pointer absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="py-4 text-sm text-gray-800">
            Are you sure you want to delete /
            <span className="font-bold text-black">
              {categoryToDelete?.name}
            </span>
            / ?
          </DialogDescription>
          <DialogFooter className="sm:justify-start gap-2">
            <Button
              variant="outline"
              className="!h-[2.5rem] !w-full sm:!w-auto !rounded-[5px]"
              onClick={() => {
                setOnDeleteCategoryModal(false);
                setCurrentAction(null);
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="!h-[2.5rem] !w-full sm:!w-auto !rounded-[5px]"
              onClick={() => {
                deleteCategory();
              }}
              disabled={runningProcess.includes("deletingCategory")}
            >
              {runningProcess.includes("deletingCategory")
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
