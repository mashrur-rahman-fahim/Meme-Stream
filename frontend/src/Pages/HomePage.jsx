import React, { useContext, useEffect } from 'react'

import { useNavigate } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';

export const HomePage = () => {
    const {isVerified, verifyUser} = useContext(VerifyContext);
    const navigate = useNavigate();
    useEffect(() => {
        verifyUser();
    }, [verifyUser]);
    useEffect(() => {
        if(!isVerified){
            navigate('/Login');
        }
        
    }, [isVerified, navigate]);
  return (
    <div>
        <h1>HomePage</h1>
        <p>Is Verified: {isVerified.toString()}</p>
    </div>
  )
}
