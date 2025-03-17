// filepath: /Users/mdniyazhashmi/playwright-typescript/pages/cartpage.ts
import { BasePage } from './basepage';
import type { Page } from '@playwright/test';

export class CartPage extends BasePage {
    private readonly products: string;
    private readonly productPrices: string;
    private readonly removeBtn: string;

    constructor(public readonly page: Page) {
        super(page);
        this.products = ".inventory_item_name";
        this.productPrices = ".inventory_item_price";
        this.removeBtn = "//button[text()='Remove']";
    }

    async getProductsCount(): Promise<number> {
        const productsCount = await this.page.$$(this.products);
        return productsCount.length;
    }

    async getProductsPrices(): Promise<number> {
        const prices = await this.page.locator(this.productPrices).allTextContents();
        return prices.length;
    }

    async getProductsAfterRemoval(productName: string): Promise<void> {
        const prods = await this.page.$$(this.products);
        let count = 0;
        for (const prod of prods) {
            count++;
            if (productName === await prod.textContent()) {
                await this.page.locator(this.removeBtn).nth(count - 1).click();
                break;
            }
        }
    }
}