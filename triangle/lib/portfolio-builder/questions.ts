import type { Answers } from "./types";

export type QuestionId = keyof Omit<Answers, "monthlyInvestPercent"> | "monthlyInvestPercent";

interface OptionConfig {
  value: string;
  label: string;
}

interface NumberQuestionConfig {
  id: "age";
  type: "number";
  prompt: string;
  hint?: string;
  min: number;
  validate: (value: number | null) => string | null;
}

interface ChoiceQuestionConfig {
  id: "horizon" | "lossReaction" | "goal" | "experience";
  type: "single-choice";
  prompt: string;
  hint?: string;
  options: OptionConfig[];
}

interface SliderQuestionConfig {
  id: "monthlyInvestPercent";
  type: "slider";
  prompt: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  optional: true;
}

export type QuestionConfig =
  | NumberQuestionConfig
  | ChoiceQuestionConfig
  | SliderQuestionConfig;

export const QUESTIONS: QuestionConfig[] = [
  {
    id: "age",
    type: "number",
    prompt: "How old are you?",
    hint: "Younger investors can generally tolerate higher volatility.",
    min: 18,
    validate: (value) => {
      if (value === null || Number.isNaN(value)) return "Enter your age.";
      if (value < 18) return "You must be at least 18.";
      if (value > 120) return "Enter a valid age.";
      return null;
    },
  },
  {
    id: "horizon",
    type: "single-choice",
    prompt: "When will you need this money?",
    options: [
      { value: "lt2", label: "Less than 2 years" },
      { value: "2to5", label: "2–5 years" },
      { value: "gt5", label: "More than 5 years" },
    ],
  },
  {
    id: "lossReaction",
    type: "single-choice",
    prompt: "If your portfolio lost 20% in one month, what would you most likely do?",
    options: [
      { value: "sell_all", label: "Sell everything" },
      { value: "sell_some", label: "Sell some" },
      { value: "hold", label: "Hold" },
      { value: "buy_more", label: "Buy more" },
    ],
  },
  {
    id: "goal",
    type: "single-choice",
    prompt: "What is your primary investment goal?",
    options: [
      { value: "preserve", label: "Preserve capital" },
      { value: "income", label: "Generate income" },
      { value: "balanced", label: "Balanced growth" },
      { value: "growth", label: "Long-term growth" },
      { value: "aggressive", label: "Aggressive wealth creation" },
    ],
  },
  {
    id: "experience",
    type: "single-choice",
    prompt: "How much investing experience do you have?",
    options: [
      { value: "none", label: "None" },
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  {
    id: "monthlyInvestPercent",
    type: "slider",
    prompt: "How much of your monthly income can you invest?",
    hint: "Optional — this doesn't affect your risk score, just your plan.",
    min: 0,
    max: 50,
    step: 1,
    unit: "%",
    optional: true,
  },
];
