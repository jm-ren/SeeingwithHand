import React from "react";
import AnnotationCanvas from "./AnnotationCanvas";
import ToolboxPanel from "./ToolboxPanel";
import SessionControls from "./SessionControls";
import Traceboard from "./Traceboard";

const Home = () => {
  const [selectedTool, setSelectedTool] = React.useState("point");
  const [isRecording, setIsRecording] = React.useState(false);

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
  };

  const handleSessionStart = () => {
    setIsRecording(true);
  };

  const handleSessionStop = () => {
    setIsRecording(false);
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* Toolbox Panel - Left */}
      <ToolboxPanel
        selectedTool={selectedTool as any}
        onToolSelect={handleToolSelect}
      />

      {/* Main Content Area - Center */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-hidden">
          <AnnotationCanvas />
        </div>
        <SessionControls
          isRecording={isRecording}
          onStart={handleSessionStart}
          onStop={handleSessionStop}
        />
      </div>

      {/* Traceboard - Right */}
      <Traceboard />
    </div>
  );
};

export default Home;
