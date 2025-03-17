// filepath: /Users/mdniyazhashmi/playwright-typescript/fixtures/homePageFixture.js
import { HomePage } from '../pages/homepage';

export const homePageFixture = {
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },
};