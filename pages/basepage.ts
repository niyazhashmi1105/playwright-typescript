import type { Page, Locator } from '@playwright/test';
import HTMLReporter  from '../utils/html-reporter';

export class BasePage {
    private readonly selectOptions: Locator;
    private readonly filterOptions: Locator;
    public readonly reporter: HTMLReporter;

    constructor(public readonly page: Page) {
        this.selectOptions = this.page.locator(".product_sort_container option");
        this.filterOptions = this.page.locator(".product_sort_container");
        
    }

    async navigateToURL(url: string) {
        // this.reporter.trackPageAction({
        //     type: 'navigate',
        //     value: url,
        //     timestamp: new Date().toISOString()
        // });
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

    async click(selector: string, description?: string) {
        // this.reporter.trackPageAction({
        //     type: 'click',
        //     selector,
        //     description,
        //     timestamp: new Date().toISOString()
        // });
        await this.page.click(selector);
    }

    async fill(selector: string, value: string) {
        // this.reporter.trackPageAction({
        //     type: 'fill',
        //     selector,
        //     value,
        //     timestamp: new Date().toISOString()
        // });
        await this.page.fill(selector, value);
    }

    async getText(selector: string): Promise<string | null> {
        return await this.page.locator(selector).textContent();
    }

    async isVisibleText(selector: string): Promise<boolean> {
        return await this.page.locator(selector).isVisible();
    }

    async selectOption(selector: string, value: string) {
        // this.reporter.trackPageAction({
        //     type: 'select',
        //     selector,
        //     value,
        //     timestamp: new Date().toISOString()
        // });
        await this.page.selectOption(selector, value);
    }
}