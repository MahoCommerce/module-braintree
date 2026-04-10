<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Creditcard extends Mage_Payment_Block_Form_Cc
{
    /**
     * We can use the same token twice
     *
     * @var string|false
     */
    protected $_token = false;

    /**
     * @var array|null
     */
    protected $_savedDetails = null;

    /**
     * Set the template
     */
    #[\Override]
    protected function _construct()
    {
        parent::_construct();

        // The system now only supports Hosted Fields
        $this->setTemplate('gene/braintree/creditcard/hostedfields.phtml');
    }

    /**
     * Can we save the card?
     *
     * @return bool
     */
    public function canSaveCard()
    {
        // Validate that the vault is enabled and that the user is either logged in or registering
        /** @var Gene_Braintree_Model_Paymentmethod_Creditcard $method */
        $method = $this->getMethod();
        if ($method->isVaultEnabled()
            && (Mage::getSingleton('customer/session')->isLoggedIn()
                || Mage::getSingleton('checkout/type_onepage')->getCheckoutMethod() == Mage_Checkout_Model_Type_Onepage::METHOD_REGISTER)
        ) {
            return true;
        }

        // Is the vault enabled, and is the transaction occuring in the admin?
        /** @var Mage_Core_Model_Store $store */
        $store = Mage::app()->getStore();
        if ($method->isVaultEnabled() && $store->isAdmin()) {
            return true;
        }

        return false;
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
        if ($this->getSavedDetails()) {
            return count($this->getSavedDetails());
        }

        return false;
    }

    /**
     * Return the saved accounts
     *
     * @return array|null
     */
    public function getSavedDetails()
    {
        if (!$this->_savedDetails) {
            $this->_savedDetails = Mage::getSingleton('gene_braintree/saved')->getSavedMethodsByType(Gene_Braintree_Model_Saved::SAVED_CREDITCARD_ID);
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
     * is 3D secure enabled?
     *
     * @return bool
     */
    protected function is3DEnabled()
    {
        return Mage::getModel('gene_braintree/paymentmethod_creditcard')->is3DEnabled();
    }

    /**
     * Return the original CC types
     *
     * @return array
     */
    public function getOriginalCcAvailableTypes()
    {
        return parent::getCcAvailableTypes();
    }

    /**
     * Convert the available types into something
     *
     * @return string|false
     * @phpstan-ignore method.childReturnType
     */
    #[\Override]
    public function getCcAvailableTypes()
    {
        // Collect the types from the core method
        $types = parent::getCcAvailableTypes();

        // Grab the keys and encode
        return json_encode(array_keys($types));
    }

    /**
     * Return the card icon
     *
     * @return string
     */
    public static function getCardIcon(string $cardType)
    {
        // Convert the card type to lower case, no spaces
        return match (str_replace(' ', '', strtolower($cardType))) {
            'mastercard' => 'MC.png',
            'visa' => 'VI.png',
            'americanexpress', 'amex' => 'AE.png',
            'discover' => 'DI.png',
            'jcb' => 'JCB.png',
            'maestro' => 'ME.png',
            // Otherwise return the standard card image
            default => 'card.png',
        };
    }

    /**
     * Generate and return a token
     *
     * @return string|false
     */
    protected function getClientToken()
    {
        if (!$this->_token) {
            $this->_token = Mage::getSingleton('gene_braintree/wrapper_braintree')->init()->generateToken();
        }

        return $this->_token;
    }

    /**
     * Config setting to show accepted cards on the checkout
     *
     * @return boolean
     */
    public function showAcceptedCards()
    {
        return Mage::getModel('gene_braintree/paymentmethod_creditcard')->getConfigData('display_cctypes');
    }

    /**
     * Allowed payment cards
     *
     * @return array
     */
    protected function getAllowedCards()
    {
        $allowed = explode(',', Mage::getModel('gene_braintree/paymentmethod_creditcard')->getConfigData('cctypes'));
        $cards = [];

        foreach (Mage::getSingleton('payment/config')->getCcTypes() as $code => $name) {
            if (in_array($code, $allowed) && $code != 'OT') {
                $cards[] = [
                    'value' => $code,
                    'label' => $name,
                ];
            }
        }

        return $cards;
    }

    /**
     * Hosted fields descriptor
     *
     * @return string
     */
    protected function getHostedDescriptor()
    {
        return Mage::getModel('gene_braintree/paymentmethod_creditcard')->getConfigData('hostedfields_descriptor');
    }

}
