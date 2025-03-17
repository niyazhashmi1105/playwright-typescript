// filepath: /Users/mdniyazhashmi/playwright-typescript/fixtures/cartPageFixture.js
import { CartPage } from '../pages/cartpage';

export const cartPageFixture = {
    cartPage: async ({ page }, use) => {
        const cartPage = new CartPage(page);
        await use(cartPage);
    },
};