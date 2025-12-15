'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-base-dark border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-white">
                Base-Solana Bridge
              </span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={clsx(
                  'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                  pathname === '/'
                    ? 'border-base-blue text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/tokens"
                className={clsx(
                  'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                  pathname === '/tokens'
                    ? 'border-base-blue text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                )}
              >
                All Tokens
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

