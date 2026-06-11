<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 */

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_System_Config_Backend_Currency extends Mage_Core_Model_Config_Data
{
    /**
     * Json decode the value
     */
    #[\Override]
    protected function _afterLoad()
    {
        if (!is_array($this->getValue())) {
            $value = $this->getValue();
            $this->setValue(empty($value) ? false : Mage::helper('core')->jsonDecode($value, false));
        }
        return $this;
    }

    /**
     * Json encode the value to be stored in the database
     */
    #[\Override]
    protected function _beforeSave()
    {
        if (is_array($this->getValue())) {
            $this->setValue(Mage::helper('core')->jsonEncode($this->getValue()));
        }
        return $this;
    }

}
