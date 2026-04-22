export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0B0E]">
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}