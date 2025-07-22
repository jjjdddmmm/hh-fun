// App Footer Component - Production Ready, Zero Tech Debt
// Simplified footer for authenticated app pages with proper bottom buffer

import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="w-full mt-16 mb-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Divider */}
        <div className="border-t border-gray-200 pt-8 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left side - Brand and copyright */}
            <div className="flex items-center gap-4">
              <span className="text-gray-900 font-medium">hh.fun</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 text-sm">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>

            {/* Right side - Quick links */}
            <div className="flex items-center gap-6 text-sm">
              <Link 
                href="/help" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Help
              </Link>
              <Link 
                href="/privacy" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms
              </Link>
              <a 
                href="mailto:support@hh.fun" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}