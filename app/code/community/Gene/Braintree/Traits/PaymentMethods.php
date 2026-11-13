<?php

declare(strict_types=1);

/**
 * SPDX-License-Identifier: OSL-3.0
 */
trait Gene_Braintree_Traits_PaymentMethods
{
    public function getEnvironment(): string
    {
        return (string) Mage::getStoreConfig('payment/gene_braintree/environment');
    }

    /**
     * @throws Mage_Core_Model_Store_Exception
     */
    protected function getStoreCurrency(): string
    {
        return (string) Mage::app()->getStore()->getCurrentCurrencyCode();
    }
}
