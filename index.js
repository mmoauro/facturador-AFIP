const puppeteer = require("puppeteer");
const yargs = require("yargs");

// Script arguments
const argv = yargs
  .option("amount", {
    alias: "a",
    description: "Invoice amount",
    type: "number",
    demandOption: true,
  })
  .option("description", {
    alias: "d",
    description: "Invoice description",
    type: "string",
    demandOption: true,
  })
  .option("fast", {
    alias: "f",
    description: "To increase input typing speed",
    type: "boolean",
    demandOption: false,
  }).argv;

const user = {
  username: "<your_username>",
  password: "<your_password>",
};
const afipMaximumInvoiceAmount = 170000;

async function loginToAfip(page) {
  try {
    await page.goto("https://auth.afip.gob.ar/contribuyente_/login.xhtml");

    await type(page, "#F1\\:username", user.username);
    const nextButton = await page.$(".btn.btn-info.full-width.m-y-1");
    await nextButton.click();
    await page.waitForNavigation();

    await type(page, "#F1\\:password", user.password);
    await page.click(".btn.btn-info.full-width.m-y-1");
    await page.waitForNavigation({ waitUntil: ["networkidle2", "load"] });
  } catch (error) {
    console.error("Login to AFIP failed:", error);
    throw error;
  }
}

async function openInvoiceGenerator(browser, page) {
  try {
    await page.click("text=Comprobantes en línea");
    await sleep(1000);

    const pages = await browser.pages();
    const newTab = pages[pages.length - 1]; // Get the new tab
    await newTab.bringToFront(); // Focus the new tab
    await newTab.waitForSelector(".btn_empresa", { visible: true });

    const companyButton = await newTab.$(".btn_empresa");
    if (companyButton) {
      await companyButton.click();
      await newTab.waitForNavigation({ waitUntil: ["networkidle2", "load"] });
      return newTab;
    } else {
      throw new Error("Company button not found.");
    }
  } catch (error) {
    console.error("Failed to navigate to invoice generator:", error);
    throw error;
  }
}

/**
 *
 * #puntodeventa value can be adjusted. By default it selects the first option
 */
async function selectPointOfSaleAndContinue(page) {
  await page.select("#puntodeventa", "1");
  await sleep(300); // Use sleep to wait until invoice type is set
  await clickContinueButtonAndWait(page);
}

/**
 *
 * #idconcepto values:
 *  {
 *    "1": "Productos",
 *    "2": "Servicios", Default value
 *    "3": "Productos y Servicios"
 *  }
 */
async function setInvoiceEmissionDataAndWait(page) {
  await page.select("#idconcepto", "2");

  // Select activity. It selects the first option by default
  await page.evaluate(() => {
    document.querySelector(
      "select#actiAsociadaId option:nth-child(2)"
    ).selected = true;
  });
  await clickContinueButtonAndWait(page);
}

/**
 *
 * Both idivareceptor and formadepago7 values can be modified as you need.
 * "5" value for #idivareceptor selector is "Consumidor final"
 * #formadepago7 checkbox is "Otra"
 */
async function setCustomerDataAndWait(page) {
  // Select the receptor condition value from the dropdown
  await page.select("#idivareceptor", "5");

  // Click the payment method checkbox
  await page.click("#formadepago7");
  await clickContinueButtonAndWait(page);
}

async function setDescriptionAndAmountAndWait(page, invoiceAmount) {
  // Set invoice description
  await type(page, "#detalle_descripcion1", argv.description);

  // Set invoice amount
  await type(page, "#detalle_precio1", `${invoiceAmount}`);
  await clickContinueButtonAndWait(page);
}

async function createInvoice(page, invoiceAmount) {
  try {
    console.log("Creating invoice with amount:", invoiceAmount);
    const generateButton = await page.$("text=Generar Comprobantes");
    await generateButton.click();
    await page.waitForNavigation({ waitUntil: ["networkidle2", "load"] });

    const closeModalButton = await page.$("#novolveramostrar");
    if (closeModalButton) {
      // Close 'Nombre de fantasia' modal
      await closeModalButton.click();
    }

    await selectPointOfSaleAndContinue(page);
    await setInvoiceEmissionDataAndWait(page);
    await setCustomerDataAndWait(page);
    await setDescriptionAndAmountAndWait(page, invoiceAmount);

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    //await page.click("#btngenerar"); // Confirm invoice
    //await page.waitForNavigation({ waitUntil: ["networkidle2", "load"] });

    const buttons = await page.$$("input");
    await buttons[buttons.length - 1].click(); // Go to main menu
    await page.waitForNavigation({ waitUntil: ["networkidle2", "load"] });
    console.log("Invoice created");
  } catch (error) {
    console.error("Failed to create invoice:", error);
  }
}

async function clickContinueButtonAndWait(page) {
  const inputs = await page.$$("form input");
  await inputs[inputs.length - 1].click();
  await page.waitForNavigation({ waitUntil: ["networkidle2", "load"] });
}

async function type(page, elementId, text) {
  if (!argv.fast) {
    await page.type(elementId, text, { delay: 60 });
  } else {
    await page.type(elementId, text);
  }
}

async function getPuppeteerBrowser() {
  return await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
}

async function execute() {
  const invoiceAmount = +argv.amount;
  if (isNaN(invoiceAmount)) {
    console.error(
      "(--amount / -a) argument must be a valid number representing the invoice amount."
    );
    return;
  }
  const browser = await getPuppeteerBrowser();
  const [page] = await browser.pages();
  await loginToAfip(page);
  const generateInvoicePage = await openInvoiceGenerator(browser, page);
  console.log(
    `[START] Creating ${Math.ceil(
      invoiceAmount / afipMaximumInvoiceAmount
    )} invoices`
  );
  let remainingToInvoice = invoiceAmount;
  while (remainingToInvoice > afipMaximumInvoiceAmount) {
    await createInvoice(generateInvoicePage, afipMaximumInvoiceAmount);
    remainingToInvoice -= afipMaximumInvoiceAmount;
  }
  await createInvoice(generateInvoicePage, remainingToInvoice);
  console.log("[FINISH] Invoices created");
  await browser.close();
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}
execute();
