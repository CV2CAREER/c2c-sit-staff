import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { LucideIcon, MoreHorizontal } from "lucide-react";

export type DefaultActions = "edit" | "soft-delete" | "restore" | "delete"

type Action = {
  label: string;
  icon?: LucideIcon;
  action: DefaultActions;
}

interface ActionsMenuProps {
  actions: Action[];
  triggerActionDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  triggerEditAction?: any;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({actions, triggerActionDialog, triggerEditAction}) => {
  const handleActionTrigger = (action: Action) => {
    if (action.action == "edit") triggerEditAction()
    else triggerActionDialog(action.action)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => {
          const ActionIcon = action.icon
            return (
              <DropdownMenuItem
                className={action.action === "delete" ?"text-red-600 hover:bg-red-50 hover:text-red-600": "text-black"}
                onClick={() => handleActionTrigger(action)}
                key={action.action}
              >
                {ActionIcon ? <ActionIcon /> : null}
                <span>{action.label}</span>
              </DropdownMenuItem>
            );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ActionsMenu;