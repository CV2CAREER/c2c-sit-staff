"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Referral = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  status?: string;
  createdAt?: string;
};

function formatStatus(status?: string) {
  if (!status) return "Unknown";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function ReferralTable({ referrals }: { referrals: Referral[] }) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return referrals.filter((referral) => {
      const haystack = [
        referral.user?.firstName,
        referral.user?.lastName,
        referral.user?.email,
        referral.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.toLowerCase());
    });
  }, [referrals, search]);

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search referrals"
          className="max-w-md"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-[#80D7FF] text-left text-gray-900">
              <th className="px-4 py-3 font-semibold">First Name</th>
              <th className="px-4 py-3 font-semibold">Last Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Referral Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((referral, index) => (
              <tr
                key={referral.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border-b px-4 py-3">{referral.user?.firstName ?? "-"}</td>
                <td className="border-b px-4 py-3">{referral.user?.lastName ?? "-"}</td>
                <td className="border-b px-4 py-3">{referral.user?.email ?? "-"}</td>
                <td className="border-b px-4 py-3 capitalize">{referral.user?.role ?? "-"}</td>
                <td className="border-b px-4 py-3">{formatStatus(referral.status)}</td>
                <td className="border-b px-4 py-3">
                  {referral.createdAt
                    ? new Date(referral.createdAt).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No referrals found.
          </div>
        ) : null}
      </div>
    </section>
  );
}
