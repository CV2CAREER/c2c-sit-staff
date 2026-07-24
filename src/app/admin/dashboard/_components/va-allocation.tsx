"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound } from "lucide-react";

interface VaAllocationItem {
  name: string;
  clients: string[];
  stats: {
    yearly: number;
    quarterly: number;
    monthly: number;
    weekly: number;
    daily: number;
  };
}

export default function VaAllocation() {
  const [allocations, setAllocations] = useState<VaAllocationItem[]>([]);
  const [unAllocatedClients, setUnAllocatedClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Use the HTTPS endpoint
        const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URI}/api/v1/admin/client-allocation`;
        // console.log("📡 Fetching from:", apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        // console.log("📡 Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        // console.log("API Response:", jsonData);
        
        // Set the data directly from the response
        if (jsonData?.data?.parsedData) {
          setAllocations(jsonData.data.parsedData.result || []);
          setUnAllocatedClients(jsonData.data.parsedData.unAllocatedClients || []);
          // console.log("✅ Set allocations:", jsonData.data.parsedData.result.length);
          // console.log("✅ Set unallocated:", jsonData.data.parsedData.unAllocatedClients.length);
        } else {
          // console.error("Unexpected data structure:", jsonData);
        }
      } catch (error) {
        // console.error("❌ Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UsersRound size={18} />
            </span>
            Placement Controllers Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-primary/15 p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UsersRound size={18} />
            </span>
            Placement Controllers Allocation
          </CardTitle>
          <span className="text-xs text-gray-500">
            {allocations.length} PCs &middot; {unAllocatedClients.length} unallocated
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocations.map((va, index) => (
          <div key={index} className="rounded-xl border border-primary/15 overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-primary/15">
              <h3 className="font-semibold text-lg">{va.name}</h3>
              <p className="text-sm text-gray-600">Assigned Clients:</p>
              <div className="mt-2">
                <ul className="space-y-1">
                  {va.clients?.length > 0 ? (
                    va.clients.map((client, clientIdx) => (
                      <li key={clientIdx} className="text-sm text-gray-700">
                        • {client}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No clients assigned</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="p-4 bg-white">
              <h4 className="font-semibold mb-2 text-sm">Application Stats:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Year:</span>
                  <span className="font-medium">{va.stats?.yearly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quarter:</span>
                  <span className="font-medium">{va.stats?.quarterly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Month:</span>
                  <span className="font-medium">{va.stats?.monthly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Week:</span>
                  <span className="font-medium">{va.stats?.weekly || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Today:</span>
                  <span className="font-medium">{va.stats?.daily || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Unallocated Clients Card */}
        <div className="rounded-xl border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 p-4 border-b border-orange-200">
            <h3 className="font-semibold text-lg text-orange-800">Unallocated</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-1">
              {unAllocatedClients.length > 0 ? (
                unAllocatedClients.map((client, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {client}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500 italic">No clients</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
