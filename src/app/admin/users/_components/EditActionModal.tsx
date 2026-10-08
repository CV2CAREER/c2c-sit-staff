import React, { SetStateAction } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseMutationResult } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import SearchSelect from "@/components/ui/react-select";
import { OptionType } from "@/types";
import { SingleValue } from "react-select";
import countryList from "react-select-country-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UsersTableColType } from "@/types/admin";
import toast from "react-hot-toast";
import { useUpdateDocumentFlags, useUpdateUser } from "../hooks/users-all";
import { useQueryClient } from "@tanstack/react-query";
import { PencilLine } from "lucide-react";
import {
  FieldLegend,
  FieldSwitch,
  LockedField,
  LockedSwitch,
} from "@/components/ui/form-field";
import {
  COMMUNICATION_OPTIONS,
  CUSTOMER_CLASS_OPTIONS,
  GENDER_OPTIONS,
  HERITAGE_OPTIONS,
  PLAN_OPTIONS,
  PROGRESS_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  PREP_SESSION_STATUS_OPTIONS,
  MODAL_REVENUE_OPTIONS,
  MODAL_SAMPLE_DISPATCHED_OPTIONS,
  SIGN_UP_AS_OPTIONS,
} from '@/utils/enum-options';


// const SectionLabel = ({ children }: { children: React.ReactNode }) => (
//   <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2">
//     {children}
//   </h4>
// );

  const SectionLabel = ({ children, tag }: { children: React.ReactNode; tag?: string }) => (
    <h2 className="flex items-center gap-2 pb-1.5 mb-2.5 border-b text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {children}
      {tag ? <span className="rounded bg-muted px-[7px] py-0.5 text-[10.5px] font-medium tracking-normal text-muted-foreground">{tag}</span> : null}
    </h2>
  );

// "middleName" / "Adecco_Aggregator" -> "Middle Name" / "Adecco Aggregator"
const humanizeFieldName = (field: string) =>
  field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const formSchema = z.object({
  firstName: z.string().min(2).max(50),
  middleName: z.string().min(2).max(50).or(z.literal('')).optional(),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  gender: z.enum(["Female", "Male", "Prefer Not to Say"]).optional(),
  zohoId: z.string().optional(),
  currentCityOfResidence: z.string().optional(),
  signUpAs: z.string().optional(),
  plan: z.string().optional(),
  customerClass: z.string().optional(),
  isActive: z.boolean().optional(),
  isUserSubscribed: z.boolean().optional(),
  applicationStatus: z.string().optional(),
  prepSessionStatus: z.string().optional(),
  isSampleDispatched: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  country: z.string().optional(),
  // Optional: users with no heritage hold null, which z.string() rejected,
  // so Update failed with a Heritage error.
  heritage: z.string().nullable().optional(),
  communication: z.string().optional(),
  role: z.enum(["admin", "client", "guest", "partner", "coach", "sales", "assistant", "tpc", "pc", "technology", "cse", "customer", "test", "probono", "business", "cec"]),
  revenue: z.string().optional(),
  // SPR-21-41-013 AC6: whole numbers of zero or more only. The input strips
  // non-digits as they are typed, so this guards the API as well as the UI.
  returnCount: z
    .number()
    .int("Return Count must be a whole number")
    .min(0, "Return Count cannot be less than 0")
    .nullable()
    .optional(),
  hasCoverLetter: z.boolean(),
  hasResume: z.boolean(),
  socials: z.any().optional(),
  progress: z.string().optional(),
  // SPR-21-41-013 AC8: admin-editable. isDocumentUploaded is deliberately
  // absent: it is locked (AC7) and must never reach the payload.
  isDocumentApproved: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTableModalProps {
  user: UsersTableColType;
  setDialog: (
    value: SetStateAction<
      | "edit"
      | "soft-delete"
      | "restore"
      | "delete"
      | "accept-documents"
      | "dispatch-sample-result"
      | "reject-documents"
      | "view-documents"
      | "view-profile"
      | "approve-account"
      | null
    >
  ) => void;
}

const EditTableModal: React.FC<EditTableModalProps> = ({
  user,
  setDialog,
}) => {
  const countries = countryList()
    .getData()
    .map((country) => ({ ...country, value: country.label }));

  // SPR-21-41-013 AC4/AC5. The admin dropdowns offer only the two values the
  // ticket names, but the underlying enum still holds legacy values
  // (Capitalized, Refunded, AWAITING_PAYID / Viewed, Accepted). If such a value
  // is already stored, a strict two-option dropdown would have nothing
  // selected and saving for an unrelated reason would wipe it. So the stored
  // value is surfaced as a disabled option: visible, not re-pickable, not lost.
  const legacyRevenue =
    user.revenue &&
    !MODAL_REVENUE_OPTIONS.some((option) => option.value === user.revenue)
      ? user.revenue
      : undefined;

  const legacySampleDispatched =
    user.isSampleDispatched &&
    !MODAL_SAMPLE_DISPATCHED_OPTIONS.some(
      (option) => option.value === user.isSampleDispatched
    )
      ? user.isSampleDispatched
      : undefined;

  // Form Definition
  const form: UseFormReturn<FormValues> = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user.firstName,
      middleName: user.middleName ?? "",
      lastName: user.lastName,
email: user.email,
           gender: user.gender,
           zohoId: user.zohoId ?? "",
           currentCityOfResidence: user.currentCityOfResidence ?? "",
      signUpAs: user.signUpAs ?? "",
      plan: user.plan ?? "",
      customerClass: user.customerClass,
      isActive: Boolean(user.isActive),
      isUserSubscribed: Boolean(user.isUserSubscribed),
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      country: user.country,
      heritage: user.heritage,
      communication: user.communication,
      role: user.role,
      revenue: user.revenue,
      applicationStatus: user.applicationStatus,
      prepSessionStatus:
       user.prepSessionStatus != null ? String(user.prepSessionStatus) : undefined,
      isSampleDispatched: user.isSampleDispatched,
      returnCount: user.returnCount ?? null,
      hasCoverLetter: user.hasCoverLetter ?? false,
      hasResume: user.hasResume ?? false,
      socials: user.socials,
      progress: user.progress,
      isDocumentApproved: Boolean(user.isDocumentApproved),
    },
  });

  // Submit handler
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: updateDocumentFlags } = useUpdateDocumentFlags();
  const queryClient = useQueryClient();

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const loadingToast = toast.loading("Updating user...");

    // C/R + C/L go to their own endpoint, and only when staff actually flipped
    // them — otherwise saving any other field would freeze the value derived
    // from the client's uploads into a permanent override.
    const { hasResume, hasCoverLetter, ...rest } = values;
    const flags: { hasResume?: boolean; hasCoverLetter?: boolean } = {};
    if (hasResume !== (user.hasResume ?? false)) flags.hasResume = hasResume;
    if (hasCoverLetter !== (user.hasCoverLetter ?? false)) flags.hasCoverLetter = hasCoverLetter;

    try {
      await updateUser({
        id: user.id,
        ...rest,
      });
      if (Object.keys(flags).length > 0) {
        await updateDocumentFlags({ id: user.id, ...flags });
      }
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      toast.success("User updated successfully", { id: loadingToast });
    } catch {
      toast.error("Failed to update user", { id: loadingToast });
    }
    
    setDialog(null);
  };

  return (
    // <DialogContent className="h-[70vh] overflow-auto">
    <DialogContent className="max-h-[calc(100vh-64px)] max-w-[720px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          <PencilLine size={18} />
          Edit User
        </DialogTitle>
        <DialogDescription>
          {[user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ")}
          {user.uniqueId ? ` · ${user.uniqueId}` : ""}
          {" · "}Greyed fields are system-set and cannot be changed here
        </DialogDescription>
      </DialogHeader>

        <div className="min-h-0 overflow-hidden">
          {/* Form is FormProvider: it renders no DOM element, it only supplies the
              context that useFormField() reads in every FormLabel/FormControl/
              FormMessage. Do not remove it. */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="h-full space-y-8 overflow-y-auto overflow-x-hidden text-black px-1"
            >
              <SectionLabel tag="system">Identity</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <LockedField
                  field="uniqueId"
                  label="Customer ID"
                  value={user.uniqueId}
                />
                <LockedField
                  field="fullName"
                  label="Full Name"
                  value={[user.firstName, user.middleName, user.lastName]
                    .filter(Boolean)
                    .join(" ")}
                  hint="Built from first, middle, last"
                />
                <FormField
                  control={form.control}
                  name="zohoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zoho ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Zoho ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <LockedField
                  field="createdAt"
                  label="Created At"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleString()
                      : ""
                  }
                />
                <LockedField
                  field="updatedBy"
                  label="Updated By"
                  value={user.updatedBy}
                />
                <LockedField
                  field="updatedAt"
                  label="Updated At"
                  value={
                    user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ""
                  }
                />
                <LockedField
                  field="referralsCount"
                  label="Referrals"
                  value={user.referralsCount ?? 0}
                  hint="Counted from referral records"
                />
              </div>
              <SectionLabel>Personal Information</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Itoro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Itoro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  className="mr-3"
                                  placeholder="Select Gender"
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {GENDER_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="itorodoe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="heritage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heritage</FormLabel>
                      <FormControl>
                        {/* Optional. Pick from the list or type any value;
                            × clears it. */}
                        <SearchSelect
                          name="heritage"
                          placeholder="Select or type heritage"
                          className="w-full"
                          options={HERITAGE_OPTIONS}
                          creatable
                          isClearable
                          onChange={(e: SingleValue<OptionType>) =>
                            field.onChange(e ? e.value : "")
                          }
                          onBlur={field.onBlur}
                          value={
                            field.value
                              ? HERITAGE_OPTIONS.find((o) => o.value === field.value) ??
                                { value: field.value, label: field.value }
                              : null
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <SearchSelect
                          name="country"
                          placeholder="Country of Residence"
                          className="w-full"
                          options={countries}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue("country", e ? e.value : "");
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues("country") &&
                              countries.find(
                                (c) => c.value === form.getValues("country")
                              )) ||
                            null
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentCityOfResidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current City of Residence</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Test Aus"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <SectionLabel>Contact</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 093884774" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 093884774" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="communication"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue
                              className="mr-3"
                              placeholder="Select Communication"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMUNICATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="socials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Socials</FormLabel>
                      <FormControl>
                        <Input placeholder="LinkedIn or other profile URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionLabel>Account</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signUpAs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sign Up As</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sign Up As" />
                          </SelectTrigger>
                          <SelectContent>
                            {SIGN_UP_AS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue
                              className="mr-3"
                              placeholder="Select Persona"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="assistant">Assistant / PC</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="cse">CSE</SelectItem>
                            <SelectItem value="cec">CEC</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Class</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Customer Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {CUSTOMER_CLASS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <FieldSwitch
                          label={field.value ? "Active" : "Inactive"}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isUserSubscribed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscribed</FormLabel>
                      <FormControl>
                        <FieldSwitch
                          label={field.value ? "Yes" : "No"}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasCoverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C/L</FormLabel>
                      <FormControl>
                        <FieldSwitch
                          label={field.value ? "Yes" : "No"}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasResume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C/R</FormLabel>
                      <FormControl>
                        <FieldSwitch
                          label={field.value ? "Yes" : "No"}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SPR-21-41-013: Revenue, Application Status, Prep Session
                  Status, Sample Dispatched and Return Count moved out of
                  Account and into Journey, where the ticket and the design HTML
                  place them. */}
              <SectionLabel>Journey</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Progress" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROGRESS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Status</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Application Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prepSessionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prep Session Status</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Prep Session Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREP_SESSION_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isSampleDispatched"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Dispatched</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sample Dispatched" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* AC4: only Pending or Dispatched is pickable. A
                                value already stored outside that list is shown
                                as disabled so it stays visible and cannot be
                                wiped by an unrelated save. */}
                            {MODAL_SAMPLE_DISPATCHED_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                            {legacySampleDispatched && (
                              <SelectItem value={legacySampleDispatched} disabled>
                                {legacySampleDispatched} (existing value)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Revenue" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* AC5: only Paid or Unpaid is pickable, for the
                                reasons described above. */}
                            {MODAL_REVENUE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                            {legacyRevenue && (
                              <SelectItem value={legacyRevenue} disabled>
                                {legacyRevenue} (existing value)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="returnCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Count</FormLabel>
                      <FormControl>
                        {/* AC6: letters, symbols, decimal points and negative
                            signs are stripped as they are typed, so only whole
                            numbers of zero or more can be entered at all.
                            inputMode keeps a numeric keypad on mobile without
                            reintroducing the spinner, which type="number"
                            allows for -5 and 1.5. */}
                        <Input
                          name={field.name}
                          inputMode="numeric"
                          placeholder="0"
                          value={field.value ?? ""}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "");
                            field.onChange(digits === "" ? null : Number(digits));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Document Uploaded</FormLabel>
                  <FormControl>
                    {/* AC7: set by the upload process, so the admin can read it
                        but not switch it. Not registered with react-hook-form,
                        so it is never submitted. */}
                    <LockedSwitch
                      field="isDocumentUploaded"
                      label={user.isDocumentUploaded ? "Uploaded" : "Not Uploaded"}
                      checked={Boolean(user.isDocumentUploaded)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormField
                  control={form.control}
                  name="isDocumentApproved"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Approved</FormLabel>
                      <FormControl>
                        {/* AC8: deliberately editable. */}
                        <FieldSwitch
                          label={field.value ? "Approved" : "Not Approved"}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

       <DialogFooter className="sm:justify-between">
        <FieldLegend />
        <div className="flex gap-2">
        <Button
          variant="outline"
          className="border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          onClick={() => {
            setDialog(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() =>
            form.handleSubmit(onSubmit, (errors) => {
              const [firstField, firstError] = Object.entries(errors)[0] ?? [];
              toast.error(
                firstField
                  ? `${humanizeFieldName(firstField)}: ${(firstError as any)?.message || 'Invalid value'}`
                  : 'Please fix the highlighted fields before updating.'
              );
            })()
          }
        >
          Update
        </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditTableModal;
