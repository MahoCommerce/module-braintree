<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Block_Braintree
 */
class Gene_Braintree_Block_Braintree extends Mage_Core_Block_Template
{
    public function getEnvironment()
    {
        return Mage::getStoreConfig('payment/gene_braintree/environment');
    }
}