const { Builder, By, until } = require("selenium-webdriver");

async function testCustomerStatus() {

    const driver = await new Builder()
        .forBrowser("chrome")
        .build();

    try {

        // 1. Manager Login
        await driver.get("http://localhost:4000/login/manager");

        await driver.findElement(
            By.css('input[type="email"]')
        ).sendKeys("tafsir@gmail.com");

        await driver.findElement(
            By.css('input[type="password"]')
        ).sendKeys("tafsir12");

        await driver.findElement(
            By.css('button[type="submit"]')
        ).click();

        await driver.wait(
            until.urlContains("/dashboard/manager"),
            10000
        );

        console.log("Manager Login: PASSED");


        // 2. Open Customer Management
        await driver.get(
            "http://localhost:4000/dashboard/manager/customers"
        );

        await driver.sleep(2000);

        console.log("Customer Page: PASSED");


        // 3. Get first customer
        let row = (await driver.findElements(
            By.css("tbody tr")
        ))[0];

        // 4. BLOCK CUSTOMER
        const blockButton = await row.findElement(
            By.xpath(".//button[contains(text(),'Block')]")
        );

        await blockButton.click();

        await driver.sleep(1500);

        await driver.navigate().refresh();

        await driver.sleep(1500);

        row = (await driver.findElements(
            By.css("tbody tr")
        ))[0];

        const blockedStatus = await row
            .findElement(By.css("td:nth-child(5)"))
            .getText();

        console.log("Status after Block:", blockedStatus);

        if (blockedStatus === "Blocked") {
            console.log("BLOCK CUSTOMER: PASSED");
        } else {
            console.log("BLOCK CUSTOMER: FAILED");
        }


        // 5. ACTIVATE CUSTOMER
        const activateButton = await row.findElement(
            By.xpath(".//button[contains(text(),'Activate')]")
        );

        await activateButton.click();

        await driver.sleep(1500);

        await driver.navigate().refresh();

        await driver.sleep(1500);

        row = (await driver.findElements(
            By.css("tbody tr")
        ))[0];

        const activeStatus = await row
            .findElement(By.css("td:nth-child(5)"))
            .getText();

        console.log("Status after Activate:", activeStatus);

        if (activeStatus === "Active") {
            console.log("ACTIVATE CUSTOMER: PASSED");
        } else {
            console.log("ACTIVATE CUSTOMER: FAILED");
        }

    } catch (error) {

        console.log("TEST ERROR:");
        console.log(error);

    } finally {

        await driver.quit();

    }
}

testCustomerStatus();