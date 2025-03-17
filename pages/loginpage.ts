// filepath: /Users/mdniyazhashmi/playwright-typescript/pages/loginpage.ts
import { BasePage } from './basepage';
import type { Page } from '@playwright/test';

export class LoginPage extends BasePage {
    private readonly userName: string;
    private readonly password: string;
    private readonly loginBtn: string;

    constructor(public readonly page: Page) {
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
