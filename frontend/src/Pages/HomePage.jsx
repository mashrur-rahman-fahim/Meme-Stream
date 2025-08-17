import React, { useContext, useEffect } from 'react'

import { useNavigate } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { Post } from '../components/Post';

export const HomePage = () => {
    const {isVerified, verifyUser,loading} = useContext(VerifyContext);
    const navigate = useNavigate();
    useEffect(() => {
        verifyUser();
    }, [verifyUser]);
    useEffect(() => {
        if(!isVerified && !loading){
            navigate('/auth');
        }
        
    }, [isVerified, navigate, loading]);
  return (
    <div>
       
        <h1>HomePage</h1>
        <p>Is Verified: {isVerified.toString()}</p>
        <Post />
    </div>
  )
}
