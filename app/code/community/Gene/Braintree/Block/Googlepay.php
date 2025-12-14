<?php

/**
 *
 * @author Paul Canning <paul.canning@gene.co.uk>
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
class Gene_Braintree_Block_Googlepay extends Mage_Payment_Block_Form
{
    /**
     * Class Construct
     */
    protected function _construct()
    {
        parent::_construct();
        $this->setTemplate('gene/braintree/googlepay.phtml');
    }
}
