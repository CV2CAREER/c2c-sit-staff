/* eslint-disable */
import React, { SetStateAction, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { useAdminMutations } from '@/hooks/api/admin.api';
import { CAPITALIZED_OPTIONS, PLAN_OPTIONS } from '@/utils/enum-options';
import { FieldLegend, FieldSwitch, LockedField, MaskedPassword } from "@/components/ui/form-field";
import { calculateCampaignFields } from '@/utils/campaign-calculator';

const SectionLabel = ({ children, tag }: { children: React.ReactNode; tag?: string }) => (
  <h2 className="flex items-center gap-2 pb-1.5 mb-2.5 border-b text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
    {children}
    {tag ? (
      <span className="rounded bg-muted px-[7px] py-0.5 text-[10.5px] font-medium normal-case tracking-normal text-muted-foreground">
        {tag}
      </span>
    ) : null}
  </h2>
);

// "Adecco_Aggregator" / "firstName" -> "Adecco Aggregator" / "First Name"
const humanizeFieldName = (field: string) =>
  field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

// SPR-21-41-016 AC4/AC5: Tour and Return Count accept numbers only.
// These live in the seekExternalCredentials JSONB where historical rows hold
// numeric *strings* ("3"), so digit strings stay acceptable here rather than
// being typed strictly as numbers — otherwise every legacy row would fail
// validation on save. Anything that is not digits, an empty value or a
// non-negative whole number is still rejected, and the inputs additionally
// strip non-numeric keystrokes as they are typed.
const optionalCount = z
  .union([
    z.literal(''),
    z.string().regex(/^\d+$/, 'Must be numbers only'),
    z.number().int('Must be a whole number').min(0, 'Cannot be less than 0'),
  ])
  .nullable()
  .optional();

const formSchema = z.object({
// SPR-21-41-016: Full_Name is deliberately absent from this schema and from
    // defaultValues. The backend rebuilds it from the name components, so
    // keeping it in form state would submit a derived value back and corrupt
    // the row. The Identity section reads it straight off the client object
    // through getField(). scripts/check-campaign-modal-bindings.mjs fails the
    // build if Full_Name ever reappears as a form control.
    First_Name: z.string().min(2).max(50).or(z.literal('')).optional().nullable(),
  Middle_Name: z.string().optional().nullable(),
  Last_Name: z.string().min(2).max(50).or(z.literal('')).optional().nullable(),
  Plan: z.string().optional().nullable(),
  ReturnCount: optionalCount,
  Order: z.string().optional().nullable(),
  SeekSubStartDate: z.string().optional().nullable(),
  SeekWeeklyMax: z.number().optional().nullable(),
  SeekSubDurDays: z.number().optional().nullable(),
  GraceDuration: z.number().optional().nullable(),
  Capitalized: z.string().optional().nullable(),
  Country: z.string().optional().nullable(),
  Active: z.boolean().optional().nullable(),
  // Answer Priority and the job aggregators are deliberately absent: they are
  // not part of this modal's design and are managed through the separate
  // Manage Job Aggregators modal. Keeping them in form state would submit
  // stale defaults over changes made there.
  Throttle_Listing: z.boolean().optional().nullable(),
  Throttle_Duration: z.number().optional().nullable(),
  Batch: z.string().nullable(),
  Craft: z.string().nullable(),
  Status: z.string().nullable(),
  // SPR-21-41-016: TourCount is a retained grid column with no prior modal
  // binding. It is stored in the seekExternalCredentials JSONB, so the loose
  // update payload accepts it without a backend change.
  TourCount: optionalCount,
  Alias_Email: z.string().email().or(z.literal('')).optional().nullable(),
  Alias_Password: z.string().optional().nullable(),
  // SPR-21-41-016: all five Placement Controller names (VaName, VetName,
  // CompletedName, InterimDPCName, InterimSPCName) are deliberately absent from
  // this schema and from defaultValues. They are edited through VACell and
  // persisted by savePcChanges, never as part of the form payload. Leaving
  // VaName in form state meant a re-assignment made in the dropdown could be
  // overwritten by the stale default value in the same Update.
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

   

export const EditCampaignClientModal: React.FC<EditTableModalProps> = ({
  client,
  setDialog,
  editClientAction,
}) => {
  const queryClient = useQueryClient();
  const { assignVaMutation } = useAdminMutations();

  const countries = countryList()
    .getData()
    .map((country) => ({ ...country, value: country.label }));

  // Placement Controller selections are staged here (not saved) until Update
  // is clicked — VACell reports changes up via onSelectionChange instead of
  // calling the assignment API itself. `undefined` means "untouched this
  // session", so onSubmit's diff only sends a request for slots the user
  // actually changed, distinguishing that from an explicit unassign (null).
  const [dpcEmail, setDpcEmail] = useState<string | null | undefined>(undefined);
  const [vpcEmail, setVpcEmail] = useState<string | null | undefined>(undefined);
  const [spcEmail, setSpcEmail] = useState<string | null | undefined>(undefined);

  // Helper: read a field from the client object, falling back to seekExternalCredentials
  // JSONB for fields that are stored there (First_Name, Plan, Country, etc.)
  const getField = (key: string) => {
    const top = (client as any)[key];
    if (top !== undefined && top !== null) return top;
    return (client as any)?.seekExternalCredentials?.[key] ?? null;
  };

  // SPR-21-41-015: Identity and derived columns are shown read-only. Render an
  // em dash for anything missing rather than an empty box, so a blank is
  // visibly "no value" instead of looking like an editable field that failed to
  // populate.
  const displayValue = (value: unknown): string => {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

// SPR-21-41-015: date-only display for the derived and audit date columns.
// The ISO date portion is read straight out of the string instead of going
// through `new Date()`, because these values are stored at UTC midnight and
// `toLocaleString()` would shift them back a day in negative-offset timezones.
// Formatted as DD-MM-YYYY to match the date inputs in this same modal, so the
// editable start date and the read-only end date can be compared directly.
const displayDate = (value: unknown): string => {
if (value === undefined || value === null || value === '') return '—';
const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
// Already DD-MM-YYYY (the campaign calculator's output). `new Date()` would
// read it month-first and swap the day and month.
if (/^\d{2}-\d{2}-\d{4}$/.test(String(value))) return String(value);
const parsed = new Date(value as string);
return isNaN(parsed.getTime())
? String(value)
: parsed.toLocaleDateString('en-GB');
};

  

  // SPR-21-41-016 AC3: Plan is chosen from the central list, so free text can no
  // longer be entered. react-select is not creatable, so the only way to set a
  // value is picking an option.
  //
  // Rows written before this ticket can still hold a Plan title that is not in
  // the central list. The backend resolves Plan against the plans table by
  // title to read validityPeriod, so dropping an unknown value here would both
  // hide real data and silently clear it on the next save. Any such value is
  // therefore appended to the option list so it stays visible and unchanged
  // until somebody deliberately moves the client onto a standard plan.
  const planOptions: OptionType[] = useMemo(() => {
    const current = getField('Plan');
    if (!current) return PLAN_OPTIONS;
    const exists = PLAN_OPTIONS.some(
      (option) => option.value.toLowerCase() === String(current).toLowerCase()
    );
    return exists
      ? PLAN_OPTIONS
      : [...PLAN_OPTIONS, { value: String(current), label: String(current) }];
  }, [client]);

  // SPR-21-41-018 AC4: Capitalized offers only the central state list, but the
  // campaign flight toggle writes 'INFLIGHT', which is not in
  // CAPITALIZED_OPTIONS. Without this, a client mid-flight showed a blank
  // Capitalized dropdown. Appending the stored value keeps it visible and
  // unchanged until somebody deliberately picks an approved state.
  const capitalizedOptions: OptionType[] = useMemo(() => {
    const current = getField('Capitalized');
    if (!current) return CAPITALIZED_OPTIONS;
    const exists = CAPITALIZED_OPTIONS.some(
      (option) => option.value.toLowerCase() === String(current).toLowerCase()
    );
    return exists
      ? CAPITALIZED_OPTIONS
      : [
          ...CAPITALIZED_OPTIONS,
          { value: String(current), label: String(current) },
        ];
  }, [client]);

  // Form Definition
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      Throttle_Listing: getField('Throttle_Listing') ?? false,
      Throttle_Duration: getField('Throttle_Duration') ?? null,
      Batch: getField('Batch') ?? null,
      Craft: getField('Craft') ?? null,
      Status: getField('Status') ?? null,
      TourCount: getField('TourCount') ?? '',
      Alias_Email: getField('Alias_Email') ?? null,
      Alias_Password: getField('Alias_Password') ?? null,
    },
  });

  // SPR-21-41-019 AC1: Sub End Date, Campaign End, Sub To Expire Days and Sub
  // Expired are recalculated live from Start Date / Sub Duration Days / Grace
  // Duration, before Save is ever pressed. Previously they only appeared after
  // saving, so a PC extending a grace period had to guess what it would do.
  //
  // This calls the SAME `calculateCampaignFields` the backend calls on save.
  // The client copy is a generated mirror of the backend file, enforced by
  // scripts/sync-campaign-calculator.mjs --check in the build, so the numbers
  // previewed here cannot drift from the numbers that get stored.
  //
  // `createdAt` is passed for the same reason the server passes it: rows written
  // before the start date existed fall back to it instead of showing blanks.
  const liveSubscription = useWatch({
    control: form.control,
    name: ['SeekSubStartDate', 'SeekSubDurDays', 'GraceDuration'],
  });

  // SPR-21-41-019: the governing plan's validityPeriod is the authority for Sub
  // Duration Days, and the server overwrites whatever is submitted. When the plan
  // is the source the field is read-only so nobody can type a value that will be
  // silently discarded on save. With no usable plan period there is no other
  // source, so the field stays editable.
  const durationIsPlanDriven = getField('SeekSubDurDaysFromPlan') === true;

  const derivedSubscription = useMemo(() => {
    const [startDate, durationDays, graceDays] = liveSubscription ?? [];
    const computed = calculateCampaignFields({
      SeekSubStartDate: startDate ?? undefined,
      createdAt: getField('createdAt') ?? undefined,
      SeekSubDurDays: durationDays ?? undefined,
      GraceDuration: graceDays ?? undefined,
    });
    return {
      SeekSubEndDate: computed.SeekSubEndDate ?? '',
      CampaignEnd: computed.CampaignEnd ?? '',
      SeekSubToExpireDays: computed.SeekSubToExpireDays ?? 0,
      SeekSubExpired: computed.SeekSubExpired ?? '',
    };
  }, [liveSubscription, client]);

  // SPR-21-41-020 AC1: drives the status toggle's label so it reads Active or
  // Inactive to match the current state. Watched rather than read once so the
  // label flips the moment the switch is used.
  const activeValue = useWatch({ control: form.control, name: 'Active' });
  const isActive = Boolean(activeValue);

  // Placement Controller slots staged via VACell's onSelectionChange — only
  // included if the user actually touched that dropdown this session
  // (undefined = untouched, so it's left out of the request entirely).
  const pcChanges: {
    variant: 'DPC' | 'VPC' | 'SPC';
    label: string;
    email: string | null;
  }[] = [
    ...(dpcEmail !== undefined ? [{ variant: 'DPC' as const, label: 'DPC', email: dpcEmail }] : []),
    ...(vpcEmail !== undefined ? [{ variant: 'VPC' as const, label: 'VPC', email: vpcEmail }] : []),
    ...(spcEmail !== undefined ? [{ variant: 'SPC' as const, label: 'SPC', email: spcEmail }] : []),
  ];

  const savePcChanges = async () => {
    for (const change of pcChanges) {
      await assignVaMutation.mutateAsync({
        credId: String(client.id),
        vaEmail: change.email,
        variant: change.variant,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['admin-fetch-campaign-clients'] });
  };

  // Submit handler
  const onSubmit = async (values: CampaignFormValues) => {
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

    // If there are no changes anywhere — neither form fields nor PC
    // assignments — return early.
    if (Object.keys(updatedData).length === 0 && pcChanges.length === 0) {
      toast('No changes detected.');
      setDialog(null);
      return;
    }

    toast.loading('Updating client...');

    try {
      if (pcChanges.length > 0) {
        await savePcChanges();
      }

      if (Object.keys(updatedData).length > 0) {
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
      } else {
        // Only PC assignments changed — savePcChanges already invalidated
        // the table query, so just report success and close.
        toast.dismiss();
        toast.success('Client has been updated successfully');
        setDialog(null);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(
        err?.response?.data?.message ?? err?.message ?? 'Failed to update client'
      );
    }
  };

  const fullName =
    getField('Full_Name') ||
    [getField('First_Name'), getField('Middle_Name'), getField('Last_Name')]
      .filter(Boolean)
      .join(' ');

  // SPR-21-41-015: three-row grid so the title and the Update/Cancel footer
  // stay pinned while only the section body scrolls. `Form` is FormProvider
  // (it renders no DOM element), and the single real <form> uses
  // display:contents so the three rows remain direct grid children.
  //
  // SPR-21-01: sections, their order and their column counts follow the
  // "Edit Client Info Modal on Campaign Mgt" design HTML.
  return (
    <DialogContent className="max-h-[calc(100vh-64px)] max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          <PencilLine size={18} />
          Edit Client&apos;s Info
        </DialogTitle>
        <DialogDescription>
          {fullName ? `${fullName} · ` : ''}Client {client.id} · Greyed fields
          are system-set and cannot be changed here
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const [firstField, firstError] = Object.entries(errors)[0] ?? [];
            toast.error(
              firstField
                ? `${humanizeFieldName(firstField)}: ${(firstError as any)?.message || 'Invalid value'}`
                : 'Please fix the highlighted fields before updating.'
            );
          })}
          className="contents text-black"
        >
          <div className="min-h-0 space-y-5 overflow-y-auto overflow-x-hidden py-2 pr-1">
            {/* Every Identity field is derived or audited server-side, so it
                is displayed read-only and never reaches the update payload. */}
            <section>
              <SectionLabel tag="system">Identity</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
                <LockedField
                  field="CustomerId"
                  label="Customer ID"
                  value={displayValue(getField('CustomerId'))}
                />
                <LockedField
                  field="id"
                  label="Client ID"
                  value={displayValue(client.id)}
                />
                <LockedField
                  field="Full_Name"
                  label="Full Name"
                  value={displayValue(getField('Full_Name'))}
                />
                <LockedField
                  field="createdAt"
                  label="Created At"
                  value={displayDate(getField('createdAt'))}
                />
                <LockedField
                  field="updatedAt"
                  label="Updated At"
                  value={displayDate(getField('updatedAt'))}
                />
                <LockedField
                  field="updateBy"
                  label="Updated By"
                  value={displayValue(getField('updateBy') ?? getField('updatedBy'))}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Client</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                <FormField
                  control={form.control}
                  name="First_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First Name"
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
                          placeholder="Middle Name"
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
                  name="Last_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last Name"
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
                  name="Country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <SearchSelect
                          name="Country"
                          placeholder="Country of Residence"
                          className="w-full"
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
                <FormField
                  control={form.control}
                  name="Plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <FormControl>
                        {/* SPR-21-41-016 AC3: dropdown bound to the central
                            Plan list. Not creatable, so free-text entry is
                            blocked. */}
                        <SearchSelect
                          name="Plan"
                          placeholder="No plan"
                          className="w-full"
                          options={planOptions}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue('Plan', e.value);
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues('Plan') &&
                              planOptions.find(
                                (p) => p.value === form.getValues('Plan')
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
                  name="Craft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course of Study</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Course of Study"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-x-5 gap-y-3">
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
                  name="TourCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour</FormLabel>
                      <FormControl>
                        {/* SPR-21-41-016 AC4: non-numeric keystrokes are
                            dropped on the way in, so the field can only ever
                            hold digits. */}
                        <Input
                          inputMode="numeric"
                          placeholder="Tour"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/[^\d]/g, ''))
                          }
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
                <FormField
                  control={form.control}
                  name="ReturnCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Count</FormLabel>
                      <FormControl>
                        {/* SPR-21-41-016 AC5: non-numeric keystrokes are
                            dropped on the way in, so the field can only ever
                            hold digits. */}
                        <Input
                          inputMode="numeric"
                          placeholder="Return Count"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/[^\d]/g, ''))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Credentials</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                <FormField
                  control={form.control}
                  name="Alias_Email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy Email</FormLabel>
                      <FormControl>
                        {/* SPR-19-02-009: this displays the real proxy mailbox
                            (jobsite_credentials.email), not the old Alias_Email.
                            Read-only — managed through the Jobsite Credentials
                            accept/approve flow, not editable from Campaign
                            Management. */}
                        <LockedField value={field.value ?? ''} />
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
                      <FormLabel>Proxy Password</FormLabel>
                      <FormControl>
                        <MaskedPassword
                          name="Alias_Password"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Subscription</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
                <FormField
                  control={form.control}
                  name="SeekSubStartDate"
                  render={({ field }) => (
                    <FormItem>
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
                          className="h-9 w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          value={field.value ?? ''}
                          readOnly={durationIsPlanDriven}
                          aria-readonly={durationIsPlanDriven}
                          className={
                            durationIsPlanDriven
                              ? 'bg-muted/60 text-muted-foreground'
                              : undefined
                          }
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      {durationIsPlanDriven && (
                        <p className="text-xs text-muted-foreground">
                          From the client&apos;s plan. Editable only when they
                          have no plan period to derive it from.
                        </p>
                      )}
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
                          placeholder="Days"
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
                <FormField
                  control={form.control}
                  name="Assurance"
                  render={({ field }) => (
                    <FormItem>
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
                  name="SeekWeeklyMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly Max</FormLabel>
                      <FormControl>
                        {/* SPR-21-41-018 AC3: this was absent from the modal
                            entirely, so there was no way to set or change it. */}
                        <Input
                          type="number"
                          placeholder="Applications per week"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Capitalized"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capitalized</FormLabel>
                      <FormControl>
                        {/* SPR-21-41-018 AC4: bound to the central state list
                            in enum-options.ts, so only approved states can be
                            chosen. Off-list legacy values are appended so they
                            stay visible instead of silently disappearing. */}
                        <SearchSelect
                          name="Capitalized"
                          placeholder="Capitalized"
                          className="w-full"
                          options={capitalizedOptions}
                          onChange={(e: SingleValue<OptionType>) => {
                            if (e) {
                              form.setValue('Capitalized', e.value);
                            }
                            return false;
                          }}
                          onBlur={field.onBlur}
                          value={
                            (form.getValues('Capitalized') &&
                              capitalizedOptions.find(
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
              </div>

              {/* SPR-21-41-018 AC5: the derived subscription values, locked.
                  They are recomputed server-side from the start date, the
                  duration and the grace period, so editing them here would be
                  undone on the next save. SPR-21-41-019 previews them live. */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-x-5 gap-y-3">
                <LockedField
                  field="SeekSubEndDate"
                  label="Sub End Date"
                  value={displayDate(derivedSubscription.SeekSubEndDate)}
                />
                <LockedField
                  field="CampaignEnd"
                  label="Campaign End"
                  value={displayDate(derivedSubscription.CampaignEnd)}
                />
                <LockedField
                  field="SeekSubToExpireDays"
                  label="Sub To Expire Days"
                  value={displayValue(derivedSubscription.SeekSubToExpireDays)}
                />
                <LockedField
                  field="SeekSubExpired"
                  label="Sub Expired"
                  value={displayValue(derivedSubscription.SeekSubExpired)}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                End dates and expiry are calculated from start date, duration
                and grace
              </p>
            </section>

            {/* SPR-21-41-020 AC1/AC2: the status toggle sits on the same row as
                the two application dates, and its label reflects the current
                state. The dates are written by the applicant pipeline, so they
                stay audit data. */}
            <section>
              <SectionLabel>Activity</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-x-5 gap-y-3">
                <FormField
                  control={form.control}
                  name="Active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <FieldSwitch
                          label={isActive ? 'Active' : 'Inactive'}
                          checked={isActive}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <LockedField
                  field="First_Application"
                  label="First Application"
                  value={displayDate(getField('First_Application'))}
                />
                <LockedField
                  field="Last_Application"
                  label="Last Application"
                  value={displayDate(getField('Last_Application'))}
                />
              </div>
            </section>

            {/* Placement Controller assignments are edited through VACell
                rather than as form fields, so they never enter the
                react-hook-form payload. `savePcChanges` persists them on
                Update. */}
            <section>
              <SectionLabel>Placement Controllers</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-x-5 gap-y-3">
                <div className="flex flex-col gap-2">
                  <FormLabel>Discovery Placement Controller</FormLabel>
                  <VACell field="VaName" data={client} variant="DPC" onSelectionChange={setDpcEmail} />
                </div>
                <div className="flex flex-col gap-2">
                  <FormLabel>Vetting Placement Controller</FormLabel>
                  <VACell field="VetName" data={client} variant="VPC" onSelectionChange={setVpcEmail} />
                </div>
                <div className="flex flex-col gap-2">
                  <FormLabel>Submission Placement Controller</FormLabel>
                  <VACell field="CompletedName" data={client} variant="SPC" onSelectionChange={setSpcEmail} />
                </div>
              </div>
            </section>
          </div>
          <DialogFooter className="sm:justify-between">
            <FieldLegend />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};
