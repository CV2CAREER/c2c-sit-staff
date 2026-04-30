"use client";

import React, { useState } from "react";
import AvailableHours from "./_components/AvailableHours";
import ScheduledEvents from "./_components/ScheduledEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock } from "lucide-react";

const SchedulingPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Scheduling</h2>
        <p className="text-gray-500 mt-1">Manage your availability and view upcoming booked sessions.</p>
      </div>

      <Tabs defaultValue="availability" className="w-full">
        <TabsList className="bg-white border border-gray-100 p-1 mb-6 inline-flex rounded-xl shadow-sm">
          <TabsTrigger value="availability" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-lg py-2.5 px-6 flex items-center gap-2 transition-all">
            <Clock size={16} />
            Available Hours
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-lg py-2.5 px-6 flex items-center gap-2 transition-all">
            <Calendar size={16} />
            Scheduled Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability">
          <AvailableHours />
        </TabsContent>
        <TabsContent value="sessions">
          <ScheduledEvents />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default SchedulingPage;
