"use client"
import {useEffect} from "react";
import {getAuthInfo} from "@/utils/axios";
import {useRouter} from "next/navigation";
export default function PostLayout({ children }) {
//     const router=useRouter();
//
//     useEffect(()=>{
//     const authInfo=getAuthInfo();
//     if(!authInfo){
//         router.push("/register")
//         return;
//     }
//     else{
//         router.push("/home")
//         return;
//     }
//     if(!authInfo.token || !authInfo.userId || !authInfo.userName)
//         router.push("/register")
// },[router])

    return children;
}