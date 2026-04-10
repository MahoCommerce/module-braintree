<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_Saved
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Saved extends Mage_Core_Model_Abstract
{
    /**
     * The ID's associated with the two different payment methods
     */
    public const SAVED_PAYPAL_ID = 1;
    public const SAVED_CREDITCARD_ID = 2;

    /**
     * @var bool|array
     */
    protected $_savedAccounts = false;

    /**
     * Get the current customers saved cards
     *
     * @return array|false
     */
    public function getCustomerSavedPaymentMethods()
    {
        // Do we have a valid customer?
        if ($customer = $this->getCustomer()) {

            if (!$this->_savedAccounts) {

                // Grab a new instance of the wrapper
                $wrapper = Mage::getModel('gene_braintree/wrapper_braintree');

                // Init the braintree wrapper
                $wrapper->init();

                // Try and load the customer from Braintrees side
                $braintreeCustomerId = $customer->getBraintreeCustomerId();
                if ($braintreeCustomerId && $customer = $wrapper->getCustomer($braintreeCustomerId)) {

                    // Assign them into our model
                    $object = new Varien_Object();
                    $object->setSavedAccounts(array_merge($customer->creditCards, $customer->paypalAccounts));

                    Mage::dispatchEvent('gene_braintree_get_saved_methods', ['object' => $object]);

                    $this->_savedAccounts = $object->getSavedAccounts();
                }

            }

            return $this->_savedAccounts;

        }

        return false;
    }

    /**
     * Return the current customer, if the session is an admin session use the admin quote
     *
     * @return false|\Mage_Customer_Model_Customer
     */
    public function getCustomer()
    {
        $store = Mage::app()->getStore();
        if ($store && $store->isAdmin()) {
            $adminQuote = Mage::getSingleton('adminhtml/session_quote');
            if ($customer = $adminQuote->getCustomer()) {
                return $customer;
            }
        } elseif (Mage::getSingleton('customer/session')->isLoggedIn()) {
            return Mage::getSingleton('customer/session')->getCustomer();
        }

        return false;
    }

    /**
     * Return a boolean value on whether the customer has a certain type of payment method
     *
     * @param int|false $type
     *
     * @return bool|int
     */
    public function hasType($type = false)
    {
        // If no type is set just count the saved methods
        if (!$type) {
            if (!$this->getCustomerSavedPaymentMethods()) {
                return false;
            }
            return count($this->getCustomerSavedPaymentMethods());
        }

        // Check there are some saved accounts
        if ($savedAccounts = $this->getCustomerSavedPaymentMethods()) {

            // Iterate through the saved accounts
            foreach ($savedAccounts as $savedAccount) {

                // Check which type we're after
                if ($type == Gene_Braintree_Model_Saved::SAVED_CREDITCARD_ID) {
                    if ($savedAccount instanceof Braintree\CreditCard) {
                        return true;
                    }
                } elseif ($type == Gene_Braintree_Model_Saved::SAVED_PAYPAL_ID) {
                    if ($savedAccount instanceof Braintree\PayPalAccount) {
                        return true;
                    }
                }

            }
        }

        return false;
    }

    /**
     * Return only those accounts which are a certain type
     *
     * @return array
     */
    public function getSavedMethodsByType(int|false $type = false)
    {
        if (!$type) {
            return $this->getCustomerSavedPaymentMethods() ?: [];
        }

        // Start up our new collection
        $savedDetails = [];

        if ($this->getCustomerSavedPaymentMethods()) {
            foreach ($this->getCustomerSavedPaymentMethods() as $savedAccount) {

                // Check which type we're after
                if ($type == Gene_Braintree_Model_Saved::SAVED_CREDITCARD_ID) {
                    if ($savedAccount instanceof Braintree\CreditCard) {
                        $savedDetails[] = $savedAccount;
                    }
                } elseif ($type == Gene_Braintree_Model_Saved::SAVED_PAYPAL_ID) {
                    if ($savedAccount instanceof Braintree\PayPalAccount) {
                        $savedDetails[] = $savedAccount;
                    }
                }
            }
        }

        return $savedDetails;
    }

}
