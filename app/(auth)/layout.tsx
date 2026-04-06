export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center">
      {children}
    </div>
  )
}