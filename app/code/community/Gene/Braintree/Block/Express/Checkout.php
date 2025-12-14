<?php

/**
 * @author Aidan Threadgold <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Express_Checkout extends Mage_Core_Block_Template
{
    /**
     * Are there any available shipping rates?
     *
     * @return bool
     */
    protected function hasShippingRates()
    {
        // There are no shipping rates if the quote is virtual
        if ($this->getQuote()->isVirtual()) {
            return false;
        }

        if (count($this->getShippingRates()) > 0) {
            return true;
        }

        return false;
    }

    /**
     * Retrieve the quote
     *
     * @return Mage_Sales_Model_Quote
     */
    public function getQuote()
    {
        return $this->getData('quote');
    }
}
