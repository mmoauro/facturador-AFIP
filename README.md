# Facturador AFIP

Facturador AFIP is a Node.js script designed to automate the creation of invoices through the AFIP system.

## Installation

To install the necessary dependencies, use npm:

```bash
npm install
```

## Configuration

Before running the script, make sure to replace the placeholders with your AFIP credentials:

```javascript
const user = {
  username: "<your_username>",
  password: "<your_password>",
};
```

## Customization

You can adjust various invoice details by modifying the following methods:

- `selectPointOfSaleAndContinue`
- `setInvoiceEmissionDataAndWait`
- `setCustomerDataAndWait`

# Usage

The script accepts several command-line arguments to customize the invoice creation process.

## Arguments

- `-a`: Invoice amount
- `-d`: Invoice description
- `-f`: Increase input typing speed (optional)

## Examples

Create an invoice with a specified amount and description:

```
node index.js -a 500000 -d "Servicios de informática"
```

Create an invoice with a specified amount, description, and increased input typing speed:

```
node index.js -a 500000 -d "Servicios de informática" -f
```
