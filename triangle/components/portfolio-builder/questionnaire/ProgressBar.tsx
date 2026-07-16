import { Progress } from "@/components/ui/progress";
import { QUESTIONS } from "@/lib/portfolio-builder/questions";

interface ProgressBarProps {
  currentIndex: number;
}

export function ProgressBar({ currentIndex }: ProgressBarProps) {
  const total = QUESTIONS.length;
  const value = ((currentIndex + 1) / total) * 100;

  return (
    <div className="mb-8 w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Question {currentIndex + 1} of {total}
        </span>
        <span>{Math.round(value)}%</span>
      </div>
      <Progress
        value={value}
        className="[&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-emerald-500 [&_[data-slot=progress-indicator]]:via-blue-500 [&_[data-slot=progress-indicator]]:to-violet-500"
      />
    </div>
  );
}
