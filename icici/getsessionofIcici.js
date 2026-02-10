import { Builder, By, Key, until } from 'selenium-webdriver';
import otplib from 'otplib';
import 'chromedriver';
import fs from 'fs';

async function visitWebsite() {
    // Create a new instance of the Chrome driver
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Visit the website
        await driver.get('https://api.icicidirect.com/apiuser/login?api_key=rhm185j81`R369D385Q416H5K712`bo7');

        await driver.findElement(By.id('txtuid')).sendKeys('abhikoshta16@gmail.com');
        await driver.findElement(By.id('txtPass')).sendKeys('160402');
        let checkbox = await driver.findElement(By.id('chkssTnc'));
        await checkbox.click();

        let submitButton = await driver.findElement(By.id('btnSubmit'));
        await submitButton.click();

        await delay(2000);
        let secret = 'HBNFENBXOJDGWSCQOZ2FU6SMNE'; // Replace with your secret key
        let token = otplib.authenticator.generate(secret);

        let inputFields = await driver.findElements(By.css('.input-field input[type="text"]'));

        // Iterate through each input field and enter corresponding digit
        for (let i = 0; i < inputFields.length; i++) {
            await inputFields[i].sendKeys(token.charAt(i));
        }
        submitButton = await driver.findElement(By.id('Button1'));
        await submitButton.click();
        await delay(2000);

        let currentUrl = await driver.getCurrentUrl();
        const myURL = new URL(currentUrl);
        const apisession = myURL.searchParams.get('apisession');
        console.log(apisession);

        let variableName = "session_icici"
        let envContent = fs.readFileSync('.env', 'utf8');
        const regex = new RegExp(`${variableName} =.*`);
        envContent = envContent.replace(regex, `${variableName}=${apisession}`);
        fs.writeFileSync('./.env', envContent, 'utf8');

        console.log(`Updated ${variableName} in .env`);



    } finally {
        // Quit the driver
        await driver.quit();
    }
}

// Helper function to delay execution
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

visitWebsite();
