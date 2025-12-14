<?php

/**
 * @author Dave Macaulay <dave@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Applepay extends Mage_Payment_Block_Form
{
    protected function _construct()
    {
        parent::_construct();
        $this->setTemplate('gene/braintree/applepay.phtml');
    }

    /**
     * Generate and return a token
     *
     * @return string
     */
    public function getClientToken()
    {
        return Mage::getModel('gene_braintree/wrapper_braintree')->init()->generateToken();
    }
}
