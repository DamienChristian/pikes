"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import { toast } from "sonner";

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string | Date;
  completed: boolean;
  color?: string;
  location?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
}

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  loading?: boolean;
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTaskToggle,
  loading = false,
}: TaskListProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (task: Task) => {
    try {
      setTogglingId(task.id);

      const response = await fetch(`/api/events/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      onTaskToggle?.(task.id, !task.completed);
      toast.success(
        task.completed ? "Task marked as incomplete" : "Task completed!"
      );
    } catch {
      toast.error("Failed to update task");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/events/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      onTaskDelete?.(task.id);
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const isOverdue = (deadline: string | Date, completed: boolean) => {
    if (completed) return false;
    const deadlineDate =
      typeof deadline === "string" ? new Date(deadline) : deadline;
    return deadlineDate < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Circle className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No tasks yet</p>
        <p className="text-sm">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const deadlineDate =
          typeof task.deadline === "string"
            ? new Date(task.deadline)
            : task.deadline;
        const overdue = isOverdue(task.deadline, task.completed);

        return (
          <div
            key={task.id}
            className={cn(
              "group relative flex items-start gap-3 p-4 rounded-lg border transition-all",
              "hover:shadow-md hover:border-primary/50",
              task.completed && "opacity-60",
              overdue && "border-destructive/50 bg-destructive/5"
            )}
            style={{
              borderLeftWidth: "4px",
              borderLeftColor: task.color || "#10B981",
            }}
          >
            {/* Complete Toggle */}
            <button
              onClick={() => handleToggle(task)}
              disabled={togglingId === task.id}
              className="mt-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Task Content */}
            <button
              onClick={() => onTaskClick?.(task)}
              className="flex-1 text-left space-y-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "font-medium",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </div>
                {/* Priority Badge */}
                {task.priority && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      task.priority === "high" &&
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      task.priority === "medium" &&
                        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      task.priority === "low" &&
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.priority === "high" && "bg-red-500",
                        task.priority === "medium" && "bg-yellow-500",
                        task.priority === "low" && "bg-green-500"
                      )}
                    />
                    {task.priority === "high" && "High"}
                    {task.priority === "medium" && "Medium"}
                    {task.priority === "low" && "Low"}
                  </span>
                )}
              </div>
              {task.description && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {task.description}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className={cn(overdue && "text-destructive font-medium")}>
                  {format(deadlineDate, "MMM d, yyyy 'at' h:mm a")}
                  {overdue && " (Overdue)"}
                </span>
                {task.category && (
                  <>
                    <span>•</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {task.category}
                    </span>
                  </>
                )}
                {task.location && (
                  <>
                    <span>•</span>
                    <span>📍 {task.location}</span>
                  </>
                )}
              </div>
            </button>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTaskEdit?.(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(task)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
