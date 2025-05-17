import { test, expect } from '../../fixtures/my-fixture';
import * as fs from 'fs';
import {PasswordUtils}  from '../../utils/password-utils';

interface TestData {
    std_user: string;
    password: string;
    isProductAvailable: string;
    addProductCart: string;
    firstProduct: string;
    lastProduct: string;
    addProductCart1: string;
    addProductCart2: string;
    addProductCart3: string;
}

const testData: TestData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));
const decodedPassword = PasswordUtils.decodePassword(testData.password);

test.beforeEach('prerequisite- login to application and landing on the homepage', async ({ loginPage }) => {
    await test.step('Login to application', async () => {
        await loginPage.navigateToURL('https://www.saucedemo.com/');
        expect(await loginPage.isVisibleText('#login-button')).toBeTruthy();
        await loginPage.doLogin(testData.std_user, decodedPassword);
    });
});

test('count the number of products', async ({ homePage }) => {
    await test.step('Count the number of products', async () => {
        const prodsCount = await homePage.getProductListCount();
        expect(prodsCount).toBeGreaterThan(5);
    });
});

test('check the product available or not', async ({ homePage }) => {
    await test.step('Check the product availability', async () => {
        const isAvailable = await homePage.getProductName(testData.isProductAvailable);
        expect(isAvailable).toBeTruthy();
    });
});

test('Add the product into the cart and assert if it is added or not', async ({ homePage, page }) => {
    await test.step('Add product to cart', async () => {
        await homePage.addProductToCart(testData.addProductCart, '#add-to-cart-sauce-labs-bike-light');
        expect(page.locator('#remove-sauce-labs-bike-light')).toBeVisible();
        expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('1');
        await homePage.click("//button[text()='Remove']");
    });
});

test('Check the first and last product before applying filter and after applying the filter', async ({ homePage, page }) => {
    await test.step('Check the first and last product before and after applying filter', async () => {
        await homePage.addProductToCart(testData.addProductCart, '#add-to-cart-sauce-labs-bike-light');
        expect(page.locator('#remove-sauce-labs-bike-light')).toBeVisible();
        expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('1');
        await homePage.click("//button[text()='Remove']");

        const firstProductBeforeSorting = await homePage.getFirstProductItem();
        expect(firstProductBeforeSorting).toContain('Sauce Labs');

        const lastProductBeforeSorting = await homePage.getLastProductItem();
        expect(lastProductBeforeSorting).toBe('Test.allTheThings() T-Shirt (Red)');

        await homePage.selectDropdownOption('Price (high to low)');

        const firstProductAfterSorting = await homePage.getFirstProductItem();
        expect(firstProductAfterSorting).toBe(testData.firstProduct);

        const lastProductAfterSorting = await homePage.getLastProductItem();
        expect(lastProductAfterSorting).toBe(testData.lastProduct);
    });
});

test('Add to products into the cart', async ({ homePage, cartPage, page }) => {
    await test.step('Add multiple products to cart', async () => {
        // Adding products to cart
        await homePage.addProductToCart(testData.addProductCart1, '#add-to-cart-sauce-labs-backpack');
        expect(page.locator('#remove-sauce-labs-backpack')).toBeVisible();
        
        await homePage.addProductToCart(testData.addProductCart2, '#add-to-cart-sauce-labs-bolt-t-shirt');
        expect(page.locator('#remove-sauce-labs-bolt-t-shirt')).toBeVisible();
        
        await homePage.addProductToCart(testData.addProductCart3, "//button[@id='add-to-cart-test.allthethings()-t-shirt-(red)']");
        expect(page.locator("//button[@id='remove-test.allthethings()-t-shirt-(red)']")).toBeVisible();
        expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('3');

        await cartPage.click('.shopping_cart_link');
        const totalProducts = await cartPage.getProductsCount();
        expect(totalProducts).toBe(3);

        // Removing product from cart
        await cartPage.getProductsAfterRemoval('Test.allTheThings() T-Shirt (Red)');
        expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('2');
        await cartPage.click('#checkout');

        // Filling up user details
        await cartPage.fill('#first-name', "TestFirstName");
        await cartPage.fill('#last-name', "TestLastName");
        await cartPage.fill('#postal-code', "TestPincode");
        await cartPage.click('#continue');

        // Payment and shipping information
        const paymentInfo = await cartPage.getText("div[class='summary_info'] div:nth-child(2)");
        expect(paymentInfo).toBe('SauceCard #31337');

        const shippingInfo = await cartPage.getText("div[class='summary_info'] div:nth-child(4)");
        expect(shippingInfo).toBe('Free Pony Express Delivery!');
        await cartPage.click('#finish');

        // Order confirmation
        const orderConfirm = await cartPage.getText('.complete-header');
        expect(orderConfirm).toBe('Thank you for your order!');

        const orderDetails = await cartPage.getText('.complete-text');
        expect(orderDetails).toEqual('Your order has been dispatched, and will arrive just as fast as the pony can get there!');

        await cartPage.click('#back-to-products');
        const test = await cartPage.isVisibleText('.title');
        expect(test).toBe(true);
    });
});