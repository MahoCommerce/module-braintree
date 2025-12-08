# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Gene_Braintree module, a **Maho Commerce-only** payment integration for Braintree. It provides payment processing via Credit Card, PayPal, Apple Pay, and Google Pay through the Braintree gateway.

**Module Version:** 3.1.3
**Namespace:** Gene_Braintree
**Code Pool:** community

### Maho Compatibility

This module is designed exclusively for Maho Commerce and does not use Zend Framework. HTTP requests use `Symfony\Component\HttpClient\HttpClient` (see `Model/Kount/Rest.php` for example usage).

## Development Commands

```bash
# Install dependencies
composer install

# The module requires braintree/braintree_php ^6
```

This module is installed into a Maho Commerce application. There are no standalone build, test, or lint commands within this module itself.

## Architecture

### Directory Structure

- `app/code/community/Gene/Braintree/` - Main module code
- `app/etc/modules/Gene_Braintree.xml` - Module declaration
- `app/design/frontend/base/default/layout/gene/braintree.xml` - Frontend layout
- `app/design/adminhtml/default/default/layout/gene/braintree.xml` - Admin layout
- `js/gene/` - Frontend JavaScript assets
- `skin/frontend/` and `skin/adminhtml/` - CSS/assets

### Payment Methods

Four payment method models extend `Gene_Braintree_Model_Paymentmethod_Abstract`:

| Method | Class | Code |
|--------|-------|------|
| Credit Card | `Model/Paymentmethod/Creditcard.php` | `gene_braintree_creditcard` |
| PayPal | `Model/Paymentmethod/Paypal.php` | `gene_braintree_paypal` |
| Apple Pay | `Model/Paymentmethod/Applepay.php` | `gene_braintree_applepay` |
| Google Pay | `Model/Paymentmethod/Googlepay.php` | `gene_braintree_googlepay` |

Legacy payment methods (`Model/Paymentmethod/Legacy/`) exist for migration from older Braintree integrations.

### Core Components

- **`Model/Wrapper/Braintree.php`** - Central wrapper for all Braintree PHP SDK interactions. Handles API initialization, credential validation, customer management, vault operations, and transaction processing. Configuration paths are defined as constants here.

- **`Model/Paymentmethod/Abstract.php`** - Base payment method with shared logic for refunds, voids, fraud handling (Kount integration), and payment review (accept/deny).

- **`Helper/Data.php`** - General helper for formatting, address conversion, and configuration checks.

- **`Model/Observer.php`** - Event observers for checkout completion, layout handles, multishipping, shipment capture, and invoice transaction IDs.

### Configuration

All payment configuration is under `payment/gene_braintree*` paths. The module supports:
- Sandbox and production environments with separate credentials
- Multi-currency merchant account mapping
- 3D Secure authentication
- Kount fraud protection integration
- Express checkout on product and cart pages

### Frontend Controllers

- `CheckoutController.php` - Main checkout AJAX endpoints
- `ExpressController.php` - PayPal Express checkout
- `ApplepayController.php` - Apple Pay checkout flow
- `GooglepayController.php` - Google Pay checkout flow
- `SavedController.php` - Saved payment method management
- `Kount/EnsController.php` - Kount ENS webhook receiver
