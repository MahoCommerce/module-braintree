<?php

declare(strict_types=1);

/**
 * SPDX-License-Identifier: OSL-3.0
 */
trait Gene_Braintree_Traits_PaymentMethods
{
    /**
     * @return mixed
     */
    public function getEnvironment()
    {
        return Mage::getStoreConfig('payment/gene_braintree/environment');
    }

    /**
     * @return string
     * @throws Mage_Core_Model_Store_Exception
     */
    protected function getStoreCurrency()
    {
        $store = Mage::app()->getStore();
        return $store ? $store->getCurrentCurrencyCode() : '';
    }
}
