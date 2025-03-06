import React from 'react';
import { Route, Routes } from "react-router-dom"
import Home from './pages/Home/Home';
import Editor from './pages/Editor/Editor';
import { EditorProvider } from './context/EditorContext';
import { EditorHistoryProvider } from './context/EditorHistoryContext';
import CommentManager from './components/Comments/CommentManager';
import './styles/commentStyles.css';
import EditorHeader from './components/EditorHeader/EditorHeader';
import EditorToolbar from './components/EditorToolbar/EditorToolbar';
import EditorContent from './components/EditorContent/EditorContent';
import { CommentProvider } from './context/CommentContext';
import CommentSidebar from './components/Comments/CommentSidebar';
import FloatingCommentButton from './components/Comments/FloatingCommentButton';
import './styles/tableStyles.css';

const App = () => {
  return (
    <EditorHistoryProvider>
      <EditorProvider>
        <CommentManager>
          <CommentProvider>
            <EditorHeader />
            <EditorToolbar />
            <EditorContent />
            <CommentSidebar />
            <FloatingCommentButton />
          </CommentProvider>
        </CommentManager>
      </EditorProvider>
    </EditorHistoryProvider>
  );
};

export default App;
