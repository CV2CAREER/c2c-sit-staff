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

const formSchema = z.object({
  firstName: z.string().min(2).max(50),
  middleName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  gender: z.enum(["male", "female", "Male", "Female"]).optional(),
  customerClass: z.string().optional(),
  voiceNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  country: z.string().optional(),
  heritage: z.string().optional(),
  communication: z.string().optional(),
  role: z.enum(["admin", "client", "guest", "partner", "coach", "sales", "assistant", "tpc", "pc"]),
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
      customerClass: user.customerClass,
      voiceNumber: user.voiceNumber,
      whatsappNumber: user.whatsappNumber,
      country: user.country,
      heritage: user.heritage,
      communication: user.communication,
      role: user.role,
      revenue: user.revenue,
      returnCount: user.returnCount,
      hasCoverLetter: user.hasCoverLetter,
      hasResume: user.hasResume,
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
        <DialogTitle className="text-blue">Edit User</DialogTitle>
        <DialogDescription>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 text-black"
            >
              <div className="flex gap-3">
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

              <div className="flex gap-3">
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
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="customerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Class</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer Class" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="voiceNumber"
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

              <div className="flex gap-3">
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
                          className="col-span-full text-[#455A64]"
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

              <div className="flex gap-3">
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
                          className="col-span-full text-[#455A64]"
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

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue
                              className="mr-3"
                              placeholder="Select Persona"
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="client">client</SelectItem>
                            <SelectItem value="guest">guest</SelectItem>
                            <SelectItem value="partner">partner</SelectItem>
                            <SelectItem value="sales">sales</SelectItem>
                            <SelectItem value="coach">coach</SelectItem>
                            {/* <SelectItem value="returnee">returnee</SelectItem>
                            <SelectItem value="loyalist">loyalist</SelectItem>
                            <SelectItem value="business">business</SelectItem>
                            <SelectItem value="technology">technology</SelectItem> */}
                            <SelectItem value="assistant">PC</SelectItem>
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

              <div className="flex gap-3">
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

              <div className="flex gap-3">
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
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setDialog(null);
          }}
        >
          Cancel
        </Button>
        <Button onClick={() => form.handleSubmit(onSubmit)()}>Update</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditTableModal;
