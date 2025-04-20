import { Page, test } from '@playwright/test';
import { LoginPage } from '../pages/loginpage';

type LoginFixture = {
    page: Page;
};

export const loginPageFixture = {
    loginPage: async ({ page }: LoginFixture, use: (r: LoginPage) => Promise<void>) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },
};