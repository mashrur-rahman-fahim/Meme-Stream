import {  useState } from "react";
import api from "../src/utils/axios";
import { VerifyContext } from "./create_verify_context";



export const VerifyProvider = ({children}) => {
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(true);
    const verifyUser = async () => {
        try {
            setLoading(true);
            await api.get("/Verification/verify", {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            setIsVerified(true);
            console.log("User verified");
        } catch (error) {
            console.error("Error verifying user:", error);
        }
        finally{
            setLoading(false);
        }
    }
    return (
        <VerifyContext.Provider value={{isVerified, verifyUser, loading}}>
            {children}
        </VerifyContext.Provider>
    )
}
export default VerifyProvider;