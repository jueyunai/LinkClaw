import { evaluateGuestForEvent } from '@/lib/ai/pipeline/activity-agent';
import { evaluateEventForGuest } from '@/lib/ai/pipeline/guest-agent';
import { runMatchmaker } from '@/lib/ai/pipeline/matchmaker';
import { extractEventProfile, extractGuestProfile } from '@/lib/ai/pipeline/profile-extractor';
import type {
  EventDetailInput,
  EventProfile,
  GuestProfile,
  GuestProfileInput,
  RunMatchPipelineResult,
} from '@/lib/ai/pipeline/types';

export async function runMatchPipeline(input: {
  guest: GuestProfileInput;
  event: EventDetailInput;
  guestProfile?: GuestProfile;
  eventProfile?: EventProfile;
}): Promise<RunMatchPipelineResult> {
  const guestProfile = input.guestProfile ?? (await extractGuestProfile(input.guest));
  const eventProfile = input.eventProfile ?? (await extractEventProfile(input.event));

  const [guestEvaluation, activityEvaluation] = await Promise.all([
    evaluateEventForGuest({
      guest: input.guest,
      guestProfile,
      event: input.event,
      eventProfile,
    }),
    evaluateGuestForEvent({
      guest: input.guest,
      guestProfile,
      event: input.event,
      eventProfile,
    }),
  ]);

  const matchResult = await runMatchmaker({
    displayName: input.guest.display_name,
    eventTitle: input.event.title,
    guestEvaluation,
    activityEvaluation,
  });

  return {
    guestProfile,
    eventProfile,
    guestEvaluation,
    activityEvaluation,
    matchResult,
  };
}
