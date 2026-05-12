import { describe, it, expect } from 'vitest';

type Gig = {
  id: string;
  isCharity?: boolean;
  isTentative?: boolean;
};

function filterByType(gigs: Gig[], showCharity: boolean, showTentative: boolean) {
  return gigs.filter((gig) => {
    const isCharity = !!gig.isCharity;
    const isTentative = !!gig.isTentative;

    if (showCharity && showTentative) return true;
    if (!showCharity && !showTentative) return !isCharity && !isTentative;
    if (showCharity && !showTentative) return isCharity;
    if (!showCharity && showTentative) return isTentative;
    return true;
  });
}

describe('AllGigsTab type filters', () => {
  const gigs: Gig[] = [
    { id: 'a', isCharity: true },
    { id: 'b', isTentative: true },
    { id: 'c' },
    { id: 'd', isCharity: false, isTentative: false },
  ];

  it('shows only charity when only charity selected', () => {
    const res = filterByType(gigs, true, false).map((g) => g.id);
    expect(res).toContain('a');
    expect(res).not.toContain('b');
    expect(res).not.toContain('c');
  });

  it('shows only tentative when only tentative selected', () => {
    const res = filterByType(gigs, false, true).map((g) => g.id);
    expect(res).toContain('b');
    expect(res).not.toContain('a');
    expect(res).not.toContain('c');
  });

  it('shows all when both selected', () => {
    const res = filterByType(gigs, true, true).map((g) => g.id);
    expect(res).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
  });

  it('shows only regular when none selected', () => {
    const res = filterByType(gigs, false, false).map((g) => g.id);
    expect(res).toContain('c');
    expect(res).toContain('d');
    expect(res).not.toContain('a');
    expect(res).not.toContain('b');
  });
});
