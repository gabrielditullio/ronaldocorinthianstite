import { supabase } from "@/integrations/supabase/client";

/**
 * Records a stage transition for a lead.
 * Call this whenever a lead's stage changes.
 */
export async function trackStageTransition(
  userId: string,
  leadId: string,
  fromStage: string | null,
  toStage: string
) {
  const { error } = await supabase.from("lead_stage_transitions" as any).insert({
    user_id: userId,
    lead_id: leadId,
    from_stage: fromStage,
    to_stage: toStage,
    transitioned_at: new Date().toISOString(),
  });
  if (error) console.warn("[track-stage-transition]", error.message);
}
