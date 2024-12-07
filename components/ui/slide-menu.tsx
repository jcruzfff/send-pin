"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import { Oxanium } from 'next/font/google'

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

interface SlideMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

const SlideMenu = React.forwardRef<
  HTMLDivElement,
  SlideMenuProps
>(({ open, onOpenChange, children }, ref) => {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Menu */}
      <div
        ref={ref}
        className={cn(
          "absolute inset-y-0 right-0 w-full bg-black",
          "animate-in slide-in-from-right duration-300",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className={cn("ml-2 text-lg font-semibold text-white", oxanium.className)}>Menu</h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})
SlideMenu.displayName = "SlideMenu"

export { SlideMenu } 