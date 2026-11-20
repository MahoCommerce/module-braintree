<?php

/**
 * SPDX-FileCopyrightText: 2026 Maho <https://mahocommerce.com>
 * SPDX-License-Identifier: OSL-3.0
 */

declare(strict_types=1);

// A fresh installation has no legacy Braintree settings to migrate.
// The customer attribute is installed during the data phase, after Mage_Customer.
