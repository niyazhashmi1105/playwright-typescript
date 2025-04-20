import { Page, Locator } from '@playwright/test';

export class BasePage {
    protected page: Page;
    private selectOptions: Locator;
    private filterOptions: Locator;

    constructor(page: Page) {
        this.page = page;
        this.selectOptions = this.page.locator(".product_sort_container option");
        this.filterOptions = this.page.locator(".product_sort_container");
    }

    async navigateToURL(url: string): Promise<void> {
        await this.page.goto(url);
    }

    async wait(timeOut: number): Promise<void> {
        await this.page.waitForTimeout(timeOut);
    }

    async selectDropdownOption(value: string): Promise<string | null> {
        const options = await this.selectOptions.allInnerTexts();
        for (const option of options) {
            if (option.includes(value)) {
                await this.filterOptions.selectOption({ label: value });
                return value;
            }
        }
        return null;
    }

    async click(selector: string, description?: string): Promise<void> {
        await this.page.click(selector);
    }

    async fill(selector: string, value: string): Promise<void> {
        await this.page.fill(selector, value);
    }

    async getText(selector: string): Promise<string | null> {
        return await this.page.locator(selector).textContent();
    }

    async isVisibleText(selector: string): Promise<boolean> {
        return await this.page.locator(selector).isVisible();
    }

    async selectOption(selector: string, value: string): Promise<void> {
        await this.page.selectOption(selector, value);
    }
}