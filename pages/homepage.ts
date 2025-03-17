// filepath: /Users/mdniyazhashmi/playwright-typescript/pages/homepage.ts
import { BasePage } from './basepage';
import type { Page } from '@playwright/test';

export class HomePage extends BasePage {
    private readonly productsList: string;
    private readonly productsCost: string;

    constructor(public readonly page: Page) {
        super(page);
        
        this.productsList = "//div[@class='inventory_item_label']/a/div";
        this.productsCost = ".pricebar > div";
    }

    async getProductListCount(): Promise<number> {
        const productsCount = await this.page.$$(this.productsList);
        return productsCount.length;
    }

    async getProductName(productName: string): Promise<boolean> {
        const products = await this.page.$$(this.productsList);
        for (const product of products) {
            if (productName === await product.textContent()) {
                return true;
            }
        }
        return false;
    }

    async addProductToCart(productName: string, selector: string): Promise<void> {
        const productsCount = await this.page.$$(this.productsList);
        for (const product of productsCount) {
            if (productName === await product.textContent()) {
                await this.page.locator(selector).click();
                break;
            }
        }
    }

    async getFirstProductItem(): Promise<string | null> {
        const firstItem = await this.page.locator(this.productsList).first().textContent();
        return firstItem;
    }

    async getLastProductItem(): Promise<string | null> {
        const lastItem = await this.page.locator(this.productsList).last().textContent();
        return lastItem;
    }
}