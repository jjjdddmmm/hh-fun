# HH.Fun

A clean, modern real estate analysis platform powered by AI.

## Features

- **Property Analysis**: AI-powered inspection report analysis
- **Market Insights**: Comprehensive market analysis and trends
- **Financial Modeling**: ROI calculations and investment projections
- **Negotiation Strategy**: Data-driven negotiation recommendations
- **Report Generation**: Professional PDF reports

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **AI**: Anthropic Claude

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
hh.fun/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── api/              # API utilities
│   ├── types/            # TypeScript types
│   └── utils.ts          # General utilities
└── public/               # Static assets
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks