import { test, expect } from '../fixtures/my-fixture';


const fs = require("fs");
const testData = JSON.parse(fs.readFileSync(`./testdata/data.json`, `utf-8`));

test.beforeEach('prerequisite- login to application and landing on the homepage', async ({ loginPage }) => {
    await test.step('Login to application', async () => {
    await loginPage.navigateToURL('https://www.saucedemo.com/');
    expect(await loginPage.isVisibleText('#login-button')).toBeTruthy();
    await loginPage.doLogin(testData.std_user, testData.password);
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
    // adding products to cart
    await test.step('Add multiple products to cart', async () => {
    await homePage.addProductToCart(testData.addProductCart1, '#add-to-cart-sauce-labs-backpack');
    expect(await page.locator('#remove-sauce-labs-backpack')).toBeVisible();
    await homePage.addProductToCart(testData.addProductCart2, '#add-to-cart-sauce-labs-bolt-t-shirt');
    expect(await page.locator('#remove-sauce-labs-bolt-t-shirt')).toBeVisible();
    await homePage.addProductToCart(testData.addProductCart3, "//button[@id='add-to-cart-test.allthethings()-t-shirt-(red)']");
    expect(await page.locator("//button[@id='remove-test.allthethings()-t-shirt-(red)']")).toBeVisible();
    expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('3');
    await cartPage.click('.shopping_cart_link');
    const totalProducts = await cartPage.getProductsCount();
    expect(totalProducts).toBe(3);
    
    
    // removing product from cart
    await cartPage.getProductsAfterRemoval('Test.allTheThings() T-Shirt (Red)');
    expect(await page.locator('.shopping_cart_link > span').textContent()).toBe('2');
    await cartPage.click('#checkout');
  
    
    // filling up user details
    await cartPage.fill('#first-name', "TestFirstName");
    await cartPage.fill('#last-name', "TestLastName");
    await cartPage.fill('#postal-code', "TestPincode");
    await cartPage.click('#continue');
    

    // payment and shipping information
    const paymentInfo = await cartPage.getText("div[class='summary_info'] div:nth-child(2)");
    expect(paymentInfo).toBe('SauceCard #31337');
    const shippingInfo = await cartPage.getText("div[class='summary_info'] div:nth-child(4)");
    expect(shippingInfo).toBe('Free Pony Express Delivery!');
    await cartPage.click('#finish');
    
    // order confirmation
    const orderConfirm = await cartPage.getText('.complete-header');
    expect(orderConfirm).toBe('Thank you for your order!');
    const orderDetails = await cartPage.getText('.complete-text');
    expect(orderDetails).toEqual('Your order has been dispatched, and will arrive just as fast as the pony can get there!');
    await cartPage.click('#back-to-products');
    const test = await cartPage.isVisibleText('.title');
    expect(test).toBe(true);
});
});