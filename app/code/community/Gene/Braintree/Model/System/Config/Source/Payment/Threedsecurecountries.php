<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_System_Config_Source_Payment_Threedsecurecountries
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_System_Config_Source_Payment_Threedsecurecountries
{
    public const ALL_COUNTRIES = 0;
    public const SPECIFIC_COUNTRIES = 1;

    /**
     * Return options for 3D secure specific countries option
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            ['value' => self::ALL_COUNTRIES, 'label' => Mage::helper('adminhtml')->__('All Countries')],
            ['value' => self::SPECIFIC_COUNTRIES, 'label' => Mage::helper('adminhtml')->__('Specific Countries')],
        ];
    }
}
