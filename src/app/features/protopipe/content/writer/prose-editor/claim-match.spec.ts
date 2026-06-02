import { claimAppearsInText, normalizeClaimText } from './claim-match';

describe('claimAppearsInText', () => {
  it('matches exact substrings', () => {
    expect(claimAppearsInText('$800–$1,500', 'Prices from $800–$1,500 today.')).toBe(true);
  });

  it('matches when dashes differ', () => {
    expect(claimAppearsInText('6–12 months', 'Book 6-12 months ahead.')).toBe(true);
  });

  it('returns false when claim is absent', () => {
    expect(claimAppearsInText('not in body', 'Completely different text.')).toBe(false);
  });
});

describe('normalizeClaimText', () => {
  it('folds en-dash to hyphen', () => {
    expect(normalizeClaimText('6–12')).toBe('6-12');
  });
});
