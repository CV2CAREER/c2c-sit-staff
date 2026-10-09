import SearchSelect from '@/components/ui/react-select';
import { OptionType } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SingleValue } from 'react-select';
import { useAdminQueries } from '@/hooks/api/admin.api';

interface VACellProps {
    data: null | any;
    variant?: 'DPC' | 'VPC' | 'SPC' | 'InterimDPC' | 'InterimSPC';
    // Called with the newly selected email (or null for unassign) whenever the
    // dropdown selection changes. The parent (EditModal) owns when this is
    // actually persisted — only on clicking "Update" — so this cell no longer
    // calls the assignment API itself.
    onSelectionChange?: (email: string | null) => void;
    // SPR-21-41-015: marker naming the campaign grid column this cell edits
    // (VaName, VetName, CompletedName, InterimDPCName, InterimSPCName). It is
    // read by scripts/check-campaign-modal-bindings.mjs to prove each retained
    // column is represented, and is deliberately not used for rendering. PC
    // assignments are staged and saved via savePcChanges, never as part of the
    // react-hook-form payload.
    field?: string;
}

export const VACell = ({ data = null, variant = 'DPC', onSelectionChange }: VACellProps) => {
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

    const {
        pcsDomain: { data: vaData, isError },
    } = useAdminQueries({ fetchPCs: true });
    const vas = Array.isArray(vaData) ? vaData : ((vaData as any)?.items ?? []);

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

    const handleChange = (selectedOption: any) => {
        const selectedEmail = selectedOption?.value;

        if (selectedEmail === '__unassign__') {
            setSelected(null);
            setUnassign(false);
            onSelectionChange?.(null);
        } else {
            const va = vas.find((v: any) => v.email === selectedEmail);
            setUnassign(true);
            setSelected(va);
            onSelectionChange?.(selectedEmail);
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
