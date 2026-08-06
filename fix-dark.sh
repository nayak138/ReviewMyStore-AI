#!/bin/bash
FILES="artifacts/reviewmystore/src/pages/marketing/layout.tsx artifacts/reviewmystore/src/pages/marketing/hero.tsx artifacts/reviewmystore/src/pages/marketing/features.tsx"

for f in $FILES; do
  sed -i 's/bg-white/bg-background/g' $f
  sed -i 's/bg-slate-50/bg-muted\/30 dark:bg-muted\/10/g' $f
  sed -i 's/text-slate-900/text-foreground/g' $f
  sed -i 's/text-slate-800/text-foreground\/90/g' $f
  sed -i 's/text-slate-700/text-foreground\/80/g' $f
  sed -i 's/text-slate-600/text-muted-foreground/g' $f
  sed -i 's/text-slate-500/text-muted-foreground/g' $f
  sed -i 's/text-slate-400/text-muted-foreground\/70/g' $f
  sed -i 's/border-slate-200/border-border/g' $f
  sed -i 's/border-slate-100/border-border\/50/g' $f
  sed -i 's/bg-slate-100/bg-muted/g' $f
  sed -i 's/bg-slate-200/bg-muted\/80/g' $f
done
