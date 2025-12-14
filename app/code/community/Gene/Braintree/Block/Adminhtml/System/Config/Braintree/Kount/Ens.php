<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Adminhtml_System_Config_Braintree_Kount_Ens extends Mage_Adminhtml_Block_System_Config_Form_Field
{
    /**
     * Return the ENS URL
     *
     * @param \Varien_Data_Form_Element_Abstract $element
     *
     * @return string
     */
    protected function _getElementHtml(Varien_Data_Form_Element_Abstract $element)
    {
        $url = $this->getUrl('braintree/kount_ens/', array('_secure' => true));
        return substr($url, 0, (strpos($url, "kount_ens/") + 10));
    }
}