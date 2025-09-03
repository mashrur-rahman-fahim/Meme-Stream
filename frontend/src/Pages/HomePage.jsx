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
            navigate('/auth');
        }
    }, [isVerified, navigate, loading]);
    
    const handleLogout = () => {
        logout();
        navigate('/auth');
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="loading loading-spinner loading-lg text-green-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
            {/* Header */}
            <div className="navbar bg-slate-700/80 backdrop-blur-md border-b border-slate-600/50">
                <div className="navbar-start">
                    <h1 className="text-2xl font-bold text-green-400">MemeStream</h1>
                </div>
                <div className="navbar-end">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-300 text-sm">
                            Status: <span className="text-green-400">{isVerified.toString()}</span>
                        </span>
                        <button 
                            onClick={handleLogout}
                            className="btn bg-red-500 hover:bg-red-600 text-white border-none"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-slate-100 mb-2">HomePage</h1>
                        <p className="text-slate-300">Your Daily Dose of Memes</p>
                    </div>

                    {/* Posts Container */}
                    <div className="card bg-slate-700/60 backdrop-blur-md shadow-xl border border-slate-600/50">
                        <div className="card-body p-0">
                            <Post />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}