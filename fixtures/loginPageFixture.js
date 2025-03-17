// filepath: /Users/mdniyazhashmi/playwright-typescript/fixtures/loginPageFixture.js
import { LoginPage } from '../pages/loginpage';

export const loginPageFixture = {
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },
};