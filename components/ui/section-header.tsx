import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h2 className={cn("text-xl font-medium text-gray-900 tracking-wide", className)}>
      {children}
    </h2>
  );
}