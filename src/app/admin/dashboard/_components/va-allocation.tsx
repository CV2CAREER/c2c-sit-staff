"use client";
import { useEffect, useState } from "react";

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
        const apiUrl = "https://rat.staff.cvtocareer.com/api/v1/admin/client-allocation";
        console.log("📡 Fetching from:", apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        console.log("📡 Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        console.log("API Response:", jsonData);
        
        // Set the data directly from the response
        if (jsonData?.data?.parsedData) {
          setAllocations(jsonData.data.parsedData.result || []);
          setUnAllocatedClients(jsonData.data.parsedData.unAllocatedClients || []);
          console.log("✅ Set allocations:", jsonData.data.parsedData.result.length);
          console.log("✅ Set unallocated:", jsonData.data.parsedData.unAllocatedClients.length);
        } else {
          console.error("Unexpected data structure:", jsonData);
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Placement Controllers Allocation</h2>
      
      {/* Show count for debugging */}
      <div className="mb-4 text-sm text-gray-500">
        Total VAs: {allocations.length} | Unallocated Clients: {unAllocatedClients.length}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocations.map((va, index) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-blue-50 p-4 border-b">
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
        <div className="border rounded-lg overflow-hidden shadow-sm border-orange-200">
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
    </div>
  );
}
