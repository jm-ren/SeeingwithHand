import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GalleryPage from "./GalleryPage";
import SessionPage from "./SessionPage";

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<SessionPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/session/:imageId/:sessionId" element={<SessionPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
