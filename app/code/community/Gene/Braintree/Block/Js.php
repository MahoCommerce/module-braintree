<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Js extends Gene_Braintree_Block_Assets
{
    /**
     * We can use the same token twice
     *
     * @var string|false
     */
    private $token = false;

    /**
     * Log whether methods are active
     *
     * @var bool|null
     */
    private $creditCardActive = null;
    /** @var bool|null */
    private $applepayActive = null;
    /** @var bool|null */
    private $googlepayActive = null;

    /**
     * Return whether CreditCard is active
     *
     * @return bool|null
     */
    protected function isCreditCardActive()
    {
        if (is_null($this->creditCardActive)) {
            $this->creditCardActive = Mage::getModel('gene_braintree/paymentmethod_creditcard')->isAvailable();
        }

        return $this->creditCardActive;
    }

    /**
     * @return bool
     */
    protected function isApplepayActive()
    {
        if (null === $this->applepayActive) {
            $this->applepayActive = Mage::getModel('gene_braintree/paymentmethod_applepay')->isAvailable();
        }

        return $this->applepayActive;
    }

    /**
     * @return bool
     */
    protected function isGooglepayActive()
    {
        if (null === $this->googlepayActive) {
            $this->googlepayActive = Mage::getModel('gene_braintree/paymentmethod_googlepay')->isAvailable();
        }

        return $this->googlepayActive;
    }

    /**
     * is 3D secure enabled?
     *
     * @return string
     */
    protected function is3DEnabled()
    {
        return var_export(Mage::getModel('gene_braintree/paymentmethod_creditcard')->is3DEnabled(), true);
    }

    /**
     * Is 3D secure limited to specific countries?
     *
     * @return bool
     */
    protected function isThreeDSpecificCountries()
    {
        return Mage::getStoreConfigFlag('payment/gene_braintree_creditcard/threedsecure_allowspecific');
    }

    /**
     * Return the countries that 3D secure should be present for
     *
     * @return array|mixed
     */
    protected function getThreeDSpecificCountries()
    {
        if ($this->isThreeDSpecificCountries()) {
            return Mage::getStoreConfig('payment/gene_braintree_creditcard/threedsecure_specificcountry');
        }

        return '';
    }

    /**
     * Return supported credit cards
     *
     * @return string
     */
    protected function getSupportedCardTypes()
    {
        if ($this->isCreditCardActive()) {
            return Mage::getStoreConfig('payment/gene_braintree_creditcard/cctypes');
        }

        return '';
    }

    /**
     * Return the failed action for 3D secure payments
     *
     * @return int
     */
    protected function getThreeDSecureFailedAction()
    {
        if ($this->isCreditCardActive() && $this->is3DEnabled()) {
            return Mage::getStoreConfig('payment/gene_braintree_creditcard/threedsecure_failed_liability');
        }

        return 0;
    }

    /**
     * Return the Kount environment
     *
     * @return mixed|string
     */
    protected function getKountEnvironment()
    {
        $env = Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_environment');
        if ($env) {
            return $env;
        }

        return 'production';
    }

    /**
     * Return the Kount ID
     *
     * @return bool|string
     */
    protected function getKountId()
    {
        $kountId = Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_merchant_id');
        if ($kountId) {
            return $kountId;
        }

        return '';
    }

    /**
     * Generate and return a token
     *
     * @return string|false
     */
    protected function getClientToken()
    {
        if (!$this->token) {
            $this->token = Mage::getSingleton('gene_braintree/wrapper_braintree')->init()->generateToken();
        }

        return $this->token;
    }

    /**
     * Only render if the payment method is active
     *
     * @return string|false
     */
    #[\Override]
    protected function _toHtml()
    {
        // Check the payment method is active, block duplicate rendering of this block
        if (!Mage::registry('gene_js_loaded_' . $this->getTemplate())) {
            Mage::register('gene_js_loaded_' . $this->getTemplate(), true);

            // The parent handles whether or not the module is enabled
            return (string) parent::_toHtml();
        }

        return '';
    }

    /**
     * Get payment Environment
     *
     * @return string
     */
    public function getEnv()
    {
        return Mage::getStoreConfig('payment/gene_braintree/environment');
    }

    #[\Override]
    public function getUrl($route = '', $params = [])
    {
        // Always force secure on getUrl calls
        if (!isset($params['_forced_secure'])) {
            $params['_forced_secure'] = true;
        }

        return parent::getUrl($route, $params);
    }
}
