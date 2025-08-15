import {  useState } from "react";
import api from "../src/utils/axios";
import { VerifyContext } from "./create_verify_context";



export const VerifyProvider = ({children}) => {
    const [isVerified, setIsVerified] = useState(false);
    const verifyUser = async () => {
        try {
            await api.get("/Verification/verify", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
            });
            setIsVerified(true);
            console.log("User verified");
        } catch (error) {
            console.error("Error verifying user:", error);
        }
    }
    return (
        <VerifyContext.Provider value={{isVerified, setIsVerified, verifyUser}}>
            {children}
        </VerifyContext.Provider>
    )
}
export default VerifyProvider;