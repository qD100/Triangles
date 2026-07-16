interface ChartLegendItem {
  label: string;
  color: string;
}

/**
 * Recharts v3's <Legend> no longer accepts a manual `payload` prop, so
 * single-series-many-Cells charts (donut, scatter) build their own legend
 * from the same data/color mapping they already render with.
 */
export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
