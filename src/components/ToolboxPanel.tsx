import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  MousePointer2,
  PenLine,
  Square,
  Pencil,
  DotSquare,
  Group,
} from "lucide-react";
import { Divider } from "./ui/divider";

type Tool =
  | "point"
  | "line"
  | "frame"
  | "area"
  | "freehand"
  | "select"
  | "group";

interface ToolInfo {
  name: Tool;
  icon: React.ReactNode;
  shortcut: string;
  section: "implicit" | "explicit" | "utility";
  description?: string;
}

interface ToolboxPanelProps {
  onToolSelect: (tool: Tool) => void;
  selectedTool: Tool;
  selectedCount: number;
}

const tools: ToolInfo[] = [
  {
    name: "freehand",
    icon: <Pencil size={17} />,
    shortcut: "F",
    section: "implicit",
    description: "Draw freehand strokes"
  },
  {
    name: "point",
    icon: <DotSquare size={17} />,
    shortcut: "1",
    section: "explicit",
    description: "Place single points"
  },
  {
    name: "line",
    icon: <PenLine size={17} />,
    shortcut: "2",
    section: "explicit",
    description: "Create straight lines"
  },
  {
    name: "frame",
    icon: <Square size={17} />,
    shortcut: "3",
    section: "explicit",
    description: "Create polygons with multiple points - click to add points, click first point to close"
  },
  {
    name: "area",
    icon: (
      <div className="relative">
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              rgba(0, 0, 0, 0.5),
              rgba(0, 0, 0, 0.5) 1px,
              transparent 1px,
              transparent 4px
            )`,
          }}
        />
        <Square size={17} className="text-black/50" />
      </div>
    ),
    shortcut: "4",
    section: "explicit",
    description: "Create filled polygons with multiple points - click to add points, click first point to close"
  },
  {
    name: "select",
    icon: <MousePointer2 size={17} />,
    shortcut: "S",
    section: "utility",
    description: "Select and move annotations"
  },
  {
    name: "group",
    icon: <Group size={17} />,
    shortcut: "G",
    section: "utility",
    description: "Group selected annotations (select 2+ items first)"
  },
];

const ToolboxPanel = ({
  onToolSelect,
  selectedTool,
  selectedCount,
}: ToolboxPanelProps) => {
  const [activeTool, setActiveTool] = useState<Tool>(selectedTool);

  // Group button enabled state
  const groupButtonEnabled = selectedCount >= 2;

  // Update active tool when selected tool changes from parent
  useEffect(() => {
    setActiveTool(selectedTool);
  }, [selectedTool]);

  const handleToolClick = (tool: Tool) => {
    if (tool === "group" && !groupButtonEnabled) {
      return; // Don't allow group selection if not enough items selected
    }
    setActiveTool(tool);
    onToolSelect(tool);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent triggering shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const tool = tools.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        handleToolClick(tool.name);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [groupButtonEnabled]);

  const renderToolSection = (section: "implicit" | "explicit" | "utility") => {
    const sectionTools = tools.filter((tool) => tool.section === section);
    return (
      <div className="flex flex-col items-center gap-[28px]">
        {sectionTools.map((tool) => (
          <Tooltip key={tool.name}>
            <TooltipTrigger asChild>
              <div className="relative w-[28px] h-[28px] flex items-center justify-center">
                <Button
                  variant={activeTool === tool.name ? "secondary" : "ghost"}
                  className="w-[28px] h-[28px] p-[4.4px]"
                  onClick={() => handleToolClick(tool.name)}
                  disabled={tool.name === "group" && !groupButtonEnabled}
                  style={{
                    opacity:
                      tool.name === "group" && !groupButtonEnabled ? 0.5 : 1,
                  }}
                >
                  {tool.icon}
                </Button>
                <span
                  className="absolute right-0 top-[20px] text-[10px] text-[#C0C0C0] font-normal select-none pointer-events-none"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {tool.shortcut}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              className="max-w-[250px] text-sm" 
              style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 300, letterSpacing: '-0.01em' }}
            >
              <div>
                <div className="font-medium mb-0.5">
                  {tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}
                  <span className="ml-2 text-muted-foreground font-light">
                    [{tool.shortcut}]
                  </span>
                </div>
                {tool.description && (
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  };

  return (
    <div className="w-[56px] bg-[#faf9f7] border border-[#b0b0b0] rounded-[12px] flex flex-col items-center py-[22px] px-[14px] gap-[20px]" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
      <TooltipProvider>
        {renderToolSection("implicit")}
        <Divider />
        {renderToolSection("explicit")}
        <Divider />
        {renderToolSection("utility")}
      </TooltipProvider>
    </div>
  );
};

export default ToolboxPanel;
