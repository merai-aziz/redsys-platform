'use client'

import Link from 'next/link'
import { ShoppingCart, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CartPage() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">Chargement du panier...</CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
        <p className="text-sm text-slate-500">
          Espace de pre-validation avant demande de devis ou commande interne.
        </p>
      </header>

      {!isAuthenticated ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-sky-600" />
              Panier invite
            </CardTitle>
            <CardDescription>
              Connectez-vous pour sauvegarder vos selections et finaliser une demande.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Creer un compte</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/catalog">Continuer mes achats</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Bonjour {user?.firstName || 'client'}</CardTitle>
              <CardDescription>
                Votre panier est pret. Le flux de checkout sera branche dans une etape suivante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Compte connecte</Badge>
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Panier: 0 article</Badge>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Aucun article pour le moment. Ajoutez des produits depuis le catalogue ou le configurateur.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
                  <Link href="/catalog">Parcourir le catalogue</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Lancer une recherche rapide</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-start gap-3 py-4 text-sm text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              Les prix et disponibilites affiches dans le panier sont valides au moment de la confirmation.
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
