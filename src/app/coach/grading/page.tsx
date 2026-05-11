"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ClipboardList, List } from "lucide-react";
import GradingDataTable from "./_components/GradingDataTable";

const GradingPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Grading & Feedback</h2>
        <p className="text-gray-500 mt-1">Review completed sessions and provide feedback to clients.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-white border border-gray-100 p-1 mb-6 inline-flex rounded-xl shadow-sm">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-lg py-2.5 px-6 flex items-center gap-2 transition-all">
            <List size={16} />
            All Sessions
          </TabsTrigger>
          <TabsTrigger value="ungraded" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-lg py-2.5 px-6 flex items-center gap-2 transition-all">
            <ClipboardList size={16} />
            Ungraded
          </TabsTrigger>
          <TabsTrigger value="graded" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-lg py-2.5 px-6 flex items-center gap-2 transition-all">
            <CheckCircle size={16} />
            Graded
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <GradingDataTable gradingState="All" />
        </TabsContent>
        <TabsContent value="ungraded">
          <GradingDataTable gradingState="Ungraded" />
        </TabsContent>
        <TabsContent value="graded">
          <GradingDataTable gradingState="Graded" />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default GradingPage;
