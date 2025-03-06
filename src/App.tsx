import React from 'react';
import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import { AnnotationProvider } from './context/AnnotationContext';

function App() {
  return (
    <AnnotationProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Suspense>
    </AnnotationProvider>
  );
}

export default App;
