import type { Event, Profile } from '@/types/database';

export interface MockRecommendation {
  eventId: string;
  matchScore: number;
  matchReasonKey:
    | 'reasonIndustry'
    | 'reasonCity'
    | 'reasonAudience'
    | 'reasonKeywords'
    | 'reasonFallback';
  matchReasonParams?: {
    value?: string;
    keywords?: string[];
  };
}

export interface MockGuestRecommendation {
  guestId: string;
  matchScore: number;
  matchReasonKey:
    | 'guestReasonIndustry'
    | 'guestReasonCity'
    | 'guestReasonBio'
    | 'guestReasonKeywords'
    | 'guestReasonFallback';
  matchReasonParams?: {
    value?: string;
    keywords?: string[];
  };
}

function tokenize(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .split(/[\s,，。.;；:：/|、】【（）()\-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function getMockEventRecommendations(
  profile: Pick<Profile, 'bio' | 'industry' | 'city'>,
  events: Array<
    Pick<Event, 'id' | 'title' | 'description' | 'target_audience' | 'location' | 'status'>
  >,
  limit = 3,
): MockRecommendation[] {
  const industryTokens = tokenize(profile.industry);
  const cityTokens = tokenize(profile.city);
  const bioTokens = tokenize(profile.bio);

  const profileKeywords = [...new Set([...industryTokens, ...cityTokens, ...bioTokens])];

  return events
    .filter((event) => event.status === 'published')
    .map((event) => {
      const eventKeywords = tokenize(
        [event.title, event.description, event.target_audience, event.location]
          .filter(Boolean)
          .join(' '),
      );

      const overlap = profileKeywords.filter((keyword) => eventKeywords.includes(keyword));
      const industryMatched = industryTokens.some((token) => eventKeywords.includes(token));
      const cityMatched = cityTokens.some((token) => eventKeywords.includes(token));
      const audienceMatched = tokenize(event.target_audience).some((token) => bioTokens.includes(token));

      let score = Math.min(100, overlap.length * 18);
      if (industryMatched) score += 18;
      if (cityMatched) score += 12;
      if (audienceMatched) score += 16;
      score = Math.min(98, Math.max(score, overlap.length > 0 ? 56 : 34));

      let matchReasonKey: MockRecommendation['matchReasonKey'] = 'reasonFallback';
      let matchReasonParams: MockRecommendation['matchReasonParams'] | undefined;

      if (industryMatched && profile.industry) {
        matchReasonKey = 'reasonIndustry';
        matchReasonParams = { value: profile.industry };
      } else if (cityMatched && profile.city) {
        matchReasonKey = 'reasonCity';
        matchReasonParams = { value: profile.city };
      } else if (audienceMatched) {
        matchReasonKey = 'reasonAudience';
      } else if (overlap.length > 0) {
        matchReasonKey = 'reasonKeywords';
        matchReasonParams = { keywords: overlap.slice(0, 3) };
      }

      return {
        eventId: event.id,
        matchScore: score,
        matchReasonKey,
        matchReasonParams,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function getMockRecommendedGuestsForEvent(
  event: Pick<Event, 'title' | 'description' | 'target_audience' | 'location'>,
  guests: Array<Pick<Profile, 'id' | 'bio' | 'industry' | 'city'>>,
  limit = 5,
): MockGuestRecommendation[] {
  const targetTokens = tokenize(
    [event.title, event.description, event.target_audience, event.location].filter(Boolean).join(' '),
  );
  const audienceTokens = tokenize(event.target_audience);
  const locationTokens = tokenize(event.location);

  return guests
    .map((guest) => {
      const industryTokens = tokenize(guest.industry);
      const cityTokens = tokenize(guest.city);
      const bioTokens = tokenize(guest.bio);
      const guestKeywords = [...new Set([...industryTokens, ...cityTokens, ...bioTokens])];
      const overlap = guestKeywords.filter((keyword) => targetTokens.includes(keyword));
      const industryMatched = industryTokens.some((token) => targetTokens.includes(token));
      const cityMatched = cityTokens.some((token) => locationTokens.includes(token));
      const bioMatched = bioTokens.some((token) => audienceTokens.includes(token));

      let score = Math.min(100, overlap.length * 18);
      if (industryMatched) score += 20;
      if (cityMatched) score += 12;
      if (bioMatched) score += 16;
      score = Math.min(98, Math.max(score, overlap.length > 0 ? 52 : 30));

      let matchReasonKey: MockGuestRecommendation['matchReasonKey'] = 'guestReasonFallback';
      let matchReasonParams: MockGuestRecommendation['matchReasonParams'] | undefined;

      if (industryMatched && guest.industry) {
        matchReasonKey = 'guestReasonIndustry';
        matchReasonParams = { value: guest.industry };
      } else if (cityMatched && guest.city) {
        matchReasonKey = 'guestReasonCity';
        matchReasonParams = { value: guest.city };
      } else if (bioMatched) {
        matchReasonKey = 'guestReasonBio';
      } else if (overlap.length > 0) {
        matchReasonKey = 'guestReasonKeywords';
        matchReasonParams = { keywords: overlap.slice(0, 3) };
      }

      return {
        guestId: guest.id,
        matchScore: score,
        matchReasonKey,
        matchReasonParams,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
