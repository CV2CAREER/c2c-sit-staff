/* eslint-disable */
import React, { SetStateAction } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { ApiError, ApiSuccess } from '@/types/apiResponse.types';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from 'antd'; // Import DatePicker from antd
import moment from 'moment'; // Import moment
import SearchSelect from '@/components/ui/react-select';
import { OptionType } from '@/types';
import { SingleValue } from 'react-select';
import countryList from 'react-select-country-list';
import { CampaignTableColType } from '@/types/admin';
import toast from 'react-hot-toast';
import { validateHeaderName } from 'http';
import { VACell } from './AssignVA';
import { PencilLine } from 'lucide-react';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2">
    {children}
  </h4>
);

// "Adecco_Aggregator" / "firstName" -> "Adecco Aggregator" / "First Name"
const humanizeFieldName = (field: string) =>
  field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const formSchema = z.object({
  Full_Name: z.string().min(2).max(50).or(z.literal('')).optional().nullable(),
  First_Name: z.string().min(2).max(50).or(z.literal('')).optional().nullable(),
  Middle_Name: z.string().optional().nullable(),
  Last_Name: z.string().min(2).max(50).or(z.literal('')).optional().nullable(),
  Plan: z.string().optional().nullable(),
  ReturnCount: z.string().optional().nullable(),
  Order: z.string().optional().nullable(),
  SeekSubStartDate: z.string().optional().nullable(),
  SeekWeeklyMax: z.number().optional().nullable(),
  SeekSubDurDays: z.number().optional().nullable(),
  GraceDuration: z.number().optional().nullable(),
  Capitalized: z.string().optional().nullable(),
  Country: z.string().optional().nullable(),
  Active: z.boolean().optional().nullable(),
  SeekAnswerPriority: z.boolean().optional().nullable(),
  Seek_Aggregator: z.boolean().optional().nullable(),
  Linkedin_Aggregator: z.boolean().optional().nullable(),
  Jobserve_Aggregator: z.boolean().optional().nullable(),
  EscapeCity_Aggregator: z.boolean().optional().nullable(),
  WorkforceAustralia_Aggregator: z.boolean().optional().nullable(),
  Indeed_Aggregator: z.boolean().optional().nullable(),
  Monster_Aggregator: z.boolean().optional().nullable(),
  Jora_Aggregator: z.boolean().optional().nullable(),
  Adzuna_Aggregator: z.boolean().optional().nullable(),
  CareerOne_Aggregator: z.boolean().optional().nullable(),
  Reed_Aggregator: z.boolean().optional().nullable(),
  // API sends this as either 0/1 or true/false depending on the record, so accept both.
  Adecco_Aggregator: z.union([z.number(), z.boolean()]).optional().nullable(),
  CVLibrary_Aggregator: z.boolean().optional().nullable(),
  NHSJobs_Aggregator: z.boolean().optional().nullable(),
  Throttle_Listing: z.boolean().optional().nullable(),
  Throttle_Duration: z.number().optional().nullable(),
  Batch: z.string().nullable(),
  Craft: z.string().nullable(),
  Status: z.string().nullable(),
  Alias_Email: z.string().email().or(z.literal('')).optional().nullable(),
  Alias_Password: z.string().optional().nullable(),
  VaName: z.string().optional().nullable(),
  Assurance: z.string().optional().nullable(),
});

type CampaignFormValues = z.infer<typeof formSchema>;

interface EditTableModalProps {
  client: CampaignTableColType;
  setDialog: (
    value: SetStateAction<
      'edit' | 'soft-delete' | 'restore' | 'delete' | 'generateAQ' | null
    >
  ) => void;
  editClientAction: () => UseMutationResult<
    ApiSuccess<any>,
    ApiError,
    { clientId: string | number; data: any }
  >;
}

const capitalizedData = [
  {
    value: 'HOLD',
    label: 'HOLD',
  },
  {
    value: 'FLIGHT',
    label: 'FLIGHT',
  },
  {
    value: 'EMPLOYED',
    label: 'EMPLOYED',
  },
];

export const EditCampaignClientModal: React.FC<EditTableModalProps> = ({
  client,
  setDialog,
  editClientAction,
}) => {
  const queryClient = useQueryClient();

  const countries = countryList()
    .getData()
    .map((country) => ({ ...country, value: country.label }));

  // Helper: read a field from the client object, falling back to seekExternalCredentials
  // JSONB for fields that are stored there (First_Name, Plan, Country, etc.)
  const getField = (key: string) => {
    const top = (client as any)[key];
    if (top !== undefined && top !== null) return top;
    return (client as any)?.seekExternalCredentials?.[key] ?? null;
  };

  // Form Definition
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Full_Name: getField('Full_Name'),
      First_Name: getField('First_Name'),
      Middle_Name: getField('Middle_Name'),
      Last_Name: getField('Last_Name'),
      Plan: getField('Plan'),
      ReturnCount: getField('ReturnCount') || null,
      Order: getField('Order'),
      SeekSubStartDate: getField('SeekSubStartDate'),
      Assurance: getField('Assurance'),
      SeekWeeklyMax: getField('SeekWeeklyMax'),
      SeekSubDurDays: getField('SeekSubDurDays'),
      GraceDuration: getField('GraceDuration'),
      Capitalized: getField('Capitalized'),
      Country: getField('Country'),
      Active: client.Active ?? false,
      SeekAnswerPriority: client.SeekAnswerPriority ?? false,
      Seek_Aggregator: getField('Seek_Aggregator') ?? false,
      Linkedin_Aggregator: getField('Linkedin_Aggregator') ?? false,
      Jobserve_Aggregator: getField('Jobserve_Aggregator') ?? false,
      EscapeCity_Aggregator: getField('EscapeCity_Aggregator') ?? false,
      WorkforceAustralia_Aggregator:
        getField('WorkforceAustralia_Aggregator') ?? false,
      Indeed_Aggregator: getField('Indeed_Aggregator') ?? false,
      Monster_Aggregator: getField('Monster_Aggregator') ?? false,
      Jora_Aggregator: getField('Jora_Aggregator') ?? false,
      Adzuna_Aggregator: getField('Adzuna_Aggregator') ?? false,
      CareerOne_Aggregator: getField('CareerOne_Aggregator') ?? false,
      Reed_Aggregator: getField('Reed_Aggregator') ?? false,
      Adecco_Aggregator: getField('Adecco_Aggregator') ?? 0,
      CVLibrary_Aggregator: getField('CVLibrary_Aggregator') ?? false,
      NHSJobs_Aggregator: getField('NHSJobs_Aggregator') ?? false,
      Throttle_Listing: getField('Throttle_Listing') ?? false,
      Throttle_Duration: getField('Throttle_Duration') ?? null,
      Batch: getField('Batch') ?? null,
      Craft: getField('Craft') ?? null,
      Status: getField('Status') ?? null,
      Alias_Email: getField('Alias_Email') ?? null,
      Alias_Password: getField('Alias_Password') ?? null,
      VaName: getField('VaName') ?? null,
    },
  });

  // Submit handler
  const onSubmit = (values: CampaignFormValues) => {
    // Build a diff: only fields whose value changed relative to the original client data
    const updatedData = Object.entries(values).reduce(
      (acc: Partial<z.infer<typeof formSchema>>, [key, value]) => {
        const typedKey = key as keyof z.infer<typeof formSchema>;
        // currentValue may live at top level or inside seekExternalCredentials JSONB
        const currentValue = getField(key);

        let processedValue: typeof value | undefined = value;
        if (typeof processedValue === 'string') {
          processedValue = processedValue.trim() as any;
        }
        // Treat empty string as "no change"
        if (processedValue === '' || processedValue === null) {
          return acc;
        }

        if (processedValue !== currentValue && typedKey in formSchema.shape) {
          (acc as any)[typedKey] = processedValue;
        }

        return acc;
      },
      {} as Partial<z.infer<typeof formSchema>>
    );

    // If there are no changes, return early
    if (Object.keys(updatedData).length === 0) {
      toast('No changes detected.');
      setDialog(null);
    } else {
      toast.loading('Updating client...');

      editClientAction().mutate(
        {
          clientId: client.id,
          data: {
            ...updatedData,
          },
        },
        {
          onSuccess: () => {
            toast.dismiss();
            toast.success('Client has been updated successfully');
            setDialog(null);

            // Refresh campaign clients table
            queryClient.invalidateQueries({
              queryKey: ['admin-fetch-campaign-clients'],
            });
          },
          onError: (err) => {
            toast.dismiss();
            toast.error(err.message || 'Failed to update client');
          },
        }
      );
    }
  };

  return (
    <DialogContent className="h-[70vh] overflow-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          <PencilLine size={18} />
          Edit Client&apos;s Info
        </DialogTitle>
        <DialogDescription>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 text-black"
            >
              <SectionLabel>Personal Information</SectionLabel>
              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="First_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Itoro"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Middle_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Itoro"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="Last_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Plan"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="Alias_Email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alias Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alias Email"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Alias_Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel> Alias Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alias Password"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="ReturnCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Count</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Return Count"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Order"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionLabel>Plan &amp; Subscription</SectionLabel>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <FormField
                  control={form.control}
                  name="Assurance"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-[50%]">
                      <FormLabel>Assurance</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="SeekSubStartDate"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-[50%]">
                      <FormLabel>Subscription Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          format="DD-MM-YYYY"
                          value={
                            field.value
                              ? moment(field.value, [
                                  'DD-MM-YYYY',
                                  moment.ISO_8601,
                                ])
                              : null
                          }
                          onChange={(dateMoment: moment.Moment | null) => {
                            field.onChange(
                              dateMoment
                                ? dateMoment.format('DD-MM-YYYY')
                                : null
                            );
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="SeekSubDurDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Duration Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Sub Duration Days"
                          value={field.value as number}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="GraceDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Duration</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Grace Duration"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <FormField
                  control={form.control}
                  name="Capitalized"
                  render={({ field }) => (
                    <FormItem className="">
                      <FormLabel>Capitalized</FormLabel>
                      <FormControl>
                        <SearchSelect
                          name="Capitalized"
                          placeholder="Capitalized"
                          className="col-span-full text-[#455A64] w-full"
                          options={capitalizedData}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue('Capitalized', e.value);
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues('Capitalized') &&
                              capitalizedData.find(
                                (c) => c.value === form.getValues('Capitalized')
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
                  name="Country"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-[50%]">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <SearchSelect
                          name="Country"
                          placeholder="Country of Residence"
                          className="col-span-full text-[#455A64] w-full"
                          options={countries}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue('Country', e.value);
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues('Country') &&
                              countries.find(
                                (c) => c.value === form.getValues('Country')
                              )) ||
                            null
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionLabel>Status &amp; Aggregators</SectionLabel>
              <div className="flex flex-wrap gap-3">
                <FormField
                  control={form.control}
                  name="Active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="SeekAnswerPriority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer Priority</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Seek_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Seek Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Reed_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Reed Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Jora_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Jora Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Adzuna_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Adzuna Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="CareerOne_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>CareerOne Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionLabel>Other Details</SectionLabel>
              <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="Batch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Batch"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Craft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Craft</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Craft"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SectionLabel>Placement Controllers</SectionLabel>
              <div className="flex flex-col gap-1">
                <label htmlFor="">Discovery Placement Controller</label>
                <VACell data={client} variant="DPC" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="">Vetting Placement Controller</label>
                <VACell data={client} variant="VPC" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="">Submission Placement Controller</label>
                <VACell data={client} variant="SPC" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="">Interim Discovery Placement Controller</label>
                <VACell data={client} variant="InterimDPC" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="">Interim Submission Placement Controller</label>
                <VACell data={client} variant="InterimSPC" />
              </div>
            </form>
          </Form>
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
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
      </DialogFooter>
    </DialogContent>
  );
};
