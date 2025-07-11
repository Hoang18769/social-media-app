"use client"

import { Children, cloneElement } from "react"

export function Tabs({ value, onValueChange, children, className = "" }) {
  return (
    <div className={className}>
      {Children.map(children, (child) =>
        cloneElement(child, { value, onValueChange })
      )}
    </div>
  )
}

export function TabsList({ children, className = "" }) {
  return <div className={`flex gap-2 border-b pb-1 ${className}`}>{children}</div>
}

export function TabsTrigger({ value: tabValue, onValueChange, value, children }) {
  const isActive = value === tabValue
  return (
    <button
      onClick={() => onValueChange(value)}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        isActive
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = "" }) {
  return <div className={className}>{children}</div>
}
