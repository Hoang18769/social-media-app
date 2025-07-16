export function isAdmin () {
    try {
        const userRole = localStorage.getItem('role')
        return userRole === 'ADMIN'
    } catch (error) {
        console.error('Error checking admin role:', error)
        return false
    }
}