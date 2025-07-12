import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GalleryPage from "./GalleryPage";
import SessionPage from "./SessionPage";
import ErrorBoundary from "./components/ErrorBoundary";

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary context="Application Root">
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary context="Gallery Page">
              <GalleryPage />
            </ErrorBoundary>
          } />
          <Route path="/gallery" element={
            <ErrorBoundary context="Gallery Page">
              <GalleryPage />
            </ErrorBoundary>
          } />
          <Route path="/session/:imageId/:sessionId" element={
            <ErrorBoundary context="Session Page">
              <SessionPage />
            </ErrorBoundary>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
