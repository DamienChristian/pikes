"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import { toast } from "sonner";
import { useAppSelector } from "@/app/lib/store/hooks";

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function ImportExportDialog({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportExportDialogProps) {
  const calendars = useAppSelector((state) => state.calendars.items);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set()
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Initialise selection to all calendars when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCalendarIds(new Set(calendars.map((c) => c.id)));
    }
  }, [isOpen, calendars]);

  const allSelected =
    calendars.length > 0 && selectedCalendarIds.size === calendars.length;
  const noneSelected = selectedCalendarIds.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCalendarIds(new Set());
    } else {
      setSelectedCalendarIds(new Set(calendars.map((c) => c.id)));
    }
  };

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (noneSelected) {
      toast.error("Select at least one calendar to export");
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("calendarIds", Array.from(selectedCalendarIds).join(","));

      const response = await fetch(`/api/calendar/export?${params}`);

      if (!response.ok) {
        throw new Error("Failed to export calendar");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `calendar-export-${new Date().toISOString().split("T")[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Calendar exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export calendar");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".ics") && !file.name.endsWith(".ical")) {
      setImportStatus({
        type: "error",
        message: "Please select a valid ICS or iCal file",
      });
      return;
    }

    setIsImporting(true);
    setImportStatus({ type: null, message: "" });

    try {
      // Read file content
      const content = await file.text();

      // Send to import API
      const response = await fetch("/api/calendar/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ icsContent: content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import calendar");
      }

      setImportStatus({
        type: "success",
        message: data.message || `Successfully imported ${data.count} events`,
      });

      toast.success(data.message || "Calendar imported successfully");

      // Call success callback to refresh events
      if (onImportSuccess) {
        setTimeout(() => {
          onImportSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import calendar";
      setImportStatus({
        type: "error",
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleClose = () => {
    setImportStatus({ type: null, message: "" });
    setIcsUrl("");
    setSelectedCalendarIds(new Set(calendars.map((c) => c.id)));
    onClose();
  };

  const handleUrlImport = async () => {
    if (!icsUrl.trim()) {
      setImportStatus({
        type: "error",
        message: "Please enter a calendar URL",
      });
      return;
    }

    setIsImporting(true);
    setImportStatus({ type: null, message: "" });

    try {
      // Send to import API
      const response = await fetch("/api/calendar/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ icsUrl: icsUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import calendar");
      }

      setImportStatus({
        type: "success",
        message: data.message || `Successfully imported ${data.count} events`,
      });

      toast.success(data.message || "Calendar imported successfully");

      // Call success callback to refresh events
      if (onImportSuccess) {
        setTimeout(() => {
          onImportSuccess();
        }, 1500);
      }

      // Clear URL input on success
      setIcsUrl("");
    } catch (error) {
      console.error("URL import error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to import calendar from URL";
      setImportStatus({
        type: "error",
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export Calendar</DialogTitle>
          <DialogDescription>
            Export your calendar to iCal format or import events from other
            calendar applications (Google Calendar, Outlook, Apple Calendar,
            etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Export Calendar</h4>
            <p className="text-sm text-muted-foreground">
              Download your events as an ICS file that can be imported into
              other calendar applications.
            </p>

            {/* Calendar selection */}
            {calendars.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                {/* Select / Deselect all */}
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 border-b">
                  <Checkbox
                    id="export-select-all"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                  <label
                    htmlFor="export-select-all"
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </label>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedCalendarIds.size} / {calendars.length} selected
                  </span>
                </div>

                {/* Calendar rows */}
                <div className="divide-y max-h-40 overflow-y-auto">
                  {calendars.map((cal) => (
                    <div
                      key={cal.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        id={`export-cal-${cal.id}`}
                        checked={selectedCalendarIds.has(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                      />
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: cal.color }}
                      />
                      <label
                        htmlFor={`export-cal-${cal.id}`}
                        className="text-sm cursor-pointer select-none flex-1 truncate"
                      >
                        {cal.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting || noneSelected}
              className="w-full"
              variant="outline"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export to ICS
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Import Calendar</h4>
            <p className="text-sm text-muted-foreground">
              Upload an ICS file or import from a URL (webcal://, https://).
            </p>

            {/* URL Import */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="webcal://example.com/calendar.ics or https://..."
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                  disabled={isImporting}
                  className="flex-1"
                />
                <Button
                  onClick={handleUrlImport}
                  disabled={isImporting || !icsUrl.trim()}
                  variant="secondary"
                  size="icon"
                  className="flex-shrink-0"
                >
                  {isImporting ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a webcal:// or https:// calendar link
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or upload a file
                </span>
              </div>
            </div>

            {/* File Upload */}
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="ics-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isImporting ? (
                    <>
                      <LoadingSpinner className="mb-3 h-8 w-8" />
                      <p className="text-sm text-muted-foreground">
                        Importing events...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ICS or iCal files
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="ics-upload"
                  type="file"
                  className="hidden"
                  accept=".ics,.ical"
                  onChange={handleImport}
                  disabled={isImporting}
                />
              </label>
            </div>

            {/* Import Status Message */}
            {importStatus.type && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  importStatus.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                }`}
              >
                {importStatus.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <p>{importStatus.message}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
