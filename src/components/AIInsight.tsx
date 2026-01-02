import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AIStructuredResponse } from '../types';

interface AIInsightProps {
  insight: AIStructuredResponse;
}

export const AIInsight: React.FC<AIInsightProps> = ({ insight }) => {
  return (
    <div className="mt-2 p-2 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-md">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={12} className="text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">AI Insight</span>
      </div>

      {/* Summary */}
      <div className="mb-2.5">
        <p className="text-xs text-zinc-200 leading-relaxed">{insight.summary}</p>
      </div>

      {/* Key Points */}
      {insight.key_points && insight.key_points.length > 0 && (
        <div className="mb-2.5">
          <div className="text-[10px] font-semibold text-indigo-400/80 mb-1.5 uppercase tracking-wide">Key Points</div>
          <ul className="space-y-1">
            {insight.key_points.map((point, index) => (
              <li key={index} className="flex items-start gap-1.5 text-[10px] text-zinc-300">
                <CheckCircle2 size={10} className="text-indigo-400 mt-0.5 shrink-0" />
                <span className="flex-1">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Next Steps */}
      {insight.suggested_next_steps && insight.suggested_next_steps.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-indigo-400/80 mb-1.5 uppercase tracking-wide">Next Steps</div>
          <ul className="space-y-1">
            {insight.suggested_next_steps.map((step, index) => (
              <li key={index} className="flex items-start gap-1.5 text-[10px] text-zinc-300">
                <ArrowRight size={10} className="text-purple-400 mt-0.5 shrink-0" />
                <span className="flex-1">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

