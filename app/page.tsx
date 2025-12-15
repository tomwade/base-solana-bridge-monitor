'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { LatestBridged } from '@/components/LatestBridged'

export default function Home() {
  return (
    <div className="min-h-screen bg-base-dark flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Base-Solana Bridge Dashboard
          </h1>
          <p className="text-gray-400">
            Monitor tokens bridged between Base and Solana networks
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatestBridged
            direction="solana-to-base"
            title="Latest: Solana → Base"
          />
          <LatestBridged
            direction="base-to-solana"
            title="Latest: Base → Solana"
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}

