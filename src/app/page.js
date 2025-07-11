import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function RootPage() {
  // Get cookies on server side
  const cookieStore = cookies()
  const token = cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value
  const userId = cookieStore.get('userId')?.value
  
  console.log('🏠 Root page check:', {
    hasToken: !!token,
    hasUserId: !!userId
  })
  
  //Check authentication and redirect accordingly
  if (token && userId) {
    // User is authenticated, redirect to index
    redirect('/home')
  } else {
    // User is not authenticated, redirect to register
    redirect('/register')
  }
}