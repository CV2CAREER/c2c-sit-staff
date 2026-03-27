import { useAdminQueries, VaAllocationItem } from "@/hooks/api/admin.api";
import toast from "react-hot-toast";

export default function VaAllocation() {
  const { vaAllocationsDomain } = useAdminQueries({ fetchVaAllocations: true });
  const { data, isLoading, isError } = vaAllocationsDomain;

  const allocations = data?.parsedData?.result || [];
  const unAllocatedClients = data?.parsedData?.unAllocatedClients || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Placement Controllers Allocation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    toast.error("Could not load allocations");
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Placement Controllers Allocation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocations?.map((va: VaAllocationItem, index: number) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-blue-50 p-4 border-b">
              <h3 className="font-semibold text-lg">{va.name}</h3>
              <p className="text-sm text-gray-600">Assigned Clients:</p>

              <div className="mt-2">
                <ul className="space-y-1">
                  {va.clients?.length > 0 ? (
                    va.clients.map((client: string, clientIdx: number) => (
                      <li key={clientIdx} className="text-sm text-gray-700">
                        • {client}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">
                      No clients assigned
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white">
              <h4 className="font-semibold mb-2 text-sm">Application Stats:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Year:</span>
                  <span className="font-medium">{va?.stats?.yearly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quarter:</span>
                  <span className="font-medium">{va?.stats?.quarterly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Month:</span>
                  <span className="font-medium">{va?.stats?.monthly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Week:</span>
                  <span className="font-medium">{va?.stats?.weekly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Today:</span>
                  <span className="font-medium">{va?.stats?.daily || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Unallocated Clients Card */}
        <div className="border rounded-lg overflow-hidden shadow-sm border-orange-200">
          <div className="bg-orange-50 p-4 border-b border-orange-200">
            <h3 className="font-semibold text-lg text-orange-800">Unallocated</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-1">
              {unAllocatedClients?.length > 0 ? (
                unAllocatedClients?.map((client: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {client}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500 italic">
                  No clients
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


// for merging to go
