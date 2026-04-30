"use client"

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'

import { useAuth } from '@/context/AuthContext'

export type StandardCartItem = {
  type: 'standard'
  modelId: string
  name: string
  brandName: string
  reference: string
  price: number
  quantity: number
  image?: string
}

export type ConfigurableCartItem = {
  type: 'configurable'
  modelId: string
  name: string
  brandName: string
  basePrice: number
  options: Array<{ label: string; price: number }>
  quantity: number
  image?: string
}

export type SpareCartItem = {
  type: 'spare'
  modelId: string
  name: string
  brandName: string
  reference: string
  price: number
  quantity: number
  compatibleModelName?: string
  image?: string
}

export type CartItem = StandardCartItem | ConfigurableCartItem | SpareCartItem

type CartState = {
  items: CartItem[]
}

type CartAction =
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { modelId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { modelId: string; qty: number } }
  | { type: 'CLEAR_CART' }

const CART_STORAGE_KEY = 'redsys-cart'

const initialState: CartState = { items: [] }

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<CartItem>
  if (typeof item.type !== 'string' || typeof item.modelId !== 'string' || typeof item.name !== 'string') return false
  if (typeof item.brandName !== 'string' || typeof item.quantity !== 'number') return false

  if (item.type === 'configurable') {
    return typeof item.basePrice === 'number' && Array.isArray(item.options)
  }

  return typeof item.reference === 'string' && typeof item.price === 'number'
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOAD_CART':
      return { items: action.payload }

    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex((item) => item.modelId === action.payload.modelId)

      if (existingIndex === -1) {
        return { items: [...state.items, action.payload] }
      }

      const existing = state.items[existingIndex]
      const nextItems = state.items.slice()
      nextItems[existingIndex] = {
        ...existing,
        ...action.payload,
        quantity: existing.quantity + action.payload.quantity,
      } as CartItem

      return { items: nextItems }
    }

    case 'REMOVE_ITEM':
      return { items: state.items.filter((item) => item.modelId !== action.payload.modelId) }

    case 'UPDATE_QUANTITY': {
      if (action.payload.qty <= 0) {
        return { items: state.items.filter((item) => item.modelId !== action.payload.modelId) }
      }

      return {
        items: state.items.map((item) =>
          item.modelId === action.payload.modelId ? { ...item, quantity: action.payload.qty } : item,
        ),
      }
    }

    case 'CLEAR_CART':
      return initialState

    default:
      return state
  }
}

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (modelId: string) => void
  updateQuantity: (modelId: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

let clearCartBridge: (() => void) | null = null

export function clearPersistedCart() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CART_STORAGE_KEY)
    window.sessionStorage.removeItem(CART_STORAGE_KEY)
  }

  clearCartBridge?.()
}

function readStoredCart(storage: Storage) {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

function mergeStoredCarts(...collections: CartItem[][]) {
  const itemsByModelId = new Map<string, CartItem>()

  for (const collection of collections) {
    for (const item of collection) {
      const existing = itemsByModelId.get(item.modelId)
      if (!existing) {
        itemsByModelId.set(item.modelId, item)
        continue
      }

      itemsByModelId.set(item.modelId, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      })
    }
  }

  return Array.from(itemsByModelId.values())
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { isAuthenticated, loading } = useAuth()
  const skipNextPersistRef = useRef(true)

  useEffect(() => {
    clearCartBridge = () => {
      dispatch({ type: 'CLEAR_CART' })
    }

    return () => {
      if (clearCartBridge) {
        clearCartBridge = null
      }
    }
  }, [])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return

    skipNextPersistRef.current = true

    const sessionItems = readStoredCart(window.sessionStorage)
    const localItems = readStoredCart(window.localStorage)
    const nextItems = isAuthenticated ? mergeStoredCarts(sessionItems, localItems) : sessionItems

    dispatch({ type: 'LOAD_CART', payload: nextItems })
  }, [isAuthenticated, loading])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    if (state.items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY)
      window.sessionStorage.removeItem(CART_STORAGE_KEY)
      return
    }

    if (isAuthenticated) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items))
      window.sessionStorage.removeItem(CART_STORAGE_KEY)
      return
    }

    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items))
    window.localStorage.removeItem(CART_STORAGE_KEY)
  }, [isAuthenticated, loading, state.items])

  const value = useMemo<CartContextValue>(() => {
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = state.items.reduce((sum, item) => {
      if (item.type === 'configurable') {
        const optionsTotal = item.options.reduce((optionSum, option) => optionSum + option.price, 0)
        return sum + (item.basePrice + optionsTotal) * item.quantity
      }

      return sum + item.price * item.quantity
    }, 0)

    return {
      items: state.items,
      addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
      removeItem: (modelId) => dispatch({ type: 'REMOVE_ITEM', payload: { modelId } }),
      updateQuantity: (modelId, qty) => dispatch({ type: 'UPDATE_QUANTITY', payload: { modelId, qty } }),
      clearCart: () => dispatch({ type: 'CLEAR_CART' }),
      totalItems,
      totalPrice,
    }
  }, [state.items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }

  return context
}