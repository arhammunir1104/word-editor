import React from 'react';
import { EditorProvider } from './EditorContext';
import { EditorHistoryProvider } from './EditorHistoryContext';

export const EditorProviders = ({ children }) => {
  return (
    <EditorProvider>
      <EditorHistoryProvider>
        {children}
      </EditorHistoryProvider>
    </EditorProvider>
  );
}; 