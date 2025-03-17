import type { Page, Locator } from '@playwright/test';

export class BasePage {
    private readonly selectOptions: Locator;
    private readonly filterOptions: Locator;

    constructor(public readonly page: Page) {
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

    async click(selector: string): Promise<void> {
        await this.page.locator(selector).click();
    }

    async fillDetails(locator: string, value: string): Promise<void> {
        await this.page.fill(locator, value);
    }

    async getText(selector: string): Promise<string | null> {
        return await this.page.locator(selector).textContent();
    }

    async isVisibleText(selector: string): Promise<boolean> {
        return await this.page.locator(selector).isVisible();
    }
}