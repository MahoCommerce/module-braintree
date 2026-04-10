<?php

/**
 * @author Dave Macaulay <dave@gene.co.uk>
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Applepay_Info extends Gene_Braintree_Block_Info
{
    /**
     * Use a custom template
     */
    #[\Override]
    protected function _construct()
    {
        parent::_construct();
        $this->setTemplate('gene/braintree/applepay/info.phtml');
    }

    /**
     * Prepare information specific to current payment method
     *
     * @param null | array $transport
     *
     * @return Varien_Object
     */
    #[\Override]
    protected function _prepareSpecificInformation($transport = null)
    {
        // Get the original transport data
        $transport = parent::_prepareSpecificInformation($transport);

        // Only display this information if it's a single invoice
        $data = [];
        if ($this->isSingleInvoice()) {

            // Display present data
            if ($this->getInfo()->getCcOwner()) {
                $data[$this->__('Card Holder')] = $this->getInfo()->getCcOwner();
            }
            if ($this->getInfo()->getCcLast4()) {
                $data[$this->__('Card Number (Last 4)')] = $this->getInfo()->getCcLast4();
            }
            if ($this->getInfo()->getCcType()) {
                $data[$this->__('Credit Card Type')] = $this->getInfo()->getCcType();
            }
        }

        // Check we're in the admin area
        /** @var Mage_Core_Model_Store $store */
        $store = Mage::app()->getStore();
        if ($store->isAdmin()) {

            // Include live details for this transaction
            $this->includeLiveDetails($data);
        }

        // Add the data to the class variable
        $transport->setData(array_merge($data, $transport->getData()));
        $this->_paymentSpecificInformation = $transport->getData();

        // And return it
        return $transport;
    }
}
