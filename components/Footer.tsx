'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link
              href="https://x.com/tomwade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Created by Twade
            </Link>
            <Link
              href="https://bridge.flaunch.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Bridge your Solana tokens
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

