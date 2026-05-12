import { describe, it, expect } from 'vitest';

type Gig = {
  id: string;
  performers?: string;
  date?: string; // ISO
  isCharity?: boolean;
  isTentative?: boolean;
  paymentReceived?: boolean;
};

function applyFilters(
  gigs: Gig[],
  selectedArtists: Set<string>,
  hidePastGigs: boolean,
  showCharity: boolean,
  showTentative: boolean,
  showPaid: boolean,
  showUnpaid: boolean,
  now = new Date()
) {
  let filtered = gigs;

  if (selectedArtists.size > 0) {
    filtered = filtered.filter((g) => !!g.performers && selectedArtists.has(g.performers));
  }

  if (hidePastGigs) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    filtered = filtered.filter((g) => new Date(g.date || 0) >= today);
  }

  filtered = filtered.filter((gig) => {
    const isCharity = !!gig.isCharity;
    const isTentative = !!gig.isTentative;

    if (showCharity && showTentative) return true;
    if (!showCharity && !showTentative) return !isCharity && !isTentative;
    if (showCharity && !showTentative) return isCharity;
    if (!showCharity && showTentative) return isTentative;
    return true;
  });

  filtered = filtered.filter((gig) => {
    const isPaid = !!gig.paymentReceived;
    // Only apply payment filter if at least one payment status is selected
    if (showPaid || showUnpaid) {
      if (isPaid && !showPaid) return false;
      if (!isPaid && !showUnpaid) return false;
    }
    return true;
  });

  return filtered;
}

const now = new Date('2026-05-12T12:00:00Z');

describe('AllGigsTab full filter pipeline', () => {
  const gigs: Gig[] = [
    { id: 'charity-past', date: '2025-01-01T12:00:00Z', isCharity: true, paymentReceived: false },
    { id: 'charity-future', date: '2026-06-01T12:00:00Z', isCharity: true, paymentReceived: false },
    { id: 'tentative-future', date: '2026-06-02T12:00:00Z', isTentative: true, paymentReceived: false },
    { id: 'regular-future', date: '2026-06-03T12:00:00Z', paymentReceived: true },
  ];

  it('when only charity selected shows charity future gigs', () => {
    const res = applyFilters(gigs, new Set(), false, true, false, true, true, now);
    const ids = res.map((g) => g.id);
    expect(ids).toContain('charity-future');
    expect(ids).not.toContain('tentative-future');
    expect(ids).not.toContain('regular-future');
  });

  it('when only tentative selected shows tentative gigs', () => {
    const res = applyFilters(gigs, new Set(), false, false, true, true, true, now);
    const ids = res.map((g) => g.id);
    expect(ids).toContain('tentative-future');
    expect(ids).not.toContain('charity-future');
    expect(ids).not.toContain('regular-future');
  });

  it('when both unchecked shows only regular future gigs', () => {
    const res = applyFilters(gigs, new Set(), false, false, false, true, true, now);
    const ids = res.map((g) => g.id);
    expect(ids).toContain('regular-future');
    expect(ids).not.toContain('charity-future');
    expect(ids).not.toContain('tentative-future');
  });

  it('Charity filter works independently when no payment filters are selected', () => {
    // This tests the bug fix: selecting only Charity with both payment filters unchecked
    const res = applyFilters(gigs, new Set(), false, true, false, false, false, now);
    const ids = res.map((g) => g.id);
    expect(ids).toContain('charity-future');
    expect(ids).not.toContain('tentative-future');
    expect(ids).not.toContain('regular-future');
  });

  it('Tentative filter works independently when no payment filters are selected', () => {
    const res = applyFilters(gigs, new Set(), false, false, true, false, false, now);
    const ids = res.map((g) => g.id);
    expect(ids).toContain('tentative-future');
    expect(ids).not.toContain('charity-future');
    expect(ids).not.toContain('regular-future');
  });

  it('hidePastGigs removes past charity', () => {
    const res = applyFilters(gigs, new Set(), true, true, true, true, true, now);
    const ids = res.map((g) => g.id);
    expect(ids).not.toContain('charity-past');
  });
});
