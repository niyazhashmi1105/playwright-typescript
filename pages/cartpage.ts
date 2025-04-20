// filepath: /Users/mdniyazhashmi/playwright-typescript/pages/cartpage.ts
import { Page } from '@playwright/test';
import { BasePage } from './basepage';

export class CartPage extends BasePage {
    private products: string;
    private productPrices: string;
    private removeBtn: string;

    constructor(page: Page) {
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
            if (productName === (await prod.textContent())) {
                await this.page.locator(this.removeBtn).nth(count - 1).click();
                break;
            }
        }
    }
}