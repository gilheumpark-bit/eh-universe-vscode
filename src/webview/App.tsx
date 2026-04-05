import * as React from 'react';
import CodeStudioShell from './components/code-studio/CodeStudioShell';

// Declare standard VS Code API for TS
declare const tsvscode: {
  postMessage: (message: any) => void;
};

export function App() {
  return (
    <div className="w-full h-full">
      <CodeStudioShell />
    </div>
  );
}
