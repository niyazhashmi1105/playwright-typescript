import { Page } from '@playwright/test';
import { CartPage } from '../pages/cartpage';

type CartFixture = {
    page: Page;
};

export const cartPageFixture = {
    cartPage: async ({ page }: CartFixture, use: (r: CartPage) => Promise<void>) => {
        const cartPage = new CartPage(page);
        await use(cartPage);
    },
};