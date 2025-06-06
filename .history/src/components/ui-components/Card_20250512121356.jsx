// Card.jsx
export default function Card({ children, className }) {
    return (
      <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
        {children}
      </div>
    )
  }
  