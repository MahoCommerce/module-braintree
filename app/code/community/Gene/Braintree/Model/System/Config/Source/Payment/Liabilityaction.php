<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_System_Config_Source_Payment_Liabilityaction
{
    public const BLOCK = 1;
    public const FRAUD = 2;
    public const PROCESS = 3;

    /**
     * Return options for 3D secure specific countries option
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            ['value' => self::BLOCK, 'label' => Mage::helper('adminhtml')->__('Request Alternative Payment Method')],
            ['value' => self::FRAUD, 'label' => Mage::helper('adminhtml')->__('Accept & Mark as Fraud')],
            ['value' => self::PROCESS, 'label' => Mage::helper('adminhtml')->__('Accept')],
        ];
    }
}
