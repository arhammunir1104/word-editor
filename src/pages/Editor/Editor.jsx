import React from 'react';
import EditorHeader from '../../components/EditorHeader/EditorHeader';
import EditorToolbar from '../../components/EditorToolbar/EditorToolbar';
import EditorContent from '../../components/EditorContent/EditorContent';

const Editor = () => {
  return (
    <div>
      <EditorHeader />
      <EditorToolbar />
      <EditorContent />
    </div>
  );
};

export default Editor; 