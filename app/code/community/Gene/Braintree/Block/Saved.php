<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Block_Saved
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Block_Saved extends Mage_Core_Block_Template
{
    /**
     * Return whether the customer has saved details
     *
     * @return bool|int
     */
    public function hasSavedDetails(int|false $type = false)
    {
        return Mage::getSingleton('gene_braintree/saved')->hasType($type);
    }

    /**
     * Retrieve those said saved details
     *
     * @return array
     */
    public function getSavedDetails(int|false $type = false)
    {
        return Mage::getSingleton('gene_braintree/saved')->getSavedMethodsByType($type);
    }

    /**
     * Don't cache this block as it updates whenever the customers adds a new card
     *
     * @return int|null
     */
    #[\Override]
    public function getCacheLifetime()
    {
        return null;
    }

}
