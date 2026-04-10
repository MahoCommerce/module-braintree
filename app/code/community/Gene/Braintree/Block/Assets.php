<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Assets extends Mage_Core_Block_Template
{
    /**
     * Version of Braintree SDK to be included
     */
    public const SDK_VERSION = '3.48.0';

    /**
     * Record the current version
     *
     * @var null|string|false
     */
    protected $version = null;

    /**
     * An array of JavaScript to be included as assets
     *
     * @var array
     */
    protected $js = [];

    /**
     * Any external JavaScript to be included
     *
     * @var array
     */
    protected $externalJs = [];

    /**
     * Cache for payment method active status
     *
     * @var array
     */
    protected $methodActiveCache = [];

    /**
     * Initialize template
     */
    #[\Override]
    protected function _construct()
    {
        $this->setTemplate('gene/braintree/assets.phtml');
    }

    /**
     * Add internal JS
     *
     * @return $this
     */
    public function addJs(string $url)
    {
        $this->js[] = $url;
        return $this;
    }

    /**
     * Return the JS URLs, filtering out scripts for disabled payment methods
     *
     * @return array
     */
    public function getJs()
    {
        return array_unique(array_filter($this->js, function ($url) {
            if (str_contains($url, 'vzero-paypal')) {
                return $this->isMethodActive('gene_braintree_paypal');
            }
            if (str_contains($url, 'vzero-googlepay')) {
                return $this->isMethodActive('gene_braintree_googlepay');
            }
            if (str_contains($url, 'vzero-applepay')) {
                return $this->isMethodActive('gene_braintree_applepay');
            }
            return true;
        }));
    }

    /**
     * Add an external JS asset to the page
     *
     * @return $this
     */
    public function addExternalJs(string $url)
    {
        $this->externalJs[] = $url;
        return $this;
    }

    /**
     * Return the external JS scripts, filtering out scripts for disabled payment methods
     *
     * @return array
     */
    public function getExternalJs()
    {
        return array_unique(array_filter($this->externalJs, function ($url) {
            if (str_contains($url, 'paypal-checkout') || str_contains($url, 'paypalobjects.com')) {
                return $this->isMethodActive('gene_braintree_paypal');
            }
            if (str_contains($url, 'google-payment') || str_contains($url, 'pay.google.com')) {
                return $this->isMethodActive('gene_braintree_googlepay');
            }
            if (str_contains($url, 'apple-pay')) {
                return $this->isMethodActive('gene_braintree_applepay');
            }
            return true;
        }));
    }

    /**
     * Check if a payment method is active/available
     *
     * @param string $methodCode
     * @return bool
     */
    protected function isMethodActive($methodCode)
    {
        if (!isset($this->methodActiveCache[$methodCode])) {
            $config = Mage::getConfig();
            if (!$config) {
                $this->methodActiveCache[$methodCode] = false;
                return false;
            }
            $model = $config->getNode('default/payment/' . $methodCode . '/model');
            if ($model) {
                $instance = Mage::getModel((string) $model);
                if ($instance instanceof Mage_Payment_Model_Method_Abstract) {
                    $this->methodActiveCache[$methodCode] = $instance->isAvailable();
                } else {
                    $this->methodActiveCache[$methodCode] = false;
                }
            } else {
                $this->methodActiveCache[$methodCode] = false;
            }
        }
        return $this->methodActiveCache[$methodCode];
    }

    /**
     * Return the Braintree module version
     *
     * @return string|false
     */
    public function getModuleVersion()
    {
        if ($this->version === null) {
            $config = Mage::getConfig();
            if ($config && ($moduleConfig = $config->getModuleConfig('Gene_Braintree')) && $moduleConfig->version) {
                $this->version = (string) $moduleConfig->version;
            } else {
                $this->version = false;
            }
        }

        return $this->version;
    }

    /**
     * Replace {MODULE_VERSION} with the current module version
     * Replace {SDK_VERSION} with the current require SDK version
     *
     * @param string $fileName
     *
     * @return string
     */
    #[\Override]
    public function getJsUrl($fileName = '')
    {
        $fileName = str_replace('{MODULE_VERSION}', (string) $this->getModuleVersion(), $fileName);
        $fileName = str_replace('{SDK_VERSION}', self::SDK_VERSION, $fileName);

        // Detect if the filename as :// within it meaning it's an external URL
        if (!str_contains($fileName, '://')) {
            $cacheBust = '';
            if ($modifiedTime = $this->getAssetModifiedTime($fileName)) {
                $cacheBust = '?v=' . $modifiedTime;
            }
            return parent::getJsUrl($fileName) . $cacheBust;
        }

        return $fileName;
    }

    /**
     * Get the last time the file was modified
     *
     * @return bool|int
     */
    protected function getAssetModifiedTime(string $fileName)
    {
        $filePath = Mage::getBaseDir() . DS . 'js' . DS . ltrim($fileName, '/');
        if (file_exists($filePath)) {
            return filemtime($filePath);
        }

        return false;
    }

    /**
     * Determine whether or not assets are required for the current page
     *
     * @throws \Exception
     */
    protected function handleRequiresAssets(): bool
    {
        // Build up the request string
        $request = $this->getRequest();
        $requestString =
            $request->getModuleName() . '_' . $request->getControllerName() . '_' . $request->getActionName();
        // Determine if we're viewing a product or cart and handle different logic
        if ($requestString == 'catalog_product_view') {
            return $this->checkAssetsForProduct();
        }

        if ($requestString == 'checkout_cart_index') {
            return $this->checkAssetsForCart();
        }

        // Otherwise assume the block has been included on the checkout
        return true;
    }

    /**
     * Do we need to include assets on the product view page?
     *
     * @return bool
     */
    protected function checkAssetsForProduct()
    {
        return Mage::helper('gene_braintree')->isExpressEnabled('catalog_product_view');
    }

    /**
     * Do we need to include assets on the cart page?
     *
     * @return bool
     */
    protected function checkAssetsForCart()
    {
        return Mage::helper('gene_braintree')->isExpressEnabled('checkout_cart_index');
    }

    /**
     * Determine whether setup is required to run int the admin or not
     *
     * @return bool
     */
    protected function isSetupRequiredInAdmin()
    {
        // First check if the method is enabled in the admin directly?
        if (Mage::helper('gene_braintree')->isSetupRequired()) {
            return true;
        }

        // If it's not it might be enabled on a website level, payment methods cannot be disabled / enabled on store
        // level by in our extension.
        $websites = Mage::app()->getWebsites();
        /* @var $website Mage_Core_Model_Website */
        foreach ($websites as $website) {
            $defaultStoreId = $website->getDefaultStore()->getId();
            if (Mage::helper('gene_braintree')->isSetupRequired((int) $defaultStoreId)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Does the module require setup and thus these assets?
     *
     * @return bool|string
     */
    #[\Override]
    protected function _toHtml()
    {
        // Handle the blocks inclusion differently in the admin
        /** @var Mage_Core_Model_Store $store */
        $store = Mage::app()->getStore();
        if ($store->isAdmin() && $this->isSetupRequiredInAdmin()) {
            return parent::_toHtml();
        }
        if ($store->isAdmin()) {
            return false;
        }

        if (Mage::helper('gene_braintree')->isSetupRequired() && $this->handleRequiresAssets()) {
            return parent::_toHtml();
        }

        return false;
    }
}
