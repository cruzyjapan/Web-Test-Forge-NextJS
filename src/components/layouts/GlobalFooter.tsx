import Link from "next/link"

export function GlobalFooter() {
  return (
    <footer className="w-full border-t bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-gray-600">
          <Link 
            href="https://cruzy.jp" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            Copyright © Cruzy Japan Co., Ltd. All Rights Reserved.
          </Link>
        </div>
      </div>
    </footer>
  )
}