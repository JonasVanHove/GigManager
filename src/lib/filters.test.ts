import { describe, it, expect } from 'vitest';
import type { Gig } from '@/types';

// Filter logic extracted for testing
function filterCharityTentative(
  gig: Gig,
  showCharity: boolean,
  showTentative: boolean
): boolean {
  const isCharity = gig.isCharity;
  const isTentative = gig.isTentative;

  // When both are checked, show all gigs
  if (showCharity && showTentative) return true;
  
  // When both are unchecked, show only regular gigs
  if (!showCharity && !showTentative) return !isCharity && !isTentative;
  
  // When only charity is checked, show only charity gigs
  if (showCharity && !showTentative) return isCharity;
  
  // When only tentative is checked, show only tentative gigs
  if (!showCharity && showTentative) return isTentative;
  
  return true;
}

describe('Charity/Tentative Filter Logic', () => {
  const mockGigs = {
    regular: { id: '1', isCharity: false, isTentative: false } as Gig,
    charity: { id: '2', isCharity: true, isTentative: false } as Gig,
    tentative: { id: '3', isCharity: false, isTentative: true } as Gig,
    charityTentative: { id: '4', isCharity: true, isTentative: true } as Gig,
  };

  it('should show all gigs when both filters are checked', () => {
    expect(filterCharityTentative(mockGigs.regular, true, true)).toBe(true);
    expect(filterCharityTentative(mockGigs.charity, true, true)).toBe(true);
    expect(filterCharityTentative(mockGigs.tentative, true, true)).toBe(true);
    expect(filterCharityTentative(mockGigs.charityTentative, true, true)).toBe(true);
  });

  it('should show only regular gigs when both filters are unchecked', () => {
    expect(filterCharityTentative(mockGigs.regular, false, false)).toBe(true);
    expect(filterCharityTentative(mockGigs.charity, false, false)).toBe(false);
    expect(filterCharityTentative(mockGigs.tentative, false, false)).toBe(false);
    expect(filterCharityTentative(mockGigs.charityTentative, false, false)).toBe(false);
  });

  it('should show only charity gigs when only charity is checked', () => {
    expect(filterCharityTentative(mockGigs.regular, true, false)).toBe(false);
    expect(filterCharityTentative(mockGigs.charity, true, false)).toBe(true);
    expect(filterCharityTentative(mockGigs.tentative, true, false)).toBe(false);
    expect(filterCharityTentative(mockGigs.charityTentative, true, false)).toBe(true);
  });

  it('should show only tentative gigs when only tentative is checked', () => {
    expect(filterCharityTentative(mockGigs.regular, false, true)).toBe(false);
    expect(filterCharityTentative(mockGigs.charity, false, true)).toBe(false);
    expect(filterCharityTentative(mockGigs.tentative, false, true)).toBe(true);
    expect(filterCharityTentative(mockGigs.charityTentative, false, true)).toBe(true);
  });
});

describe('Payment Status Filter Logic', () => {
  function filterPaymentStatus(
    gig: Gig,
    showPaid: boolean,
    showUnpaid: boolean
  ): boolean {
    const isPaid = gig.paymentReceived;
    if (isPaid && !showPaid) return false;
    if (!isPaid && !showUnpaid) return false;
    return true;
  }

  const mockGigs = {
    paid: { id: '1', paymentReceived: true } as Gig,
    unpaid: { id: '2', paymentReceived: false } as Gig,
  };

  it('should show all gigs when both payment filters are checked', () => {
    expect(filterPaymentStatus(mockGigs.paid, true, true)).toBe(true);
    expect(filterPaymentStatus(mockGigs.unpaid, true, true)).toBe(true);
  });

  it('should show only paid gigs when only paid is checked', () => {
    expect(filterPaymentStatus(mockGigs.paid, true, false)).toBe(true);
    expect(filterPaymentStatus(mockGigs.unpaid, true, false)).toBe(false);
  });

  it('should show only unpaid gigs when only unpaid is checked', () => {
    expect(filterPaymentStatus(mockGigs.paid, false, true)).toBe(false);
    expect(filterPaymentStatus(mockGigs.unpaid, false, true)).toBe(true);
  });

  it('should show no gigs when both payment filters are unchecked', () => {
    expect(filterPaymentStatus(mockGigs.paid, false, false)).toBe(false);
    expect(filterPaymentStatus(mockGigs.unpaid, false, false)).toBe(false);
  });
});
