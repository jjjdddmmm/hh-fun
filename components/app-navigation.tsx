"use client";

import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const appNavLinks = [
  { name: "Property Analysis", href: "/analysis" },
  { name: "Timeline", href: "/timeline" },
  { name: "Negotiation", href: "/negotiation" },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-center items-center py-0 px-16 w-full h-[72px] bg-cinnabar-darkest">
      <div className="flex justify-between items-center w-full max-w-[1312px] h-10">
        {/* Logo */}
        <div className="flex justify-center items-center w-20 h-10">
          <Link href="/" className="text-neutral-white font-heading text-h6">
            HH.Fun
          </Link>
        </div>
        
        {/* Nav Links + Actions */}
        <div className="flex items-center gap-8">
          {/* App Navigation Links */}
          {appNavLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className={`text-neutral-white font-body text-bodySm hover:opacity-80 transition-opacity ${
                pathname === link.href ? 'border-b-2 border-neutral-white pb-1' : ''
              }`}
            >
              {link.name}
            </Link>
          ))}

          
          {/* Actions */}
          <SignedOut>
            <SignInButton>
              <button 
                className="bg-neutral-lightest hover:bg-neutral-lighter text-neutral-darkest border-2 border-neutral-darkest px-5 py-2 font-medium inline-flex items-center justify-center transition-colors"
                style={{ 
                  borderRadius: '8px',
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button 
                className="bg-cinnabar-lightest hover:bg-cinnabar-lighter text-neutral-darkest border-2 border-neutral-darkest px-5 py-2 font-medium inline-flex items-center justify-center transition-colors"
                style={{ 
                  borderRadius: '8px',
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}