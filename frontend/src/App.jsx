import React from 'react';
import { BrowserRouter as Router,Route, Routes } from 'react-router-dom';
import { LoginPage } from './Pages/LoginPage';
import { RegisterPage } from './Pages/RegisterPage';
import { PostPage } from './Pages/PostPage';
function App(){
  return (
    <Router>
      <Routes>
        <Route path='/Login' element={<LoginPage />}></Route>
        <Route path='/Register' element={<RegisterPage />}></Route>
        <Route path='/Post' element={<PostPage />}></Route>
      </Routes>
    </Router>
  );
}
export default App;