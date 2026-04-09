"use client";

export function ViewUserAccess({ user, accessLevels, userAccessLevels }: { user: any; accessLevels: any[]; userAccessLevels: any[] }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-1">User Access</h2>
      <p className="text-sm text-gray-600 mb-4">
        {user?.lastName} {user?.firstName}
      </p>

      <div className="space-y-4">
        {accessLevels?.map((level, index) => {
          const hasAccess = !!userAccessLevels?.find((item) => item?._id === level?._id);
          return (
            <div key={level?._id || index} className="flex items-center justify-between bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-800 font-medium">{level?.name}</p>
              <span className={hasAccess ? "text-green-600 font-semibold" : "text-gray-400"}>{hasAccess ? "Granted" : "Not Granted"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
