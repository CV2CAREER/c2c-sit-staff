import SearchSelect from '@/components/ui/react-select';
import { OptionType } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SingleValue } from 'react-select';
import { useAdminQueries, useAdminMutations } from '@/hooks/api/admin.api';
import { useQueryClient } from '@tanstack/react-query';

interface VACellProps {
    data: null | any;
    variant?: 'DPC' | 'VPC' | 'SPC' | 'InterimDPC' | 'InterimSPC';
}

export const VACell = ({ data = null, variant = 'DPC' }: VACellProps) => {
    const emailField =
        variant === 'VPC'
            ? 'VetEmail'
            : variant === 'SPC'
              ? 'CompletedEmail'
              : variant === 'InterimDPC'
                ? 'InterimDPCEmail'
                : variant === 'InterimSPC'
                  ? 'InterimSPCEmail'
                  : 'VaEmail';
    const [selected, setSelected] = useState<any>(null);
    const [unassign, setUnassign] = useState(data?.[emailField]);
    const queryClient = useQueryClient();

    const {
        pcsDomain: { data: vaData, isError },
    } = useAdminQueries({ fetchPCs: true });
    const vas = Array.isArray(vaData) ? vaData : ((vaData as any)?.items ?? []);

    const { assignVaMutation } = useAdminMutations();

    useEffect(() => {
        if (isError) {
            toast.error('Failed to fetch Users');
        }
    }, [isError]);

    useEffect(() => {
        const currentEmail = data?.[emailField];
        if (vas.length && currentEmail) {
            setSelected(vas.find((v: any) => v.email === currentEmail));
        } else {
            setSelected(null);
        }
    }, [vaData, data?.[emailField]]);

    const label =
        variant === 'VPC'
            ? 'VPC'
            : variant === 'SPC'
              ? 'SPC'
              : variant === 'InterimDPC'
                ? 'Interim DPC'
                : variant === 'InterimSPC'
                  ? 'Interim SPC'
                  : 'DPC';

    async function assignVa(credId: string, VaEmail: string | null) {
        const tId = toast.loading(
            VaEmail ? `Updating assigned ${label}` : `Unassigning ${label}...`
        );

        try {
            await assignVaMutation.mutateAsync({
                credId,
                vaEmail: VaEmail || null,
                variant,
            });

            queryClient.invalidateQueries({
                queryKey: ['admin-fetch-campaign-clients'],
            });

            toast.success(
                VaEmail
                    ? `Assigned ${label} updated successfully.`
                    : `${label} unassigned successfully.`,
                { id: tId }
            );
        } catch (err: Error | any) {
            toast.error(
                err?.response?.data?.message ??
                    err?.message ??
                    err?.response?.message ??
                    `Failed to assign/unassign ${label}`,
                { id: tId }
            );
        }
    }

    const handleChange = async (selectedOption: any) => {
        const selectedEmail = selectedOption?.value;

        if (selectedEmail === '__unassign__') {
            setSelected(null);
            setUnassign(false);
            // setData({ ...data, va: null });
            await assignVa(data?.id, null);
        } else {
            const va = vas.find((v: any) => v.email === selectedEmail);
            setUnassign(true);
            setSelected(va);
            // setData({ ...data, va: selectedEmail });
            await assignVa(data?.id, selectedEmail);
        }
    };

    const options = [
        ...(unassign ? [{ label: 'Unassign', value: '__unassign__' }] : []),
        ...vas.map((o: any) => ({
            label: `${o?.firstName ?? ''} ${o?.lastName ?? ''}`,
            value: o?.email,
        })),
    ];

    return (
        <SearchSelect
            name="VA"
            placeholder={`Assign a ${label}`}
            className="w-full"
            options={options}
            onChange={(e: SingleValue<OptionType>) => {
                if (e) {
                    handleChange(e);
                }
                return false;
            }}
            value={
                selected
                    ? {
                          label: `${selected.firstName} ${selected.lastName}`,
                          value: selected.email,
                      }
                    : null
            }
        />
    );
};
