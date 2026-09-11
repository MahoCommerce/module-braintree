<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 * @author Paul Canning <paul.canning@gene.co.uk>
 */
class Gene_Braintree_GooglepayController extends Mage_Core_Controller_Front_Action
{
    /**
     * Return a client token to the browser
     *
     * @return Gene_Braintree_GooglepayController
     */
    #[Maho\Config\Route('/braintree/googlepay/clientToken')]
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
     * @param array $array
     * @return $this
     */
    protected function _returnJson($array)
    {
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($array));
        $this->getResponse()->setHeader('Content-type', 'application/json');

        return $this;
    }
}
