import Link from 'next/link'

const SECTION_LINKS = [
  { href: '/?section=products#products', label: 'Produits' },
  { href: '/?section=server#products', label: 'Serveur-configurateur' },
  { href: '/?section=storage#products', label: 'Storage-configurateur' },
  { href: '/?section=network#products', label: 'Reseau-configurateur' },
]

interface SectionsMenuLinksProps {
  className?: string
}

export function SectionsMenuLinks({ className = '' }: SectionsMenuLinksProps) {
  return (
    <nav className={className}>
      {SECTION_LINKS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
