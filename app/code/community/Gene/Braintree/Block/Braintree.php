<?php

declare(strict_types=1);

/**
 * SPDX-License-Identifier: OSL-3.0
 */
class Gene_Braintree_Block_Braintree extends Mage_Core_Block_Template
{
    public function getEnvironment(): string
    {
        return Mage::getStoreConfig('payment/gene_braintree/environment');
    }
}
