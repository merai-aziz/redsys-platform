import Link from 'next/link'

interface FamilyLink {
  id: number
  name: string
}

interface BrandColumn {
  id: number
  name: string
  families: FamilyLink[]
}

interface TopNavigationProps {
  columns: BrandColumn[]
}

export function TopNavigation({ columns }: TopNavigationProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-4xl font-black tracking-tight text-white">Renewtech</p>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Parts Finder</p>
          </div>
          <div className="w-full max-w-xl rounded-full border border-slate-700 bg-slate-800 px-5 py-2 text-slate-400 sm:w-auto">
            Rechercher
          </div>
          <button className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950">
            Parts Finder
          </button>
        </div>
      </div>

      <div className="bg-slate-900/95">
        <div className="mx-auto grid max-w-[1400px] gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {columns.map((column) => (
            <div key={column.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <p className="mb-3 text-lg font-bold text-white">{column.name}</p>
              <div className="space-y-2 text-sm text-slate-300">
                {column.families.slice(0, 6).map((family) => (
                  <div key={family.id}>
                    <Link
                      href={`/catalog/${column.id}/${family.id}`}
                      className="transition hover:text-emerald-300"
                    >
                      {family.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
