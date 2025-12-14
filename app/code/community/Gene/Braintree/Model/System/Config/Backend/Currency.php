<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_System_Config_Backend_Currency extends Mage_Core_Model_Config_Data
{

    /**
     * Json decode the value
     */
    protected function _afterLoad()
    {
        if (!is_array($this->getValue())) {
            $value = $this->getValue();
            $this->setValue(empty($value) ? false : Mage::helper('core')->jsonDecode($value, false));
        }
    }

    /**
     * Json encode the value to be stored in the database
     */
    protected function _beforeSave()
    {
        if (is_array($this->getValue())) {
            $this->setValue(Mage::helper('core')->jsonEncode($this->getValue()));
        }
    }

}