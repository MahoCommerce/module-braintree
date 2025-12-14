<?php

/**
 * @author Dave Macaulay <dave@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Applepay_Express_Button extends Gene_Braintree_Block_Applepay_Express_Abstract
{
    /**
     * Generate braintree token
     */
    protected function _construct()
    {
        parent::_construct();
    }

    /**
     * Registry entry to mark this block as instantiated
     *
     * @param string $html
     *
     * @return string
     */
    public function _afterToHtml($html)
    {
        if ($this->isEnabled()) {
            // Never show the Apple Pay button for free products
            if ($this->getProduct() &&
                $this->getProduct()->getFinalPrice() == 0 &&
                (
                    $this->getProduct()->getTypeId() != Mage_Catalog_Model_Product_Type::TYPE_GROUPED &&
                    $this->getProduct()->getTypeId() != Mage_Catalog_Model_Product_Type::TYPE_BUNDLE
                )
            ) {
                return '';
            }

            return $html;
        }

        return '';
    }
}
