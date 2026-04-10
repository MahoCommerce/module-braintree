<?php

class Gene_Braintree_Adminhtml_CheckoutController extends Mage_Adminhtml_Controller_Action
{
    /**
     * Check current user permission on resource and privilege
     *
     * @return bool
     */
    #[\Override]
    protected function _isAllowed()
    {
        return Mage::getSingleton('admin/session')->isAllowed('sales/order');
    }

    /**
     * Return a client token to the browser
     *
     * @return $this
     */
    public function clientTokenAction()
    {
        try {
            return $this->_returnJson([
                'success' => true,
                'client_token' => Mage::getSingleton('gene_braintree/wrapper_braintree')->init()->generateToken(),
            ]);
        } catch (Exception $e) {
            return $this->_returnJson([
                'success' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Return JSON to the browser
     *
     * @param array $array
     *
     * @return $this
     */
    protected function _returnJson($array)
    {
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($array));
        $this->getResponse()->setHeader('Content-type', 'application/json');

        return $this;
    }
}
