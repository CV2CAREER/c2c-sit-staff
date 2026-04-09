/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import React, { useEffect, useState } from "react";
import { Button, Input } from "antd";
import { PlusOutlined, MinusOutlined, SaveOutlined, EditOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { usePromptsQueries, usePromptsMutations } from "@/hooks/api/admin/prompts";
import PageHeader from "@/components/PageHeader/PageHeader";
import Image from "next/image";
import Loader from '../../../../../../public/loader-2.gif';

const formatVariants = (apiData: any) => {
  const variantsArray = apiData.trim().split("\n\n");

  return variantsArray.map((variantData: any, index: any) => {
    const [titleLine, ...lines] = variantData.split("\n").map((line: any) => line.trim());
    const title = titleLine.split(":")[1].trim();

    const formattedLines = lines
      .filter((line: any) => !line.includes("Style Theme:"))
      .map((line: any) => (line.startsWith("-") ? line.slice(1).trim() : line.trim()));

    return {
      id: `variant-${index + 1}`,
      title,
      lines: formattedLines,
    };
  });
};

const reformatVariants = (variants: any) => {
  return variants
    .map((variant: any, index: any) => {
      const titleLine = `Variant ${index + 1}: ${variant.title}`;
      const styleThemeLine = "Style Theme:";
      const formattedLines = variant.lines.map((line: any) => `- ${line}`).join("\n");
      return `${titleLine}\n${styleThemeLine}\n${formattedLines}`;
    })
    .join("\n\n");
};

const VariantEditor = () => {
  const { cvStyleDomain } = usePromptsQueries({ basePath: "prompts/cv-ai", isCvAi: true });
  const { saveCvStyle } = usePromptsMutations("prompts/cv-ai");

  const [variants, setVariants] = useState([]);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false); // Loading state for saving changes
  const [titleError, setTitleError] = useState(""); // State to track title validation error
  const [styleError, setStyleError] = useState(""); // State to track style validation error

  useEffect(() => {
    if (cvStyleDomain.data?.result) {
      setVariants(formatVariants(cvStyleDomain.data.result));
    }
  }, [cvStyleDomain.data]);

  if (cvStyleDomain.isError) return <div>Error loading data. </div>;
  if (cvStyleDomain.isLoading || !cvStyleDomain.data) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <Image className="w-24 h-24" src={Loader} alt="Loading..." />
        <h3 className="text-sm font-medium text-career-blue-500">
          Fetching Style
        </h3>
      </div>
    );
  }

  const addLine = (variantId: any) => {
    // @ts-ignore
    setVariants((prevVariants) =>
      prevVariants.map((variant) =>
        // @ts-ignore
        variant.id === variantId
          // @ts-ignore
          ? { ...variant, lines: [...variant.lines, ""] }
          : variant
      )
    );
  };

  const removeLine = (variantId: any, index: any) => {
    // @ts-ignore
    setVariants((prevVariants) =>
      prevVariants.map((variant) =>
        // @ts-ignore
        variant.id === variantId
          // @ts-ignore
          ? { ...variant, lines: variant.lines.filter((_, i) => i !== index) }
          : variant
      )
    );
  };

  const handleLineChange = (variantId: any, index: any, value: any) => {
    // @ts-ignore
    setVariants((prevVariants) =>
      prevVariants.map((variant) =>
        // @ts-ignore
        variant.id === variantId
          ? {
              // @ts-ignore
              ...variant,
              // @ts-ignore
              lines: variant.lines.map((line, i) =>
                i === index ? value : line
              ),
            }
          : variant
      )
    );
  };

  const handleTitleChange = (variantId: any, value: any) => {
    setVariants((prevVariants: any) =>
      prevVariants.map((variant: any) =>
        variant.id === variantId ? { ...variant, title: value } : variant
      )
    );
  };

  const startEditingTitle = (variantId: any, currentTitle: any) => {
    setEditingTitleId(variantId);
    setNewTitle(currentTitle);
  };

  const saveTitle = (variantId: any) => {
    if (newTitle.trim() === "") {
      setTitleError("Title cannot be empty"); // Set error if title is empty
      return;
    }
    handleTitleChange(variantId, newTitle);
    setEditingTitleId(null);
    setTitleError(""); // Reset error when title is valid
  };

  const saveAllChanges = async () => {
    setLoading(true); // Start loading
    setTitleError(""); // Reset any title error before saving
    setStyleError(""); // Reset any style error before saving

    // Validate that each variant has at least one style prompt
    const invalidVariant = variants.find(
      (variant: any) => variant.lines.length === 0 || variant.title.trim() === ""
    );

    if (invalidVariant) {
      setStyleError("Each style prompt must have at least one line and a valid title.");
      setLoading(false); // Stop loading in case of validation failure
      return;
    }

    try {
      const formattedVariants = reformatVariants(variants);
      await saveCvStyle.mutateAsync(formattedVariants);
      toast.success("Changes saved successfully!"); // Display success toast
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save changes. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="container flex flex-col gap-8 mx-auto p-6 min-h-screen">
      <PageHeader title="CV Styling" />
      {variants.map((variant: any) => (
        <div
          // @ts-ignore
          key={variant.id}
          className="border border-gray-300 rounded-lg shadow-md bg-white p-4 mb-6"
        >
          <h3 className="text-md font-normal text-gray-800"> Title:</h3>
          <div className="flex items-center justify-between mb-4">
            {editingTitleId === variant.id ? (
              <div className="flex items-center w-full">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 mr-2"
                  placeholder="Edit title"
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => saveTitle(variant.id)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-semibold text-gray-800">
                  {variant.title}
                </h2>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => startEditingTitle(variant.id, variant.title)}
                  className="text-gray-500"
                />
              </div>
            )}
          </div>

          {titleError && <div className="text-red-500 text-sm">{titleError}</div>}

          <div className="space-y-3">
            {variant.lines.map((line: any, index: any) => (
              <div key={index} className="flex items-center">
                <Input
                  value={line}
                  onChange={(e) =>
                    handleLineChange(variant.id, index, e.target.value)
                  }
                  className="flex-1"
                  placeholder="Edit line"
                />
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => removeLine(variant.id, index)}
                  className="ml-2 text-red-500"
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => addLine(variant.id)}
              className="bg-green-500 border-green-500 hover:bg-green-600"
            >
              Add Line
            </Button>
          </div>
        </div>
      ))}

      {styleError && <div className="text-red-500 text-sm">{styleError}</div>}

      <div className="flex justify-center mt-8">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveAllChanges}
          className="bg-blue-500 border-blue-500 hover:bg-blue-600"
          loading={loading} // Display the loading spinner
        >
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

export default VariantEditor;
