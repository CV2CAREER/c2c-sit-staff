import React from 'react';

interface PlanTransaction {
  plans : any[]
}

const PlanTransition = ({ plans }: PlanTransaction) => {
  if (!plans || plans.length === 0) return null; // or show a message like "No plan history available"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-8 text-center">Plan Transition History</h2>
      <div className="flex items-center justify-between relative">
        {plans.map((plan, index) => (
          <div key={index} className="flex flex-col items-center text-center w-1/3 relative">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center z-10">
              {index + 1}
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">
              {plan?.from} → <span className="text-blue-600">{plan?.to}</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(plan?.date).toDateString()}
            </div>

            {index < plans.length - 1 && (
              <div className="absolute top-4 right-[-50%] w-full border-t-2 border-blue-300 z-0"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanTransition;
