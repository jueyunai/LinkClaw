import { describe, expect, it } from 'vitest';
import * as registrationActions from '@/app/[locale]/registrations/actions';

describe('registration actions exports', () => {
  it('exports respondToInvitation for guest invitation forms', () => {
    expect(registrationActions.respondToInvitation).toBeTypeOf('function');
  });
});
