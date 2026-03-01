"use client";

import { useState, useEffect } from "react";
import { Plus, ListTodo, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TaskList, Task } from "@/app/components/tasks/TaskList";
import { TaskDialog } from "@/app/components/tasks/TaskDialog";
import { CalendarEvent } from "@/app/types";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";

type FilterType = "all" | "pending" | "completed";
type PriorityFilterType = "all" | "high" | "medium" | "low";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilterType>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?limit=100");

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();

      // Filter only tasks
      const taskList = data.data.events
        .filter((event: CalendarEvent) => {
          return event.type === "task";
        })
        .map((event: CalendarEvent) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          deadline: event.deadline || event.startDate,
          completed: event.completed || false,
          color: event.color,
          location: event.location,
          category: event.category,
          priority: event.priority || "medium",
        }));

      setTasks(taskList);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
    );
  };

  const handleSuccess = () => {
    fetchTasks();
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  const filteredTasks = tasks.filter((task) => {
    // Filter by completion status
    if (filter === "pending" && task.completed) return false;
    if (filter === "completed" && !task.completed) return false;

    // Filter by priority
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;

    return true;
  });

  // Group tasks by category
  const tasksByCategory = filteredTasks.reduce(
    (acc, task) => {
      const category = task.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const categories = Object.keys(tasksByCategory).sort();

  const stats = {
    all: tasks.length,
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and deadlines
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
            filter === "all"
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo className="h-4 w-4" />
          All
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {stats.all}
          </span>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
            filter === "pending"
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Circle className="h-4 w-4" />
          Pending
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {stats.pending}
          </span>
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
            filter === "completed"
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle className="h-4 w-4" />
          Completed
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {stats.completed}
          </span>
        </button>
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          Priority:
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPriorityFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              priorityFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          <button
            onClick={() => setPriorityFilter("high")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              priorityFilter === "high"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-muted text-muted-foreground hover:bg-red-100/50 dark:hover:bg-red-900/20"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            High
          </button>
          <button
            onClick={() => setPriorityFilter("medium")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              priorityFilter === "medium"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-muted text-muted-foreground hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Medium
          </button>
          <button
            onClick={() => setPriorityFilter("low")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              priorityFilter === "low"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground hover:bg-green-100/50 dark:hover:bg-green-900/20"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Low
          </button>
        </div>
      </div>

      {/* Task List - Grouped by Category */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Circle className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No tasks yet</p>
          <p className="text-sm">Create your first task to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>{category}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({tasksByCategory[category].length})
                </span>
              </h3>
              <TaskList
                tasks={tasksByCategory[category]}
                onTaskClick={handleTaskClick}
                onTaskEdit={handleTaskEdit}
                onTaskDelete={handleTaskDelete}
                onTaskToggle={handleTaskToggle}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Task Dialog */}
      <TaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
