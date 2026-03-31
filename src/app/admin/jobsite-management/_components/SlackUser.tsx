"use client"
import { MouseEventHandler, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { ImSpinner2 } from "react-icons/im";

export default function SlackIdManager({ queue, title }: { loading?: boolean, queue: string, title: string }) {
  const [emailInput, setEmailInput] = useState('');
  
  const { slackQueueDomain } = useAdminQueries({
    fetchSlackQueue: true,
    resourceType: queue
  });

  const { slackQueueMutation } = useAdminMutations();

  const emailQueue = slackQueueDomain.data?.data?.result || [];

  const addToQueue: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      const response = await slackQueueMutation.mutateAsync({
        email: emailInput.trim(),
        queue: queue,
        action: 'POST'
      });

      if (response.saved) {
        toast.success(`${response.queue} is added to the queue`);
        setEmailInput('');
      } else {
        toast.error(response.message || "Failed to add email");
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error adding email to queue');
    }
  };

  const removeFromQueue = async (email: string) => {
    try {
      const result = await slackQueueMutation.mutateAsync({
        email,
        queue: queue,
        action: 'DELETE'
      });

      if (result.deleted) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Failed to remove email");
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error removing email from queue');
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-24 font-medium text-career-black-200">
          {title} Notification Management
        </h3>
      </div>

      <div>
        <form>
          <label className="mt-6 block text-gray-700 text-sm font-bold">
            Insert Email
          </label>
          <div className="flex items-center">
            <input
              type="text"
              spellCheck={true}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="mt-1 w-64 h-10 px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500"
              placeholder="Enter the email..."
            />
            <button
              className="ml-1 bg-green-500 hover:bg-green-600 text-white font-semibold h-10 py-2 px-4 rounded-md text-md flex items-center gap-2"
              onClick={addToQueue}
              disabled={slackQueueMutation.isPending || slackQueueDomain.isLoading}
            >
              {slackQueueMutation.isPending ? <ImSpinner2 className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4">
        <label className="block text-gray-700 text-sm font-bold">
          {title} Email
        </label>

        <div className="w-full max-w-md">
          {slackQueueDomain.isLoading ? (
            <div className="mt-2 bg-gray-100 rounded-md p-4 flex justify-center">
              <ImSpinner2 className="animate-spin text-career-gray-200" />
            </div>
          ) : (
            <ul className="mt-2 bg-gray-100 rounded-md p-4 space-y-2 ">
              {emailQueue.length > 0 ? (
                emailQueue.map((email: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                  >
                    <span className="text-sm truncate">{email}</span>
                    <button
                      onClick={() => removeFromQueue(email)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium p-3 flex items-center justify-center"
                      disabled={slackQueueMutation.isPending}
                    >
                      {slackQueueMutation.isPending ? <ImSpinner2 className="animate-spin" /> : <FaTrashAlt />}
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Queue is empty.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
