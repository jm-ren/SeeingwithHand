import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GalleryPage from "./GalleryPage";
import SessionPage from "./SessionPage";
import SharedSessionPage from "./SharedSessionPage";
import AdminPage from "./AdminPage";
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
          <Route path="/view/:shareSlug" element={
            <ErrorBoundary context="Shared Session Page">
              <SharedSessionPage />
            </ErrorBoundary>
          } />
          <Route path="/admin" element={
            <ErrorBoundary context="Admin Page">
              <AdminPage />
            </ErrorBoundary>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
