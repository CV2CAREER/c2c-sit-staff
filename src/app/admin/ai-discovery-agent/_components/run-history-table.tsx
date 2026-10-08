//~ "use client";

//~ import React from "react";
//~ import type { DiscoveryRun } from "@/types/discovery-agent.types";

//~ function Pill({ children, variant }: { children: React.ReactNode; variant: string }) {
//~   const colors: Record<string, string> = {
//~     success: "bg-green-50 text-green-600 border border-green-200",
//~     running: "bg-amber-50 text-amber-600 border border-amber-200",
//~     failed: "bg-red-50 text-red-600 border border-red-200",
//~     killed: "bg-gray-100 text-gray-500 border border-gray-200",
//~     hqa: "bg-green-50 text-green-600 border border-green-200",
//~     mqa: "bg-amber-50 text-amber-600 border border-amber-200",
//~     lqa: "bg-red-50 text-red-600 border border-red-200",
//~     scheduled: "text-gray-500",
//~     manual: "text-cyan-600 font-medium",
//~   };
//~   return (
//~     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap ${colors[variant] || "bg-gray-100 text-gray-500"}`}>
//~       {children}
//~     </span>
//~   );
//~ }

//~ function formatDuration(ms: number | null): string {
//~   if (!ms) return "—";
//~   const seconds = Math.floor(ms / 1000);
//~   const minutes = Math.floor(seconds / 60);
//~   const secs = seconds % 60;
//~   return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
//~ }

//~ function formatTime(dateStr: string): string {
//~   const d = new Date(dateStr);
//~   return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
//~ }

//~ interface Props {
//~   runs: DiscoveryRun[];
//~   isLoading: boolean;
//~ }

//~ export default function RunHistoryTable({ runs, isLoading }: Props) {
//~   if (isLoading) {
//~     return (
//~       <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm mb-3.5">
//~         <div className="px-4 py-3 border-b border-gray-100">
//~           <span className="text-[13px] font-bold">Run History</span>
//~         </div>
//~         <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
//~       </div>
//~     );
//~   }

//~   return (
//~     <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm mb-3.5">
//~       <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//~         <span className="text-[13px] font-bold">Run History</span>
//~         <div className="flex gap-1">
//~           <button className="px-2.5 py-1 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-600 border border-cyan-200/50">Today</button>
//~           <button className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-500 hover:bg-gray-50">This week</button>
//~           <button className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-500 hover:bg-gray-50">All</button>
//~         </div>
//~       </div>
//~       <div className="overflow-x-auto">
//~         <table className="w-full text-xs border-collapse">
//~           <thead>
//~             <tr>
//~               {["Run ID", "Trigger", "Started", "Duration", "Status", "Fetched", "Dedup", "HQA", "MQA", "LQA"].map((h) => (
//~                 <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 text-[10.5px] uppercase tracking-wide border-b-2 border-gray-200 bg-gray-50">{h}</th>
//~               ))}
//~             </tr>
//~           </thead>
//~           <tbody>
//~             {runs.map((run) => (
//~               <tr key={run.id} className="hover:bg-gray-50">
//~                 <td className="px-3 py-2 font-mono text-[10.5px] text-gray-400">{run.run_id}</td>
//~                 <td className="px-3 py-2">
//~                   <Pill variant={run.trigger}>{run.trigger === "manual" ? "Manual" : "Scheduled"}</Pill>
//~                 </td>
//~                 <td className="px-3 py-2 text-gray-600">{formatTime(run.started_at)}</td>
//~                 <td className="px-3 py-2 text-gray-600">{formatDuration(run.duration_ms)}</td>
//~                 <td className="px-3 py-2">
//~                   <Pill variant={run.status}>
//~                     {run.status === "success" ? "✓ Success" : run.status === "running" ? "● Running" : run.status === "failed" ? "✗ Failed" : "Killed"}
//~                   </Pill>
//~                 </td>
//~                 <td className="px-3 py-2 text-gray-600">{run.fetched_count ?? "—"}</td>
//~                 <td className="px-3 py-2 text-gray-600">{run.dedup_count ?? "—"}</td>
//~                 <td className="px-3 py-2">{run.hqa_count != null ? <Pill variant="hqa">{run.hqa_count}</Pill> : "—"}</td>
//~                 <td className="px-3 py-2">{run.mqa_count != null ? <Pill variant="mqa">{run.mqa_count}</Pill> : "—"}</td>
//~                 <td className="px-3 py-2">{run.lqa_count != null ? <Pill variant="lqa">{run.lqa_count}</Pill> : "—"}</td>
//~               </tr>
//~             ))}
//~             {runs.length === 0 && (
//~               <tr>
//~                 <td colSpan={10} className="px-3 py-8 text-center text-gray-400">No runs yet</td>
//~               </tr>
//~             )}
//~           </tbody>
//~         </table>
//~       </div>
//~     </div>
//~   );
//~ }
