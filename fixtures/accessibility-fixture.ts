import { test as base } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

type AccessibilityFixtures = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AccessibilityFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }));
  },
});

export { expect } from '@playwright/test';