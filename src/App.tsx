import React from 'react';
import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import { AnnotationProvider } from './context/AnnotationContext';
import { SessionProvider } from './context/SessionContext';

function App() {
  return (
    <SessionProvider>
      <AnnotationProvider>
        <Suspense fallback={<p>Loading...</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Suspense>
      </AnnotationProvider>
    </SessionProvider>
  );
}

export default App;
