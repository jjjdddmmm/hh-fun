"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const navLinks = [
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Resources", href: "/resources", hasDropdown: true }
];

const resourceLinks = [
  { name: "Guides", href: "/guides" },
  { name: "Blog", href: "/blog" },
  { name: "Support", href: "/support" }
];

export default function Navigation() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
          {navLinks.map((link, index) => (
            <div key={index} className="relative">
              {link.hasDropdown ? (
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 h-6 group"
                >
                  <span className="text-neutral-white font-body text-bodySm hover:opacity-80">
                    {link.name}
                  </span>
                  <ChevronDown size={20} className="text-neutral-white" />
                  
                  {isDropdownOpen && (
                    <div className="absolute top-8 left-0 w-32 bg-cinnabar-darkest border-2 border-neutral-white rounded-md p-4 flex flex-col gap-2 z-10">
                      {resourceLinks.map((resourceLink, idx) => (
                        <Link 
                          key={idx}
                          href={resourceLink.href} 
                          className="text-neutral-white font-body text-bodySm hover:opacity-80"
                        >
                          {resourceLink.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href={link.href}
                  className="text-neutral-white font-body text-bodySm hover:opacity-80"
                >
                  {link.name}
                </Link>
              )}
            </div>
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
            <Link href="/analysis">
              <button 
                className="bg-cinnabar-lightest hover:bg-cinnabar-lighter text-neutral-darkest border-2 border-neutral-darkest px-5 py-2 font-medium inline-flex items-center justify-center transition-colors"
                style={{ 
                  borderRadius: '8px',
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                Dashboard
              </button>
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}