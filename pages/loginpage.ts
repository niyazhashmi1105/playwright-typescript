// filepath: /Users/mdniyazhashmi/playwright-typescript/pages/loginpage.ts
import { Page } from '@playwright/test';
import { BasePage } from './basepage';

export class LoginPage extends BasePage {
    private userName: string;
    private password: string;
    private loginBtn: string;

    constructor(page: Page) {
        super(page);
        this.userName = "#user-name";
        this.password = "#password";
        this.loginBtn = "#login-button";
    }

    async doLogin(user: string, pass: string): Promise<void> {
        await this.page.fill(this.userName, user);
        await this.page.fill(this.password, pass);
        await this.page.locator(this.loginBtn).click();
    }
}
