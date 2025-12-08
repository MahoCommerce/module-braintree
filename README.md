# Braintree Payment Module for Maho Commerce

A comprehensive Braintree payment integration for Maho Commerce, supporting multiple payment methods including Credit Card, PayPal, Apple Pay, and Google Pay.

## Requirements

- Maho Commerce 25.11+
- PHP 8.3+
- Braintree merchant account

## Installation

```bash
composer require mahocommerce/module-braintree
```

## Features

### Payment Methods

- **Credit Card** - Direct credit card payments with hosted fields integration
- **PayPal** - PayPal checkout via Braintree
- **Apple Pay** - Apple Pay for supported devices
- **Google Pay** - Google Pay integration

### Additional Features

- **3D Secure** - Support for 3D Secure authentication
- **Vault** - Save payment methods for returning customers
- **Express Checkout** - PayPal and Apple Pay buttons on product and cart pages
- **Multi-currency** - Support for multiple currencies with merchant account mapping
- **Kount Integration** - Advanced fraud protection via Kount
- **Admin Orders** - Create orders with Braintree payments from the admin panel
- **Multishipping** - Support for multishipping checkout

## Configuration

1. Navigate to **System > Configuration > Payment Methods**
2. Configure **Braintree Settings** with your API credentials:
   - Environment (Sandbox/Production)
   - Merchant ID
   - Public Key
   - Private Key
   - Merchant Account ID

3. Enable and configure individual payment methods:
   - Credit Card (Braintree)
   - PayPal (Braintree)
   - Apple Pay (Braintree)
   - Google Pay (Braintree)

## Supported Card Types

- Visa
- MasterCard
- American Express
- Discover
- JCB
- Maestro

## Credits

Originally developed by Gene Commerce, then maintained by [Justin Beaty](https://github.com/justinbeaty/module-gene-braintree), 
then by [SportPursuit](https://github.com/SportPursuit/module-gene-braintree), now adapted for Maho.
