'use client'

import { useMemo, useState } from 'react'
import { HardDrive, Server } from 'lucide-react'

import { cn } from '@/lib/utils'

type GalleryImage = {
  id: string
  url: string
  alt: string | null
}

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[]
  productName: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  const safeIndex = useMemo(() => {
    if (images.length === 0) return 0
    return Math.min(activeIndex, images.length - 1)
  }, [activeIndex, images.length])

  if (images.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex aspect-[4/3] items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <Server className="h-14 w-14" />
            <HardDrive className="h-8 w-8" />
            <p className="text-sm font-medium text-slate-500">Aucune image disponible</p>
          </div>
        </div>
      </div>
    )
  }

  const activeImage = images[safeIndex]

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="aspect-[4/3] bg-slate-50">
          <img
            src={activeImage.url}
            alt={activeImage.alt || productName}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'overflow-hidden rounded-lg border transition',
                index === safeIndex
                  ? 'border-sky-400 ring-2 ring-sky-100'
                  : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <div className="aspect-square bg-slate-50">
                <img
                  src={image.url}
                  alt={image.alt || `${productName} - vue ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
