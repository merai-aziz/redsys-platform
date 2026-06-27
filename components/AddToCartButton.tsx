'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface AddToCartButtonProps {
  model: {
    id: string
    name: string
    brandName: string
    reference: string
    basePrice: number
    image?: string
  }
  inStock: boolean
}

export function AddToCartButton({ model, inStock }: AddToCartButtonProps) {
  const { addItem } = useCart()

  function handleAdd() {
    if (!inStock) return
    addItem({
      type: 'standard',
      modelId: model.id,
      name: model.name,
      brandName: model.brandName,
      reference: model.reference,
      price: model.basePrice,
      quantity: 1,
      image: model.image,
    })
  }

  return (
    <button
      type="button"
      disabled={!inStock}
      onClick={handleAdd}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold text-white transition ${
        inStock
          ? 'bg-[#2ad1a4] hover:bg-[#20b890]'
          : 'cursor-not-allowed bg-slate-300 text-slate-500'
      }`}
      title={inStock ? 'Ajouter au panier' : 'Rupture de stock'}
    >
      <ShoppingCart className="h-5 w-5" />
      {inStock ? 'Ajouter au panier' : 'Indisponible'}
    </button>
  )
}