import React from 'react';
import { Button } from '@mui/material';
import Header from '../Header/Header';
import { Link } from 'react-router-dom';

const HomeHeader = () => {
  return (
    <Header title="Google Docs Clone">
      <Link to="/editor">
      <Button color="inherit">Editor</Button>
      </Link>
    </Header>
  );
};

export default HomeHeader; 