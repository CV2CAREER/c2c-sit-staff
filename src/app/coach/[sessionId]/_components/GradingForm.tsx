"use client";

import React, { useState } from "react";
import { useCoachMutations } from "@/hooks/api/coach";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Loader2, Save, Star } from "lucide-react";

interface GradingFormProps {
  sessionId: string;
  initialGrading?: any;
  onSuccess?: () => void;
}

export default function GradingForm({ sessionId, initialGrading, onSuccess }: GradingFormProps) {
  const { gradeSession } = useCoachMutations();
  const [formData, setFormData] = useState({
    score: initialGrading?.score || 0,
    feedback: initialGrading?.feedback || "",
    criteria: initialGrading?.criteria || [
      { name: "Communication Skills", score: 0, maxScore: 25 },
      { name: "Technical Proficiency", score: 0, maxScore: 25 },
      { name: "Professionalism", score: 0, maxScore: 25 },
      { name: "Preparedness", score: 0, maxScore: 25 },
    ],
  });

  const handleCriteriaChange = (index: number, score: number) => {
    const newCriteria = [...formData.criteria];
    newCriteria[index].score = score;
    
    // Update total score
    const totalScore = newCriteria.reduce((sum: number, c: any) => sum + (c.score || 0), 0);
    
    setFormData({ 
      ...formData, 
      criteria: newCriteria,
      score: totalScore
    });
  };

  const handleSubmit = () => {
    gradeSession.mutate(
      { 
        sessionId, 
        score: formData.score,
        maxScore: 100,
        feedback: formData.feedback,
        criteria: formData.criteria
      },
      {
        onSuccess: () => {
          toast.success("Grading submitted successfully");
          if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || "Failed to submit grading");
        },
      }
    );
  };

  return (
    <Card className="rounded-2xl border-none shadow-sm mt-6 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Star className="text-yellow-300 fill-yellow-300" size={24} />
          Grading & Feedback
        </CardTitle>
        <p className="text-blue-100 text-sm mt-1">Evaluate the student's performance across key metrics.</p>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-widest border-b pb-2">Performance Criteria</h3>
            <div className="space-y-6">
              {formData.criteria.map((criterion: any, index: number) => (
                <div key={criterion.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">{criterion.name}</label>
                    <span className="text-sm font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {criterion.score} / {criterion.maxScore}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={criterion.maxScore}
                    value={criterion.score}
                    onChange={(e) => handleCriteriaChange(index, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-widest border-b pb-2">Summary</h3>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Overall Score</label>
               <div className="text-6xl font-black text-blue-600">
                 {formData.score} <span className="text-2xl text-gray-400 font-light">/ 100</span>
               </div>
               <div className="mt-2 text-sm text-gray-500">
                 {formData.score >= 80 ? "Excellent Performance" : formData.score >= 60 ? "Good Progress" : "Needs Improvement"}
               </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Detailed Feedback</label>
              <Textarea
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Provide detailed observations and suggestions for improvement..."
                className="min-h-[180px] bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100">
          <Button 
            onClick={handleSubmit} 
            disabled={gradeSession.isPending} 
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-10 h-14 font-bold text-lg gap-2 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {gradeSession.isPending ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            Submit Session Grade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
