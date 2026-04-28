"use client";

import React, { useState } from "react";
import { Form, Formik, Field } from "formik";
import Select from "react-select";
import { Add } from "@mui/icons-material";
import { useAccessControl } from "@/hooks/useAccessControl";
import { usePermissions } from "@/hooks/usePermissions";
import toast from "react-hot-toast";

type AccessOption = { value: string; label: string };

const accessOptions: AccessOption[] = [
  { value: "create", label: "Create" },
  { value: "read", label: "Read" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
];

const customRsStyles = {
  control: (provided: any) => ({
    ...provided,
    backgroundColor: "white",
    color: "black",
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#f0f0f0" : "white",
    color: "black",
    cursor: "pointer",
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: "black",
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
  }),
};

export default function ViewRulesModal({
  accessLevel,
  close,
}: {
  accessLevel: any;
  close: () => void;
}) {
  const [editStates, setEditStates] = useState<Record<string, boolean>>(
    accessLevel?.rules?.reduce((acc: Record<string, boolean>, rule: any) => {
      acc[rule._id] = false;
      return acc;
    }, {}) ?? {},
  );
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const { isAdmin } = usePermissions();
  const { createRule, updateRule, deleteRule, refetchAccessLevels } = useAccessControl();

  const handleToggleEdit = (id: string) => {
    setEditStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      style={{
        padding: "45px 20px",
        borderRadius: "10px",
        background: "#fff",
        maxWidth: "700px",
        margin: "0 auto",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        height: "700px",
        overflowY: "scroll",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "5px" }}>{accessLevel?.name}</h2>
        <p style={{ color: "#666" }}>{accessLevel?.description}</p>
      </div>

      {(accessLevel?.rules ?? []).map((rule: any, index: number) => (
        <div
          key={rule._id || index}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
            overflowY: "scroll",
          }}
        >
          <Formik
            initialValues={{
              description: rule.description || "",
              path: rule.path || "",
              access: rule.access?.map((item: string) => ({ label: item, value: item })) || [],
            }}
            onSubmit={(values) => {
              toast.promise(
                new Promise((resolve, reject) => {
                  updateRule.mutate(
                    {
                      id: rule._id,
                      description: values.description,
                      path: values.path,
                      access: values.access.map((item: AccessOption) => item.value),
                    },
                    {
                      onSuccess: (data) => { void refetchAccessLevels(); resolve(data); },
                      onError: (err) => reject(err),
                    },
                  );
                }),
                { loading: "Updating rule...", success: "Rule updated!", error: "Failed to update rule." },
              );
            }}
          >
            {({ values, setFieldValue }) => (
              <Form>
                {isAdmin ? (
                  <div className="flex w-full justify-between">
                    <div className="gap-2 p-2 rounded-sm bg-career-blue-300">
                      <input type="checkbox" checked={!!editStates[rule._id]} onChange={() => handleToggleEdit(rule._id)} />
                      <span className="font-light text-[14px] ml-1">Edit Mode</span>
                    </div>
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        toast.promise(
                          new Promise((resolve, reject) => {
                            deleteRule.mutate(
                              { id: rule._id },
                              {
                                onSuccess: (data) => { void refetchAccessLevels(); resolve(data); },
                                onError: (err) => reject(err),
                              },
                            );
                          }),
                          { loading: "Deleting rule...", success: "Rule deleted!", error: "Failed to delete rule." },
                        );
                      }}
                      className="font-semibold text-[14px] text-white bg-red-500 rounded-md px-3 py-2"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: "10px" }}>
                  <div>
                    <label>Description</label>
                    <Field
                      name="description"
                      disabled={!editStates[rule._id]}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>

                  <div>
                    <label>Path</label>
                    <Field
                      name="path"
                      disabled={!editStates[rule._id]}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                  </div>

                  <div>
                    <label>Access</label>
                    <Select
                      isMulti
                      isDisabled={!editStates[rule._id]}
                      value={values.access}
                      styles={customRsStyles}
                      onChange={(selected) => setFieldValue("access", selected)}
                      options={accessOptions}
                      getOptionValue={(option) => option.value}
                    />
                  </div>
                </div>

                {editStates[rule._id] ? (
                  <div style={{ marginTop: "15px" }}>
                    <button type="submit" className="px-4 py-2 bg-blue text-white rounded-md font-medium hover:opacity-90 transition cursor-pointer">
                      Save Changes
                    </button>
                  </div>
                ) : null}
              </Form>
            )}
          </Formik>
        </div>
      ))}

      {isAdmin ? (
        <div>
          <div onClick={() => setAddRuleOpen((prev) => !prev)} className="inline-block p-2 rounded-md bg-green-300 cursor-pointer">
            <Add />
            <span>Add Rule</span>
          </div>
        </div>
      ) : null}

      {addRuleOpen ? (
        <div>
          <h2 className="text-[24px] mt-4">Add Rule</h2>
          <Formik
            initialValues={{ description: "", path: "", access: [] as AccessOption[] }}
            onSubmit={(values, { resetForm }) => {
              toast.promise(
                new Promise((resolve, reject) => {
                  createRule.mutate(
                    {
                      accessLevel: accessLevel._id,
                      description: values.description,
                      path: values.path,
                      access: values.access.map((item) => item.value),
                    },
                    {
                      onSuccess: (data) => {
                        resetForm();
                        setAddRuleOpen(false);
                        void refetchAccessLevels();
                        resolve(data);
                      },
                      onError: (err) => reject(err),
                    },
                  );
                }),
                { loading: "Creating rule...", success: "Rule created!", error: "Failed to create rule." },
              );
            }}
          >
            {({ values, setFieldValue }) => (
              <Form>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div>
                    <label>Description</label>
                    <Field name="description" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
                  </div>

                  <div>
                    <label>Path</label>
                    <Field name="path" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
                  </div>

                  <div>
                    <label>Access</label>
                    <Select
                      isMulti={false}
                      value={values.access as any}
                      onChange={(selected) => setFieldValue("access", selected ? [selected] : [])}
                      options={accessOptions}
                      styles={customRsStyles}
                      getOptionValue={(option) => option.value}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "15px" }} className="flex gap-3">
                  <button type="submit" className="px-4 py-2 rounded-md text-white font-medium transition bg-blue hover:opacity-90">
                    Save Rule
                  </button>
                  <button type="button" onClick={close} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                    Close
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      ) : null}
    </div>
  );
}
