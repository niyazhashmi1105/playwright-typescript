import {test as base } from '@playwright/test';
import { LoginPage } from '../pages/loginpage'; 
import { HomePage } from '../pages/homepage';
import { CartPage } from '../pages/cartpage';

type MyFixtures = {
    loginPage: LoginPage;
    homePage: HomePage;
    cartPage: CartPage;
  };

  export const test = base.extend<MyFixtures>({
    loginPage: async ({ page }, use) => {
      const loginPage = new LoginPage(page);
      await use(loginPage);
    },
    homePage: async ({ page }, use) => {
      await use(new HomePage(page));
    },
    cartPage: async ({ page }, use) => {
      await use(new CartPage(page));
    }
  });

  export { expect } from '@playwright/test';