import React, { useContext, useEffect } from 'react'

import { useNavigate } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { Post } from '../components/Post';

export const HomePage = () => {
    const {isVerified, verifyUser, loading, logout} = useContext(VerifyContext);
    const navigate = useNavigate();
    useEffect(() => {
        verifyUser();
    }, []);
    useEffect(() => {
        if(!isVerified && !loading ){
            navigate('/Login');
        }
      
    }, [isVerified, navigate, loading]);
    const handleLogout = () => {
        logout();
        navigate('/Login');
    }
  return (
    <div>
       
        <h1>HomePage</h1>
        <p>Is Verified: {isVerified.toString()}</p>
        <button onClick={handleLogout}>logout</button>
        <Post />
    </div>
  )
}
