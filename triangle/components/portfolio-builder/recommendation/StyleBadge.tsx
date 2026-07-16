import { Badge } from "@/components/ui/badge";

interface StyleBadgeProps {
  label: string;
  score: number;
}

export function StyleBadge({ label, score }: StyleBadgeProps) {
  return (
    <Badge className="border-none bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 px-4 py-1.5 text-sm text-white">
      {label} · Risk Score {score}
    </Badge>
  );
}
