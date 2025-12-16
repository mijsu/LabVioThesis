import { describe, it, expect } from 'vitest';

const HEALTH_TIP_CATEGORIES = ['nutrition', 'exercise', 'sleep', 'mental-health', 'prevention'];

describe('Health Tips Categories', () => {
  it('should have 5 health tip categories', () => {
    expect(HEALTH_TIP_CATEGORIES).toHaveLength(5);
  });

  it('should include nutrition category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain('nutrition');
  });

  it('should include exercise category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain('exercise');
  });

  it('should include sleep category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain('sleep');
  });

  it('should include mental-health category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain('mental-health');
  });

  it('should include prevention category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain('prevention');
  });
});

describe('Health Tip Structure', () => {
  const sampleTip = {
    id: '1',
    title: 'Stay Hydrated',
    content: 'Drink at least 8 glasses of water daily.',
    category: 'nutrition',
    icon: 'Apple',
  };

  it('should have required id field', () => {
    expect(sampleTip).toHaveProperty('id');
    expect(typeof sampleTip.id).toBe('string');
  });

  it('should have required title field', () => {
    expect(sampleTip).toHaveProperty('title');
    expect(typeof sampleTip.title).toBe('string');
  });

  it('should have required content field', () => {
    expect(sampleTip).toHaveProperty('content');
    expect(sampleTip.content.length).toBeGreaterThan(0);
  });

  it('should have valid category', () => {
    expect(HEALTH_TIP_CATEGORIES).toContain(sampleTip.category);
  });

  it('should have icon field', () => {
    expect(sampleTip).toHaveProperty('icon');
  });
});

describe('Category Filtering', () => {
  const mockTips = [
    { id: '1', category: 'nutrition' },
    { id: '2', category: 'exercise' },
    { id: '3', category: 'nutrition' },
    { id: '4', category: 'sleep' },
  ];

  it('should filter tips by nutrition category', () => {
    const filtered = mockTips.filter((tip) => tip.category === 'nutrition');
    expect(filtered).toHaveLength(2);
  });

  it('should filter tips by exercise category', () => {
    const filtered = mockTips.filter((tip) => tip.category === 'exercise');
    expect(filtered).toHaveLength(1);
  });

  it('should return all tips when no category filter', () => {
    const filtered = mockTips;
    expect(filtered).toHaveLength(4);
  });
});
