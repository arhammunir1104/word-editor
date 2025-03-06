import React from 'react';
import { CommentProvider } from '../../context/CommentContext';
import CommentSidebar from './CommentSidebar';

const CommentManager = ({ children }) => {
  return (
    <CommentProvider>
      {children}
      <CommentSidebar />
    </CommentProvider>
  );
};

export default CommentManager; 