'use client';

import React from 'react';

export default function ReservedCard() {
  return (
    <div className="bg-muted/30 rounded-2xl border border-border shadow-xl p-4 sm:p-5 flex flex-col gap-3 h-full items-center justify-center min-h-24">
      <p className="text-xs text-muted-foreground font-medium">Reserved for future features</p>
    </div>
  );
}

