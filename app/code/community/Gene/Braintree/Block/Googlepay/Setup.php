<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 */
class Gene_Braintree_Block_Googlepay_Setup extends Mage_Core_Block_Template
{
    use Gene_Braintree_Traits_PaymentMethods;

    /**
     * @return bool
     */
    public function isActive()
    {
        /* @var $model Gene_Braintree_Model_Paymentmethod_Googlepay */
        $model = Mage::getModel('gene_braintree/paymentmethod_googlepay');
        return $model->isAvailable();
    }

    /**
     * @return mixed
     */
    public function getGoogleMerchantAccountID()
    {
        return Mage::getStoreConfig('payment/gene_braintree_googlepay/merchant_account_id');
    }

    /**
     * Return the accepted card networks as a JSON array
     */
    public function getAllowedCardNetworks(): string
    {
        return Mage::helper('core')->jsonEncode(Mage::getModel('gene_braintree/paymentmethod_googlepay')->getSupportedNetworks());
    }
}
