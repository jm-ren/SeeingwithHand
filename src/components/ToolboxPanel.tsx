import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { MousePointer2, PenLine, Square, Circle, Pencil } from "lucide-react";

type Tool = "point" | "line" | "frame" | "area" | "freehand";

interface ToolInfo {
  name: Tool;
  icon: React.ReactNode;
  shortcut: string;
}

interface ToolboxPanelProps {
  onToolSelect?: (tool: Tool) => void;
  selectedTool?: Tool;
}

const tools: ToolInfo[] = [
  { name: "point", icon: <MousePointer2 size={24} />, shortcut: "P" },
  { name: "line", icon: <PenLine size={24} />, shortcut: "L" },
  { name: "frame", icon: <Square size={24} />, shortcut: "F" },
  { name: "area", icon: <Circle size={24} />, shortcut: "A" },
  { name: "freehand", icon: <Pencil size={24} />, shortcut: "D" },
];

const ToolboxPanel = ({
  onToolSelect = () => {},
  selectedTool = "point",
}: ToolboxPanelProps) => {
  const [activeTool, setActiveTool] = useState<Tool>(selectedTool);

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    onToolSelect(tool);
  };

  return (
    <div className="h-full w-20 bg-background border-r border-border flex flex-col items-center py-4 gap-4">
      <TooltipProvider>
        {tools.map((tool) => (
          <Tooltip key={tool.name}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.name ? "secondary" : "ghost"}
                size="icon"
                className="w-12 h-12"
                onClick={() => handleToolClick(tool.name)}
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>
                {tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}
                <span className="ml-2 text-muted-foreground">
                  [{tool.shortcut}]
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

export default ToolboxPanel;
