import { Page } from '@playwright/test';
import { HomePage } from '../pages/homepage';

type HomeFixture = {
    page: Page;
};

export const homePageFixture = {
    homePage: async ({ page }: HomeFixture, use: (r: HomePage) => Promise<void>) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },
};