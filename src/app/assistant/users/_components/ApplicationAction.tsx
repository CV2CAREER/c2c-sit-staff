"use client"
import { useAdminMutations } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext"

const TriggerApplicationAction = () => {
  const { user } = useAdminUserDetailContext()

  const { applicationEmailMutation } = useAdminMutations();

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-4">Trigger Application Action</h2>
        <div className="flex items-center justify-between gap-4">
          <div className="space-x-4">
            <button
              onClick={() =>
                applicationEmailMutation.mutate({type:"ADMIN-APPLICATION-START",name:`${user?.firstName} ${user?.lastName}`,email:`${user?.email}`})
              }
              className="bg-career-blue-400 hover:bg-career-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Application Start
            </button>
            <button
              onClick={() =>
                applicationEmailMutation.mutate({
                  type:'ADMIN-APPLICATION-END',
                  email:user?.email as string,
                  name:`${user?.firstName} ${user?.lastName}`}
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Application End
            </button>
          </div>
          <div className="flex">
            {/*  */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TriggerApplicationAction