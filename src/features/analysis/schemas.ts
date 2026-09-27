import { z } from 'zod';
import { categories, priorities } from '../tickets/schemas';
export const analysisSchema = z.strictObject({
  summary: z.string().trim().min(1).max(600),
  category: z.enum(categories),
  priority: z.enum(priorities),
  suggestedResponse: z.string().trim().min(1).max(4000),
});
export type AnalysisResult = z.infer<typeof analysisSchema>;
