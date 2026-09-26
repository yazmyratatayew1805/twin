export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-sm text-muted-foreground ${className}`}>
      Это развлекательный эксперимент. Результат не является научной или
      психологической оценкой.
    </p>
  );
}
