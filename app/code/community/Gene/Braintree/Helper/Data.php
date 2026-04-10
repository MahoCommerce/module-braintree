<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Helper_Data extends Mage_Core_Helper_Abstract
{
    /**
     * Store if the migration has ran in the system config
     */
    public const MIGRATION_COMPLETE = 'payment/gene_braintree/migration_ran';

    /**
     * Return all of the possible statuses as an array
     *
     * @return array
     */
    public function getStatusesAsArray()
    {
        return [
            Braintree\Transaction::AUTHORIZATION_EXPIRED => $this->__('Authorization Expired'),
            Braintree\Transaction::AUTHORIZING => $this->__('Authorizing'),
            Braintree\Transaction::AUTHORIZED => $this->__('Authorized'),
            Braintree\Transaction::GATEWAY_REJECTED => $this->__('Gateway Rejected'),
            Braintree\Transaction::FAILED => $this->__('Failed'),
            Braintree\Transaction::PROCESSOR_DECLINED => $this->__('Processor Declined'),
            Braintree\Transaction::SETTLED => $this->__('Settled'),
            Braintree\Transaction::SETTLING => $this->__('Settling'),
            Braintree\Transaction::SUBMITTED_FOR_SETTLEMENT => $this->__('Submitted For Settlement'),
            Braintree\Transaction::VOIDED => $this->__('Voided'),
            Braintree\Transaction::UNRECOGNIZED => $this->__('Unrecognized'),
            Braintree\Transaction::SETTLEMENT_DECLINED => $this->__('Settlement Declined'),
            Braintree\Transaction::SETTLEMENT_PENDING => $this->__('Settlement Pending'),
        ];
    }

    /**
     * Force the prices to two decimal places
     * Magento sometimes doesn't return certain totals in the correct format, yet Braintree requires them to always
     * be in two decimal places, thus the need for this function
     *
     * @param float|string $price
     *
     * @return string
     */
    public function formatPrice($price)
    {
        // Suppress errors from formatting the price, as we may have EUR12,00 etc
        return @number_format((float) $price, 2, '.', '');
    }

    /**
     * Convert a Braintree address into a Magento address
     *
     * @param object|null $address
     *
     * @return \Mage_Customer_Model_Address
     */
    public function convertToMagentoAddress($address)
    {
        $addressModel = Mage::getModel('customer/address');
        if (!$address) {
            return $addressModel;
        }

        $addressModel->addData([
            'firstname' => $address->firstName, // @phpstan-ignore property.notFound
            'lastname' => $address->lastName, // @phpstan-ignore property.notFound
            'street' => $address->streetAddress . // @phpstan-ignore property.notFound
                (isset($address->extendedAddress) ? "\n" . $address->extendedAddress : ''), // @phpstan-ignore property.notFound
            'city' => $address->locality, // @phpstan-ignore property.notFound
            'postcode' => $address->postalCode, // @phpstan-ignore property.notFound
            'country' => $address->countryCodeAlpha2, // @phpstan-ignore property.notFound
        ]);

        if (isset($address->region)) { // @phpstan-ignore property.notFound
            $addressModel->setData('region_code', $address->region);
        }

        if (isset($address->company)) { // @phpstan-ignore property.notFound
            $addressModel->setData('company', $address->company);
        }

        return $addressModel;
    }

    /**
     * Convert a Magento address into a Braintree address
     *
     * @param Mage_Customer_Model_Address|Mage_Sales_Model_Quote_Address|Mage_Sales_Model_Order_Address|object|null $address
     *
     * @return array
     */
    public function convertToBraintreeAddress($address)
    {
        if (is_object($address)) {
            /** @var Mage_Customer_Model_Address|Mage_Sales_Model_Quote_Address|Mage_Sales_Model_Order_Address $address */
            // Build up the initial array
            $return = [
                'firstName'         => $address->getFirstname(),
                'lastName'          => $address->getLastname(),
                'streetAddress'     => $address->getStreet1(),
                'locality'          => $address->getCity(),
                'postalCode'        => $address->getPostcode(),
                'countryCodeAlpha2' => $address->getCountry(),
            ];

            // Any extended address?
            if ($address->getStreet2()) {
                $return['extendedAddress'] = $address->getStreet2();
            }

            // Region
            if ($address->getRegion()) {
                $return['region'] = $address->getRegionCode();
            }

            // Check to see if we have a company
            if ($address->getCompany()) {
                $return['company'] = $address->getCompany();
            }

            return $return;
        }

        return [];
    }

    /**
     * Can we update information in Kount for a payment?
     *
     * kount_ens_update is set when an ENS update is received from Kount
     *
     * @return bool
     */
    public function canUpdateKount()
    {
        return !Mage::registry('kount_ens_update')
            && Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_merchant_id')
            && Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_api_key');
    }

    /**
     * Can we run the migration? Requires the Braintree_Payments module to be installed
     *
     * @return bool
     */
    public function canRunMigration()
    {
        return Mage::helper('core')->isModuleEnabled('Braintree_Payments');
    }

    /**
     * Should the system run the migration tool automatically
     *
     * @return bool
     */
    public function shouldRunMigration()
    {
        return $this->canRunMigration()
            && !Mage::getStoreConfigFlag(self::MIGRATION_COMPLETE)
            && !Mage::getStoreConfig('payment/gene_braintree/merchant_id')
            && !Mage::getStoreConfig('payment/gene_braintree/sandbox_merchant_id');
    }

    /**
     * Do we need to include various setup files?
     *
     * Utilising the 'setup_required' feature in XML files, loop through and determine if setup is required based on
     * various modules being "available"
     *
     * @param int|false $storeId
     *
     * @return bool
     */
    public function isSetupRequired($storeId = false)
    {
        // If a store ID is specific emulate the store first
        if ($storeId !== false) {
            /* @var $appEmulation Mage_Core_Model_App_Emulation */
            $appEmulation = Mage::getSingleton('core/app_emulation');
            $initialEnvironmentInfo = $appEmulation->startEnvironmentEmulation($storeId);
        }

        $config = Mage::getConfig();
        if ($config === null) {
            return false;
        }
        $setupRequiredNode = $config->getNode('global/payment/setup_required');
        if (!$setupRequiredNode) {
            return false;
        }
        $methodCodes = $setupRequiredNode->asArray();
        if (is_array($methodCodes) && count($methodCodes) > 0) {
            foreach (array_keys($methodCodes) as $methodCode) {
                $methodModel = $config->getNode('default/payment/' . (string) $methodCode . '/model');
                if ($methodModel) {
                    $model = Mage::getModel($methodModel);
                    if (!$model) {
                        continue;
                    }
                    $model->setIsSetupRequiredCall(true);
                    if (method_exists($model, 'isAvailable') && $model->isAvailable()) {
                        // Stop the app emulation is running
                        if (isset($appEmulation) && isset($initialEnvironmentInfo)) {
                            $appEmulation->stopEnvironmentEmulation($initialEnvironmentInfo);
                        }

                        return true;
                    }
                }
            }
        }

        // Stop the app emulation is running
        if (isset($appEmulation) && isset($initialEnvironmentInfo)) {
            $appEmulation->stopEnvironmentEmulation($initialEnvironmentInfo);
        }

        return false;
    }

    /**
     * Determine if express is enabled by a page handle
     *
     * @param string $handle
     *
     * @return bool
     */
    public function isExpressEnabled($handle)
    {
        $config = Mage::getConfig();
        if ($config === null) {
            return false;
        }
        $assetRequiredFunctions = $config->getNode('global/payment/assets_required/' . $handle);
        if ($assetRequiredFunctions) {
            $checkFunctions = $assetRequiredFunctions->asArray();
            if (is_array($checkFunctions) && count($checkFunctions) > 0) {
                foreach ($checkFunctions as $check) {
                    if (isset($check['class']) && isset($check['method'])) {
                        $model = Mage::getModel($check['class']);
                        if ($model) {
                            // If the method returns true, express is enabled for this handle
                            if (method_exists($model, $check['method']) && $model->{$check['method']}()) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * @param mixed $data
     * @return void
     */
    public function log($data)
    {
        // Check the debug flag in the admin
        if (Mage::getStoreConfigFlag('payment/gene_braintree/debug')) {

            // If the data is an exception convert it to a string
            if ($data instanceof Exception) {
                $data = $data->getMessage() . $data->getTraceAsString();
            }

            // Use the built in logging function
            Mage::log($data, null, 'gene_braintree.log', true);
        }
    }
}
