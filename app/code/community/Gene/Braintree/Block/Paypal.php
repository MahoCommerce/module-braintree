<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Block_Form
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Block_Paypal extends Mage_Payment_Block_Form
{
    /**
     * Store this so we don't load it multiple times
     * @var array|false
     */
    private $_savedDetails = false;

    /**
     * Internal constructor. Set template
     */
    #[\Override]
    protected function _construct()
    {
        parent::_construct();
        $this->setTemplate('gene/braintree/paypal.phtml');
    }

    /**
     * Generate and return a token
     *
     * @return string
     */
    public function getClientToken()
    {
        return Mage::getModel('gene_braintree/wrapper_braintree')->init()->generateToken();
    }

    /**
     * Shall we do a single use payment?
     *
     * @return string
     */
    public function getSingleUse()
    {
        // We prefer to do future payments, so anything else is future
        if (Mage::getSingleton('gene_braintree/paymentmethod_paypal')->getPaymentType() == Gene_Braintree_Model_Source_Paypal_Paymenttype::GENE_BRAINTREE_PAYPAL_SINGLE_PAYMENT) {
            return 'true';
        }

        return 'false';
    }

    /**
     * Does this customer have saved accounts?
     *
     * @return int|false
     */
    public function hasSavedDetails()
    {
        /** @var Mage_Core_Model_Store $store */
        $store = Mage::app()->getStore();
        if (!(Mage::getSingleton('customer/session')->isLoggedIn() || $store->isAdmin())) {
            return false;
        }
        $saved = $this->getSavedDetails();
        if (is_array($saved)) {
            return count($saved);
        }

        return false;
    }

    /**
     * Return the saved accounts
     *
     * @return array|false
     */
    public function getSavedDetails()
    {
        if (!$this->_savedDetails) {
            $this->_savedDetails = Mage::getSingleton('gene_braintree/saved')->getSavedMethodsByType(Gene_Braintree_Model_Saved::SAVED_PAYPAL_ID);
        }

        return $this->_savedDetails;
    }

    /**
     * Get the saved child HTML
     *
     * @return string
     */
    public function getSavedChildHtml()
    {
        $html = $this->getChildHtml('saved', false);
        $this->unsetChild('saved');

        return $html;
    }

    /**
     * Is the vault enabled? Meaning we can save PayPal
     *
     * @return bool
     */
    public function canSavePayPal()
    {
        /** @var Gene_Braintree_Model_Paymentmethod_Paypal $method */
        $method = $this->getMethod();
        if ($method->isVaultEnabled()
            && (Mage::getSingleton('customer/session')->isLoggedIn()
                || Mage::getSingleton('checkout/type_onepage')->getCheckoutMethod() == Mage_Checkout_Model_Type_Onepage::METHOD_REGISTER)
        ) {
            return true;
        }

        return false;
    }

}
