export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-6 sm:px-10 ${className}`}>
      {children}
    </div>
  )
}
