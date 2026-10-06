import React, { SetStateAction } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useUpdateUser } from "../hooks/users-all";
import { PencilLine } from "lucide-react";
import { FieldLegend } from "@/components/ui/form-field";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2">
    {children}
  </h4>
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
  staffPerception: z.string().optional(),
  customerClass: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  country: z.string().optional(),
  heritage: z.string().optional(),
  communication: z.string().optional(),
  role: z.enum(["admin", "client", "guest", "partner", "coach", "sales", "assistant", "tpc", "pc", "technology", "cse", "customer", "test", "probono", "business", "cec"]),
  revenue: z.string().optional(),
  returnCount: z.number(),
  hasCoverLetter: z.boolean(),
  hasResume: z.boolean(),
  socials: z.any().optional(),
  progress: z.string().optional(),
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

  // Form Definition
  const form: UseFormReturn<FormValues> = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user.firstName,
      middleName: user.middleName ?? "",
      lastName: user.lastName,
      email: user.email,
      gender: user.gender,
      staffPerception: user.staffPerception,
      customerClass: user.customerClass,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      country: user.country,
      heritage: user.heritage,
      communication: user.communication,
      role: user.role,
      revenue: user.revenue,
      returnCount: user.returnCount,
      hasCoverLetter: user.hasCoverLetter || true,
      hasResume: user.hasResume || true,
      socials: user.socials,
      progress: user.progress,
    },
  });

  // Submit handler
  const { mutateAsync: updateUser } = useUpdateUser();

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const loadingToast = toast.loading("Updating user...");
    
    try {
      await updateUser({
        id: user.id,
        ...values,
      });
      toast.success("User updated successfully", { id: loadingToast });
    } catch {
      toast.error("Failed to update user", { id: loadingToast });
    }
    
    setDialog(null);
  };

  return (
    <DialogContent className="h-[70vh] overflow-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          <PencilLine size={18} />
          Edit User
        </DialogTitle>
      </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 text-black px-1"
          >
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
<SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Prefer Not to Say">
                            Prefer Not to Say
                          </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>

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
              <SectionLabel>Classification &amp; Contact</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="staffPerception"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Perception</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Staff Perception" />
                          </SelectTrigger>
                           <SelectContent>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="Advocate">Advocate</SelectItem>
                            <SelectItem value="Satisfied">Satisfied</SelectItem>
                            <SelectItem value="Blacklisted">Blacklisted</SelectItem>
                            <SelectItem value="TBD">TBD</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Whatsapp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 093884774" {...field} />
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
                          className="w-full text-[#455A64]"
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
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="heritage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heritage</FormLabel>
                      <FormControl>
                        <SearchSelect
                          name="heritage"
                          placeholder="Heritage"
                          className="w-full text-[#455A64]"
                          options={countries}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue("heritage", e ? e.value : "");
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues("heritage") &&
                              countries.find(
                                (c) => c.value === form.getValues("heritage")
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
                  name="communication"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue
                              className="mr-3"
                              placeholder="Select Communication"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="socials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Socials</FormLabel>
                      <FormControl>
                        <Input placeholder="Socials" {...field} />
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
                  name="returnCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder=""
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SectionLabel>Flags &amp; Notes</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hasCoverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C/L</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
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
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress</FormLabel>
                      <FormControl>
                        <Input placeholder="Progress" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
        </form>
      </Form>

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
