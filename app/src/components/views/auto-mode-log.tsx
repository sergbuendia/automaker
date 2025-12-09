"use client";

import { useAppStore, AutoModeActivity } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wrench,
  Play,
  X,
  ClipboardList,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoModeLogProps {
  onClose?: () => void;
}

export function AutoModeLog({ onClose }: AutoModeLogProps) {
  const { autoModeActivityLog, features, clearAutoModeActivity } =
    useAppStore();

  const getActivityIcon = (type: AutoModeActivity["type"]) => {
    switch (type) {
      case "start":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "progress":
        return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />;
      case "tool":
        return <Wrench className="w-4 h-4 text-yellow-500" />;
      case "complete":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "planning":
        return <ClipboardList className="w-4 h-4 text-cyan-500" data-testid="planning-phase-icon" />;
      case "action":
        return <Zap className="w-4 h-4 text-orange-500" data-testid="action-phase-icon" />;
      case "verification":
        return <ShieldCheck className="w-4 h-4 text-emerald-500" data-testid="verification-phase-icon" />;
    }
  };

  const getActivityColor = (type: AutoModeActivity["type"]) => {
    switch (type) {
      case "start":
        return "border-l-blue-500";
      case "progress":
        return "border-l-purple-500";
      case "tool":
        return "border-l-yellow-500";
      case "complete":
        return "border-l-green-500";
      case "error":
        return "border-l-red-500";
      case "planning":
        return "border-l-cyan-500";
      case "action":
        return "border-l-orange-500";
      case "verification":
        return "border-l-emerald-500";
    }
  };

  const getFeatureDescription = (featureId: string) => {
    const feature = features.find((f) => f.id === featureId);
    return feature?.description || "Unknown feature";
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col border-white/10 bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            <CardTitle className="text-lg">Auto Mode Activity</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAutoModeActivity}
              className="h-8"
            >
              Clear
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-4 space-y-2">
            {autoModeActivityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-1">
                  Start auto mode to see activity here
                </p>
              </div>
            ) : (
              autoModeActivityLog
                .slice()
                .reverse()
                .map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "p-3 rounded-lg bg-zinc-900/50 border-l-4 hover:bg-zinc-900/70 transition-colors",
                      getActivityColor(activity.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </span>
                          <span className="text-xs font-medium text-blue-400 truncate">
                            {getFeatureDescription(activity.featureId)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {activity.message}
                        </p>
                        {activity.tool && (
                          <div className="mt-1 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {activity.tool}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
