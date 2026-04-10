<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Block_Applepay_Express_Setup
 *
 * @author Aidan Threadgold <aidan@gene.co.uk>
 */
class Gene_Braintree_Block_Applepay_Express_Setup extends Gene_Braintree_Block_Applepay_Express_Abstract
{
    /**
     * Braintree token
     *
     * @var string
     */
    protected $_token = null;

    /**
     * Get braintree token
     *
     * @return string
     */
    public function getToken()
    {
        if ($this->_token === null) {
            $this->_token = Mage::getModel('gene_braintree/wrapper_braintree')->init()->generateToken();
        }
        return $this->_token;
    }

    /**
     * Get store currency code.
     *
     * @return string
     */
    public function getStoreCurrency()
    {
        /** @var Mage_Core_Model_Store $store */
        $store = Mage::app()->getStore();
        return $store->getCurrentCurrencyCode();
    }

    /**
     * Get the store locale.
     *
     * @return string
     */
    public function getStoreLocale()
    {
        return Mage::app()->getLocale()->getLocaleCode();
    }

    /**
     * Registry entry to determine if block has been instantiated yet
     *
     * @return bool
     */
    public function hasBeenSetup()
    {
        if (Mage::registry('gene_braintree_applepay_btn_loaded')) {
            return true;
        }

        return false;
    }

    /**
     * Get the grand total for the quote
     *
     * @return string
     */
    public function getQuoteGrandTotal()
    {
        return number_format((float) $this->getQuote()->getGrandTotal(), 2, '.', '');
    }

    /**
     * Registry entry to mark this block as instantiated
     *
     * @param string $html
     *
     * @return string
     */
    #[\Override]
    protected function _afterToHtml($html)
    {
        if (!$this->hasBeenSetup()) {
            Mage::register('gene_braintree_applepay_btn_loaded', true);
        }

        return $html;
    }
}
